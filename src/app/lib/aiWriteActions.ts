// Client-side executors for AI assistant write tools.
// The edge function never runs these directly — it emits a
// "pending_write_action" event, the UI asks the user to confirm, and
// then the confirmed action runs here with the user's Supabase session
// (so RLS + per-member permissions apply automatically).

import { supabase } from "./supabase";
import { sendRentReminder } from "./email";
import {
  getBuildings,
  getTenants,
  getMaintenanceRequests,
  saveMaintenanceRequests,
  getCalendarEvents,
  saveCalendarEvents,
  type MaintenanceRequest,
  type CalendarEvent,
} from "../utils/storage";

export type WriteActionResult =
  | { ok: true; summary: string; data?: unknown }
  | { ok: false; error: string };

/**
 * Human-readable preview of a pending action, shown in the confirmation
 * modal so the user knows exactly what they're about to approve.
 */
export function describeWriteAction(name: string, input: Record<string, any>): {
  title: string;
  bullets: Array<{ label: string; value: string }>;
} {
  switch (name) {
    case "send_rent_reminder": {
      const tenant = findTenantById(input.tenant_id);
      return {
        title: "Envoyer un rappel de loyer",
        bullets: [
          { label: "Locataire", value: tenant?.name ?? input.tenant_id },
          { label: "Email", value: tenant?.email ?? "—" },
          { label: "Mois", value: input.month ?? currentMonth() },
        ],
      };
    }
    case "send_custom_email_to_tenant": {
      const tenant = findTenantById(input.tenant_id);
      const preview = String(input.body ?? "").slice(0, 140);
      return {
        title: "Envoyer un email",
        bullets: [
          { label: "Destinataire", value: `${tenant?.name ?? input.tenant_id} <${tenant?.email ?? "?"}>` },
          { label: "Sujet", value: input.subject ?? "—" },
          { label: "Aperçu", value: preview + (input.body && input.body.length > 140 ? "…" : "") },
        ],
      };
    }
    case "create_maintenance_request": {
      const building = findBuildingById(input.building_id);
      return {
        title: "Créer une demande de maintenance",
        bullets: [
          { label: "Immeuble", value: building?.name ?? input.building_id },
          { label: "Titre", value: input.title ?? "—" },
          { label: "Priorité", value: input.priority ?? "medium" },
          { label: "Description", value: String(input.description ?? "").slice(0, 160) },
        ],
      };
    }
    case "update_request_status": {
      const req = getMaintenanceRequests().find((r) => r.id === input.request_id);
      return {
        title: "Mettre à jour une demande",
        bullets: [
          { label: "Demande", value: req?.title ?? input.request_id },
          { label: "Nouveau statut", value: input.status ?? "—" },
        ],
      };
    }
    case "create_calendar_event": {
      const building = input.building_id ? findBuildingById(input.building_id) : null;
      return {
        title: "Créer un événement",
        bullets: [
          { label: "Titre", value: input.title ?? "—" },
          { label: "Date", value: input.date ?? "—" },
          { label: "Type", value: input.type ?? "other" },
          ...(building ? [{ label: "Immeuble", value: building.name }] : []),
        ],
      };
    }
    default:
      return { title: name, bullets: Object.entries(input).map(([k, v]) => ({ label: k, value: String(v) })) };
  }
}

