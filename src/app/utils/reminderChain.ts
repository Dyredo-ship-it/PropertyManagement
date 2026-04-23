import {
  getAccountingTransactions,
  getTenants,
  getBuildings,
  getOrgRentSettings,
  getNotifications,
  saveNotifications,
  type Tenant,
  type Building,
  type Notification,
} from "./storage";
import { tenantMonthStatus, type TenantRentMonth } from "./rentStatus";

/**
 * Swiss-style escalation chain for unpaid rent. Derived purely from
 * `daysLate` + the history of reminder notifications we've recorded — no
 * schema change required.
 *
 * Stages (Swiss practice with 30-day légal delay after mise en demeure
 * before poursuite is possible):
 *   - 1-5 days late   → grace period (not surfaced, assume postal delay)
 *   - 6-15 days       → Rappel 1 (friendly reminder)
 *   - 16-30 days      → Rappel 2 (stronger wording)
 *   - 31-60 days      → Mise en demeure (formal, starts the 30-day CO 257d clock)
 *   - 60+ days        → Poursuite (legal action, not auto-sent — manual step)
 */

export type ReminderStage = "grace" | "rappel-1" | "rappel-2" | "mise-en-demeure" | "poursuite";

export const REMINDER_STAGES: { key: ReminderStage; label: string; daysFrom: number; color: string; bg: string; }[] = [
  { key: "grace",            label: "Tolérance",       daysFrom: 0,  color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
  { key: "rappel-1",         label: "Rappel 1",        daysFrom: 6,  color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  { key: "rappel-2",         label: "Rappel 2",        daysFrom: 16, color: "#EA580C", bg: "rgba(234,88,12,0.10)" },
  { key: "mise-en-demeure",  label: "Mise en demeure", daysFrom: 31, color: "#DC2626", bg: "rgba(220,38,38,0.10)" },
  { key: "poursuite",        label: "Poursuite",       daysFrom: 61, color: "#7F1D1D", bg: "rgba(127,29,29,0.12)" },
];

export function stageForDaysLate(daysLate: number | undefined): ReminderStage {
  if (!daysLate || daysLate <= 0) return "grace";
  if (daysLate <= 5) return "grace";
  if (daysLate <= 15) return "rappel-1";
  if (daysLate <= 30) return "rappel-2";
  if (daysLate <= 60) return "mise-en-demeure";
  return "poursuite";
}

export type ReminderCase = {
  tenant: Tenant;
  building: Building | undefined;
  monthKey: string;
  daysLate: number;
  expectedAmount: number;
  suggestedStage: ReminderStage;
  lastSentStage: ReminderStage | null;
  lastSentAt: string | null;
  // Whether the suggested stage needs the admin to act: either never sent,
  // or sent at a lower stage than where we're now at.
  actionNeeded: boolean;
};

function stageIndex(stage: ReminderStage): number {
  return REMINDER_STAGES.findIndex((s) => s.key === stage);
}

// Notifications are our audit log — a reminder sent for (tenantId, monthKey,
// stage) is recorded as a Notification row with a marker in the title.
const NOTIF_PREFIX = "reminder-sent:";

function reminderMarker(stage: ReminderStage, monthKey: string): string {
  return `${NOTIF_PREFIX}${stage}:${monthKey}`;
}

function extractLastReminder(
  notifications: Notification[],
  tenantId: string,
  monthKey: string,
): { stage: ReminderStage; date: string } | null {
  let best: { stage: ReminderStage; date: string; idx: number } | null = null;
  for (const n of notifications) {
    const marker = (n as any).reminderMarker as string | undefined;
    const forTenant = (n as any).tenantId as string | undefined;
    if (!marker || !forTenant) continue;
    if (forTenant !== tenantId) continue;
    if (!marker.includes(monthKey)) continue;
    // marker format: reminder-sent:<stage>:<yyyy-mm>
    const parts = marker.split(":");
    if (parts.length < 3) continue;
    const stage = parts[1] as ReminderStage;
    const idx = stageIndex(stage);
    if (idx < 0) continue;
    if (!best || idx > best.idx) {
      best = { stage, date: n.date, idx };
    }
  }
  return best ? { stage: best.stage, date: best.date } : null;
}

export function listReminderCases(): ReminderCase[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const settings = getOrgRentSettings();
  const tenants = getTenants().filter((t) => t.status === "active");
  const txs = getAccountingTransactions();
  const notifications = getNotifications();
  const buildings = getBuildings();

  const cases: ReminderCase[] = [];
  for (const tenant of tenants) {
    const row = tenantMonthStatus(tenant, year, month, settings, txs);
    if (row.status !== "overdue") continue;
    const daysLate = row.daysLate ?? 0;
    const suggestedStage = stageForDaysLate(daysLate);
    if (suggestedStage === "grace") continue;
    const last = extractLastReminder(notifications, tenant.id, row.monthKey);
    const lastIdx = last ? stageIndex(last.stage) : -1;
    const suggestedIdx = stageIndex(suggestedStage);
    cases.push({
      tenant,
      building: buildings.find((b) => b.id === tenant.buildingId),
      monthKey: row.monthKey,
      daysLate,
      expectedAmount: row.expectedAmount,
      suggestedStage,
      lastSentStage: last?.stage ?? null,
      lastSentAt: last?.date ?? null,
      actionNeeded: lastIdx < suggestedIdx,
    });
  }
  cases.sort((a, b) => b.daysLate - a.daysLate);
  return cases;
}

export function recordReminderSent(
  tenantId: string,
  tenantName: string,
  buildingId: string,
  buildingName: string,
  monthKey: string,
  stage: ReminderStage,
): void {
  const stageInfo = REMINDER_STAGES.find((s) => s.key === stage);
  const marker = reminderMarker(stage, monthKey);
  const notif: Notification = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    title: `${stageInfo?.label ?? "Rappel"} envoyé — ${tenantName}`,
    message: `${stageInfo?.label} pour ${monthKey} envoyé au locataire.`,
    date: new Date().toISOString(),
    read: false,
    buildingId: buildingId || undefined,
    category: "payment",
    ...(({ reminderMarker: marker, tenantId }) as any),
  };
  saveNotifications([notif, ...getNotifications()]);
}

export function groupByStage(cases: ReminderCase[]): Record<ReminderStage, ReminderCase[]> {
  const out: Record<ReminderStage, ReminderCase[]> = {
    grace: [], "rappel-1": [], "rappel-2": [], "mise-en-demeure": [], poursuite: [],
  };
  for (const c of cases) out[c.suggestedStage].push(c);
  return out;
}
