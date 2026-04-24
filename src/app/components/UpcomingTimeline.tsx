import React, { useMemo, useState } from "react";
import {
  Calendar,
  Home,
  FileText,
  ClipboardList,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import {
  getTenants,
  getBuildings,
  getBuildingActions,
  getRenovations,
  getCalendarEvents,
  getContracts,
  type Tenant,
  type Building,
  type BuildingAction,
  type Renovation,
  type CalendarEvent,
  type Contract,
} from "../utils/storage";

/**
 * Aggregated annual timeline: pulls every dated future event from the
 * tenants, actions, renovations and calendar caches and groups them into
 * time buckets so the admin sees 'what's coming' at a glance.
 */

type EventCategory =
  | "lease-end"
  | "lease-start"
  | "task"
  | "amortization"
  | "calendar"
  | "contract-renewal";

type TimelineEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  category: EventCategory;
  title: string;
  subtitle?: string;
  building?: Building;
  tenant?: Tenant;
};

const CATEGORY_STYLE: Record<EventCategory, {
  label: string;
  color: string;
  bg: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
}> = {
  "lease-end": {
    label: "Fin de bail",
    color: "#DC2626",
    bg: "rgba(220,38,38,0.08)",
    icon: FileText,
  },
  "lease-start": {
    label: "Nouveau bail",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.08)",
    icon: Home,
  },
  task: {
    label: "Tâche",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.08)",
    icon: ClipboardList,
  },
  amortization: {
    label: "Fin amortissement",
    color: "#D97706",
    bg: "rgba(217,119,6,0.08)",
    icon: TrendingUp,
  },
  calendar: {
    label: "Agenda",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.08)",
    icon: Calendar,
  },
  "contract-renewal": {
    label: "Contrat",
    color: "#0891B2",
    bg: "rgba(8,145,178,0.08)",
    icon: FileText,
  },
};

function collectEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const buildings = getBuildings();
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const twelveMonthsOut = new Date(now);
  twelveMonthsOut.setFullYear(twelveMonthsOut.getFullYear() + 1);
  const horizonISO = twelveMonthsOut.toISOString().slice(0, 10);

  const byId = (id: string) => buildings.find((b) => b.id === id);

  // Tenants: lease end + lease start (future only)
  for (const tenant of getTenants()) {
    if (tenant.status === "ended") continue;
    const b = byId(tenant.buildingId);
    if (tenant.leaseStart && tenant.leaseStart > todayISO && tenant.leaseStart <= horizonISO) {
      events.push({
        id: `ls-${tenant.id}`,
        date: tenant.leaseStart,
        category: "lease-start",
        title: tenant.name,
        subtitle: `${b?.name ?? "?"} · ${tenant.unit}`,
        tenant,
        building: b,
      });
    }
    if (tenant.leaseEnd && tenant.leaseEnd >= todayISO && tenant.leaseEnd <= horizonISO) {
      events.push({
        id: `le-${tenant.id}`,
        date: tenant.leaseEnd,
        category: "lease-end",
        title: tenant.name,
        subtitle: `${b?.name ?? "?"} · ${tenant.unit}`,
        tenant,
        building: b,
      });
    }
  }

  // Tasks (BuildingAction) with dueDate
  for (const action of getBuildingActions() as BuildingAction[]) {
    if (action.status === "done") continue;
    if (!action.dueDate) continue;
    const due = action.dueDate.slice(0, 10);
    if (due < todayISO || due > horizonISO) continue;
    const b = byId(action.buildingId);
    events.push({
      id: `task-${action.id}`,
      date: due,
      category: "task",
      title: action.title,
      subtitle: b?.name,
      building: b,
    });
  }

  // Renovation amortization end
  for (const reno of getRenovations() as Renovation[]) {
    if (!reno.dateCompleted || !reno.amortizationYears) continue;
    const completed = new Date(reno.dateCompleted);
    const endDate = new Date(completed);
    endDate.setFullYear(endDate.getFullYear() + reno.amortizationYears);
    const iso = endDate.toISOString().slice(0, 10);
    if (iso < todayISO || iso > horizonISO) continue;
    const b = byId(reno.buildingId);
    events.push({
      id: `reno-${reno.id}`,
      date: iso,
      category: "amortization",
      title: reno.item,
      subtitle: `${b?.name ?? "?"}${reno.unit ? ` · ${reno.unit}` : ""}`,
      building: b,
    });
  }

  // Manual calendar events
  for (const ev of getCalendarEvents() as CalendarEvent[]) {
    if (ev.date < todayISO || ev.date > horizonISO) continue;
    const b = ev.buildingId ? byId(ev.buildingId) : undefined;
    events.push({
      id: `cal-${ev.id}`,
      date: ev.date,
      category: "calendar",
      title: ev.title,
      subtitle: b?.name,
      building: b,
    });
  }

  // Contract renewals
  for (const c of getContracts() as Contract[]) {
    if (c.status !== "active") continue;
    if (!c.renewalDate) continue;
    const renewal = c.renewalDate.slice(0, 10);
    if (renewal < todayISO || renewal > horizonISO) continue;
    const b = byId(c.buildingId);
    events.push({
      id: `contract-${c.id}`,
      date: renewal,
      category: "contract-renewal",
      title: `Renouvellement — ${c.label}`,
      subtitle: `${b?.name ?? "?"}${c.provider ? ` · ${c.provider}` : ""}`,
      building: b,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

function bucketFor(date: string, now: Date): string {
  const d = new Date(date);
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 7) return "Cette semaine";
  if (diffDays <= 30) return "Ce mois";
  if (diffDays <= 90) return "Dans les 3 mois";
  if (diffDays <= 180) return "Dans 6 mois";
  return "Plus tard cette année";
}

function formatRelative(date: string, now: Date): string {
  const d = new Date(date);
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "demain";
  if (diffDays < 7) return `dans ${diffDays} j`;
  if (diffDays < 30) return `dans ${Math.round(diffDays / 7)} sem.`;
  if (diffDays < 365) return `dans ${Math.round(diffDays / 30)} mois`;
  return `dans ${Math.round(diffDays / 365)} an${diffDays >= 730 ? "s" : ""}`;
}

function formatDateShort(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
}

export function UpcomingTimeline() {
  const [filter, setFilter] = useState<EventCategory | "all">("all");

  const now = new Date();
  const events = useMemo(() => collectEvents(), []);
  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

  // Group by bucket while preserving order
  const buckets = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of filtered) {
      const key = bucketFor(ev.date, now);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const categoryCounts = useMemo(() => {
    const c: Record<EventCategory, number> = {
      "lease-end": 0, "lease-start": 0, task: 0, amortization: 0, calendar: 0, "contract-renewal": 0,
    };
    for (const e of events) c[e.category]++;
    return c;
  }, [events]);

  if (events.length === 0) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: "18px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Calendar style={{ width: 15, height: 15, color: "var(--primary)" }} />
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            Prochaines échéances
          </h3>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "14px 0", margin: 0 }}>
          Rien à l'horizon sur les 12 prochains mois.
        </p>
      </div>
    );
  }

  const chips: { key: EventCategory | "all"; label: string; count: number }[] = [
    { key: "all", label: "Tout", count: events.length },
    { key: "lease-end", label: "Fins de bail", count: categoryCounts["lease-end"] },
    { key: "task", label: "Tâches", count: categoryCounts.task },
    { key: "contract-renewal", label: "Contrats", count: categoryCounts["contract-renewal"] },
    { key: "calendar", label: "Agenda", count: categoryCounts.calendar },
    { key: "lease-start", label: "Nouveaux baux", count: categoryCounts["lease-start"] },
    { key: "amortization", label: "Amortissements", count: categoryCounts.amortization },
  ].filter((c) => c.count > 0 || c.key === "all");

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: "18px 20px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar style={{ width: 15, height: 15, color: "var(--primary)" }} />
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            Prochaines 12 mois
          </h3>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}>
            {events.length} échéance{events.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {chips.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              style={{
                padding: "4px 10px", borderRadius: 99,
                border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                background: active
                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                  : "transparent",
                color: active ? "var(--primary)" : "var(--muted-foreground)",
                fontSize: 11, fontWeight: active ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {c.label} <span style={{ opacity: 0.7 }}>{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Buckets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {buckets.map(([bucket, rows]) => (
          <div key={bucket}>
            <p
              style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.06em", color: "var(--muted-foreground)",
                margin: "0 0 8px", paddingLeft: 2,
              }}
            >
              {bucket} · {rows.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((ev) => {
                const style = CATEGORY_STYLE[ev.category];
                const Icon = style.icon;
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${style.bg}`,
                      background: "var(--background)",
                      transition: "background 0.15s, transform 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = style.bg;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--background)";
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: style.bg, color: style.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ width: 14, height: 14 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {ev.title}
                        </p>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6,
                          background: style.bg, color: style.color,
                          flexShrink: 0,
                        }}>
                          {style.label}
                        </span>
                      </div>
                      {ev.subtitle && (
                        <p style={{
                          fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {ev.subtitle}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>
                        {formatDateShort(ev.date)}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {formatRelative(ev.date, now)}
                      </span>
                    </div>
                    <ChevronRight style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