export async function executeWriteAction(
  name: string,
  input: Record<string, any>,
): Promise<WriteActionResult> {
  try {
    switch (name) {
      case "send_rent_reminder":
        return await runSendRentReminder(input);
      case "send_custom_email_to_tenant":
        return await runSendCustomEmail(input);
      case "create_maintenance_request":
        return await runCreateMaintenanceRequest(input);
      case "update_request_status":
        return await runUpdateRequestStatus(input);
      case "create_calendar_event":
        return await runCreateCalendarEvent(input);
      default:
        return { ok: false, error: `Outil d'écriture inconnu: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/* ─── Individual executors ───────────────────────────────── */

async function runSendRentReminder(input: any): Promise<WriteActionResult> {
  const tenant = findTenantById(input.tenant_id);
  if (!tenant) return { ok: false, error: "Locataire introuvable." };
  const building = findBuildingById(tenant.buildingId);
  if (!building) return { ok: false, error: "Immeuble introuvable." };
  const period = input.month || currentMonth();
  await sendRentReminder(tenant, building, period);
  return { ok: true, summary: `Rappel envoyé à ${tenant.name} (${tenant.email}) pour ${period}.` };
}

async function runSendCustomEmail(input: any): Promise<WriteActionResult> {
  const tenant = findTenantById(input.tenant_id);
  if (!tenant) return { ok: false, error: "Locataire introuvable." };
  if (!tenant.email) return { ok: false, error: "Le locataire n'a pas d'adresse email." };

  const landlord = (await import("./landlord")).getLandlordInfo();
  const fromName = landlord.name || "Votre régie";

  const htmlBody = String(input.body ?? "").replace(/\n/g, "<br/>");
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F4F5;padding:24px;color:#1F2937;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E5E7EB;">
    <p>Bonjour ${tenant.name.split(" ")[0]},</p>
    <p>${htmlBody}</p>
    <p style="margin-top:24px;">Cordialement,<br/>${fromName}</p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 12px;" />
    <p style="font-size:11px;color:#9CA3AF;margin:0;">Email envoyé par ${fromName} via Palier.</p>
  </div>
</body></html>`;

  const { error } = await supabase.functions.invoke("send-email", {
    body: {
      to: tenant.email,
      subject: input.subject || "Message de votre régie",
      html,
      text: input.body || "",
      senderName: landlord.name || undefined,
      replyTo: landlord.email || undefined,
    },
  });
  if (error) return { ok: false, error: (error as Error).message || "Échec de l'envoi." };
  return { ok: true, summary: `Email envoyé à ${tenant.name} <${tenant.email}>.` };
}

async function runCreateMaintenanceRequest(input: any): Promise<WriteActionResult> {
  const building = findBuildingById(input.building_id);
  if (!building) return { ok: false, error: "Immeuble introuvable." };
  const req: MaintenanceRequest = {
    id: `ai_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    title: input.title,
    description: input.description,
    buildingId: building.id,
    buildingName: building.name,
    unit: input.unit ?? "",
    tenantId: "",
    tenantName: "Assistant IA",
    status: "pending",
    priority: (input.priority as MaintenanceRequest["priority"]) ?? "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveMaintenanceRequests([...getMaintenanceRequests(), req]);
  return {
    ok: true,
    summary: `Demande "${req.title}" créée pour ${building.name}.`,
    data: { id: req.id },
  };
}

async function runUpdateRequestStatus(input: any): Promise<WriteActionResult> {
  const all = getMaintenanceRequests();
  const idx = all.findIndex((r) => r.id === input.request_id);
  if (idx === -1) return { ok: false, error: "Demande introuvable." };
  const updated = { ...all[idx], status: input.status, updatedAt: new Date().toISOString() };
  const next = [...all];
  next[idx] = updated;
  saveMaintenanceRequests(next);
  return { ok: true, summary: `Demande "${updated.title}" marquée ${updated.status}.` };
}

async function runCreateCalendarEvent(input: any): Promise<WriteActionResult> {
  // Accept "2026-05-04" or "2026-05-04T09:30". Split the time portion out.
  const raw = String(input.date ?? "");
  const [datePart, timePart] = raw.split("T");
  const event: CalendarEvent = {
    id: `ai_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    title: input.title,
    date: datePart || new Date().toISOString().slice(0, 10),
    startTime: (timePart?.slice(0, 5)) || "09:00",
    type: (input.type as CalendarEvent["type"]) ?? "other",
    buildingId: input.building_id || undefined,
    notes: input.description || undefined,
    createdAt: new Date().toISOString(),
  };
  saveCalendarEvents([...getCalendarEvents(), event]);
  return { ok: true, summary: `Événement "${event.title}" ajouté le ${event.date}.` };
}

/* ─── Helpers ────────────────────────────────────────────── */

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function findTenantById(id: string | undefined) {
  if (!id) return null;
  return getTenants().find((t) => t.id === id) ?? null;
}

function findBuildingById(id: string | undefined) {
  if (!id) return null;
  return getBuildings().find((b) => b.id === id) ?? null;
}
