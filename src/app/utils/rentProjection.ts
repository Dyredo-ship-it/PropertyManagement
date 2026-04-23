import {
  getTenants,
  getAccountingTransactions,
  addAccountingTransactions,
  saveAccountingTransactions,
  type Tenant,
  type AccountingTransaction,
} from "./storage";

/**
 * Generate monthly rent + charges entries for a given building/year from
 * the currently active leases. Entries are tagged with status="Prévisionnel"
 * so they can be distinguished from real entries (and bulk-removed later).
 *
 * Account mapping:
 *   - Apartments → 101 (Encaissements loyers), + 103 (Acomptes de charges)
 *   - Parking / garages → 102 (Loyers places de parc / garages)
 *
 * A unit is treated as a parking spot when its label starts with
 * "garage" or "place" (case-insensitive). Everything else is an apartment.
 */

export const PROJECTED_STATUS = "Prévisionnel";

export type ProjectionOptions = {
  buildingId: string;
  year: number;
  includeRent?: boolean; // default true (101/102)
  includeCharges?: boolean; // default true (103)
  organizationId?: string | null;
};

export type ProjectionPreview = {
  entries: Omit<AccountingTransaction, "id">[];
  tenantCount: number;
  apartmentMonths: number;
  garageMonths: number;
  chargesMonths: number;
  totalAmount: number;
  existingProjectedCount: number; // already in DB, will be replaced on apply
};

function isParkingUnit(unit: string | undefined): boolean {
  const u = (unit ?? "").toLowerCase().trim();
  return u.startsWith("garage") || u.startsWith("place");
}

// True if the given month overlaps with the tenant's lease.
function leaseCoversMonth(tenant: Tenant, year: number, month: number): boolean {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const start = tenant.leaseStart || "";
  const end = tenant.leaseEnd || "";
  if (start && start > monthEnd) return false;
  if (end && end < monthStart) return false;
  return true;
}

export function previewProjection(opts: ProjectionOptions): ProjectionPreview {
  const includeRent = opts.includeRent !== false;
  const includeCharges = opts.includeCharges !== false;

  const tenants = getTenants().filter((t) => t.buildingId === opts.buildingId && t.status !== "ended");
  const entries: Omit<AccountingTransaction, "id">[] = [];
  let apartmentMonths = 0;
  let garageMonths = 0;
  let chargesMonths = 0;
  let totalAmount = 0;

  for (const tenant of tenants) {
    const parking = isParkingUnit(tenant.unit);
    for (let m = 1; m <= 12; m++) {
      if (!leaseCoversMonth(tenant, opts.year, m)) continue;
      const monthKey = `${opts.year}-${String(m).padStart(2, "0")}`;
      const lastDay = new Date(opts.year, m, 0).getDate();
      const dateInvoice = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

      if (includeRent && tenant.rentNet > 0) {
        const account = parking ? 102 : 101;
        const category = parking
          ? "102 — Loyers garages & places de parc"
          : "101 — Encaissements loyers";
        entries.push({
          buildingId: opts.buildingId,
          dateInvoice,
          unit: tenant.unit,
          description: `${monthLabel(m)} ${opts.year} — ${tenant.name} (prévisionnel)`,
          category,
          accountNumber: account,
          debit: 0,
          credit: tenant.rentNet,
          status: PROJECTED_STATUS,
          tenantName: tenant.name,
          month: monthKey,
        });
        totalAmount += tenant.rentNet;
        if (parking) garageMonths += 1;
        else apartmentMonths += 1;
      }

      if (includeCharges && !parking && tenant.charges > 0) {
        entries.push({
          buildingId: opts.buildingId,
          dateInvoice,
          unit: tenant.unit,
          description: `${monthLabel(m)} ${opts.year} — ${tenant.name} — acompte charges (prévisionnel)`,
          category: "103 — Acomptes de charges",
          accountNumber: 103,
          debit: 0,
          credit: tenant.charges,
          status: PROJECTED_STATUS,
          tenantName: tenant.name,
          month: monthKey,
        });
        totalAmount += tenant.charges;
        chargesMonths += 1;
      }
    }
  }

  const existingProjected = getAccountingTransactions(opts.buildingId).filter(
    (tx) => tx.status === PROJECTED_STATUS && tx.month?.startsWith(String(opts.year)),
  );

  return {
    entries,
    tenantCount: tenants.length,
    apartmentMonths,
    garageMonths,
    chargesMonths,
    totalAmount,
    existingProjectedCount: existingProjected.length,
  };
}

// Replaces existing projected entries for (buildingId, year) with the newly
// generated ones. Real (non-projected) entries are never touched.
export function applyProjection(opts: ProjectionOptions): { inserted: number; removed: number } {
  const preview = previewProjection(opts);

  const existing = getAccountingTransactions();
  const kept = existing.filter((tx) => {
    if (tx.buildingId !== opts.buildingId) return true;
    if (tx.status !== PROJECTED_STATUS) return true;
    if (!tx.month?.startsWith(String(opts.year))) return true;
    return false; // drop: this is a projected entry for the target year
  });
  const removed = existing.length - kept.length;
  saveAccountingTransactions(kept);

  const inserted = addAccountingTransactions(preview.entries).length;
  return { inserted, removed };
}

// Removes all projected entries for (buildingId, year) without inserting new
// ones. Useful for the "clear projection" action.
export function clearProjection(buildingId: string, year: number): number {
  const existing = getAccountingTransactions();
  const kept = existing.filter((tx) => {
    if (tx.buildingId !== buildingId) return true;
    if (tx.status !== PROJECTED_STATUS) return true;
    if (!tx.month?.startsWith(String(year))) return true;
    return false;
  });
  const removed = existing.length - kept.length;
  if (removed > 0) saveAccountingTransactions(kept);
  return removed;
}

function monthLabel(month: number): string {
  return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][month - 1];
}
