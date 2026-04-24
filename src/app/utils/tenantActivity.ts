import {
  getAccountingTransactions,
  getMaintenanceRequests,
  getNotifications,
  getTenantNotes,
  getTenantDocuments,
  type Tenant,
  type MaintenanceRequest,
} from "./storage";

/**
 * Aggregates every tenant-related event from existing caches into a
 * single chronological feed. Pure read — no new storage, no write.
 */

export type ActivityKind =
  | "lease-start"
  | "lease-end"
  | "note"
  | "document"
  | "payment"
  | "email-sent"
  | "request-filed"
  | "request-resolved";

export type TenantActivity = {
  id: string;
  kind: ActivityKind;
  date: string; // ISO or YYYY-MM-DD
  title: string;
  subtitle?: string;
  amount?: number;
  metadata?: Record<string, string>;
};

function lastNameTokens(fullName: string): string[] {
  const parts = fullName.toLowerCase().split(/\s+/).filter(Boolean);
  // Index by last word + first word — handles "SHI Zhen", "Brunner Marie-Anne"
  const tokens: string[] = [];
  if (parts.length > 0) tokens.push(parts[parts.length - 1]);
  if (parts.length > 1) tokens.push(parts[0]);
  return tokens.filter((t) => t.length >= 3);
}

function matchTenantInText(tenant: Tenant, text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  for (const token of lastNameTokens(tenant.name)) {
    if (lower.includes(token)) return true;
  }
  return false;
}

export function buildTenantActivity(tenant: Tenant): TenantActivity[] {
  const events: TenantActivity[] = [];

  // Lease start + end (if known)
  if (tenant.leaseStart) {
    events.push({
      id: `ls-${tenant.id}`,
      kind: "lease-start",
      date: tenant.leaseStart,
      title: "Début du bail",
      subtitle: tenant.unit,
    });
  }
  if (tenant.leaseEnd) {
    const isPast = tenant.leaseEnd < new Date().toISOString().slice(0, 10);
    events.push({
      id: `le-${tenant.id}`,
      kind: "lease-end",
      date: tenant.leaseEnd,
      title: isPast ? "Fin du bail" : "Fin de bail prévue",
      subtitle: tenant.unit,
    });
  }

  // Notes
  for (const note of getTenantNotes()) {
    if (note.tenantId !== tenant.id) continue;
    events.push({
      id: `note-${note.id}`,
      kind: "note",
      date: note.date,
      title: "Note interne",
      subtitle: note.text.length > 140 ? note.text.slice(0, 140) + "…" : note.text,
    });
  }

  // Documents
  for (const doc of getTenantDocuments()) {
    if (doc.tenantId !== tenant.id) continue;
    events.push({
      id: `doc-${doc.id}`,
      kind: "document",
      date: doc.createdAt,
      title: `Document ajouté — ${doc.type}`,
      subtitle: doc.fileName,
    });
  }

  // Accounting transactions — match account 101/102/103 with tenant name
  // in description (same logic as rent tracking).
  const relevantAccounts = new Set([101, 102, 103]);
  for (const tx of getAccountingTransactions(tenant.buildingId)) {
    if (!relevantAccounts.has(tx.accountNumber)) continue;
    if (!matchTenantInText(tenant, tx.description) && tx.tenantName !== tenant.name) continue;
    const isPayment = tx.credit > 0;
    if (!isPayment) continue;
    const dateRaw = tx.datePayment || tx.dateInvoice;
    if (!dateRaw) continue;
    const label =
      tx.accountNumber === 103 ? "Acompte de charges reçu"
      : tx.accountNumber === 102 ? "Loyer parking/garage reçu"
      : "Loyer reçu";
    events.push({
      id: `tx-${tx.id}`,
      kind: "payment",
      date: dateRaw,
      title: label,
      subtitle: tx.month ? `Mois : ${tx.month}` : tx.description,
      amount: tx.credit,
    });
  }

  // Notifications — reminders sent
  for (const n of getNotifications()) {
    const forTenant = (n as any).tenantId as string | undefined;
    const marker = (n as any).reminderMarker as string | undefined;
    if (forTenant !== tenant.id) continue;
    // Prefer structured marker, fallback to payment category
    if (marker && marker.startsWith("reminder-sent:")) {
      events.push({
        id: `notif-${n.id}`,
        kind: "email-sent",
        date: n.date,
        title: n.title,
        subtitle: n.message,
      });
    } else if (n.category === "payment") {
      events.push({
        id: `notif-${n.id}`,
        kind: "email-sent",
        date: n.date,
        title: n.title,
        subtitle: n.message,
      });
    }
  }

  // Maintenance requests filed or assigned to this tenant
  for (const r of getMaintenanceRequests() as MaintenanceRequest[]) {
    const forTenant = (r as any).tenantId as string | undefined;
    if (forTenant !== tenant.id) continue;
    events.push({
      id: `req-filed-${r.id}`,
      kind: "request-filed",
      date: r.createdAt ?? new Date().toISOString(),
      title: `Demande ouverte — ${r.title}`,
      subtitle: r.description?.slice(0, 140),
    });
    if (r.status === "completed") {
      events.push({
        id: `req-done-${r.id}`,
        kind: "request-resolved",
        date: (r as any).completedAt ?? r.createdAt ?? new Date().toISOString(),
        title: `Demande résolue — ${r.title}`,
      });
    }
  }

  // Newest first
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}
