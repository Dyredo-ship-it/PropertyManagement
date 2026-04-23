import {
  getAccountingTransactions,
  getTenants,
  getBuildings,
  getOrgRentSettings,
  type Tenant,
  type Building,
  type AccountingTransaction,
  type OrgRentSettings,
} from "./storage";

export type RentMonthStatus = "paid" | "paid-late" | "overdue" | "unpaid";

export type TenantRentMonth = {
  tenant: Tenant;
  building: Building | undefined;
  monthKey: string; // YYYY-MM
  status: RentMonthStatus;
  deadline: Date;
  expectedAmount: number; // rentNet + charges when applicable
  paidAmount: number;
  daysLate?: number;
};

/**
 * Deadline for paying the rent of a covered month.
 * - rentInAdvance=true  → due on day D of month M
 * - rentInAdvance=false → due on day D of month M+1
 */
export function rentDeadline(
  year: number,
  month1to12: number,
  settings: Pick<OrgRentSettings, "rentDueDay" | "rentInAdvance">,
): Date {
  const dueDay = Math.min(28, Math.max(1, settings.rentDueDay || 1));
  if (settings.rentInAdvance) {
    return new Date(year, month1to12 - 1, dueDay);
  }
  const nextMonth = month1to12 === 12 ? 1 : month1to12 + 1;
  const yearOfDeadline = month1to12 === 12 ? year + 1 : year;
  return new Date(yearOfDeadline, nextMonth - 1, dueDay);
}

/**
 * Resolve rent status for a single (tenant, month). Reads transactions
 * directly from the cache — no UI dependency, safe to call from any view.
 */
export function tenantMonthStatus(
  tenant: Tenant,
  year: number,
  month1to12: number,
  settings: Pick<OrgRentSettings, "rentDueDay" | "rentInAdvance">,
  txs?: AccountingTransaction[],
): TenantRentMonth {
  const monthKey = `${year}-${String(month1to12).padStart(2, "0")}`;
  const allTxs = txs ?? getAccountingTransactions(tenant.buildingId);
  const lastName = tenant.name.toLowerCase().split(" ").pop() || "";
  const matches = allTxs.filter(
    (tx) =>
      tx.buildingId === tenant.buildingId &&
      tx.accountNumber === 101 &&
      tx.month === monthKey &&
      tx.description?.toLowerCase().includes(lastName),
  );
  const deadline = rentDeadline(year, month1to12, settings);
  const today = new Date();
  const paidAmount = matches.reduce((s, tx) => s + (tx.credit || 0), 0);

  let status: RentMonthStatus;
  let daysLate: number | undefined;

  if (matches.length > 0) {
    const latestPay = matches
      .map((tx) => tx.datePayment && new Date(tx.datePayment))
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const isLate = latestPay ? latestPay > deadline : false;
    status = isLate ? "paid-late" : "paid";
    if (isLate && latestPay) {
      daysLate = Math.round((latestPay.getTime() - deadline.getTime()) / 86400000);
    }
  } else if (today > deadline) {
    status = "overdue";
    daysLate = Math.round((today.getTime() - deadline.getTime()) / 86400000);
  } else {
    status = "unpaid";
  }

  return {
    tenant,
    building: getBuildings().find((b) => b.id === tenant.buildingId),
    monthKey,
    status,
    deadline,
    expectedAmount: (tenant.rentNet ?? 0) + (tenant.charges ?? 0),
    paidAmount,
    daysLate,
  };
}

/**
 * Every overdue rent across the org (or a single building) for the current
 * month. Only returns cases where the money is still actually owed — not
 * "paid-late". Sorted by longest overdue first so the most urgent case
 * surfaces at the top.
 */
export function listOverdueThisMonth(opts?: { buildingId?: string }): TenantRentMonth[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const settings = getOrgRentSettings();
  const tenants = getTenants().filter((t) => {
    if (t.status !== "active") return false;
    if (opts?.buildingId && t.buildingId !== opts.buildingId) return false;
    // Skip tenants whose lease hasn't started yet.
    if (t.leaseStart && new Date(t.leaseStart) > now) return false;
    // Skip garage-only renters when computing overdue rent for the apartment
    // grid? No — they also owe. Keep them.
    return true;
  });
  const txs = getAccountingTransactions(opts?.buildingId);

  const results: TenantRentMonth[] = [];
  for (const tenant of tenants) {
    const row = tenantMonthStatus(tenant, year, month, settings, txs);
    if (row.status === "overdue") results.push(row);
  }
  results.sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0));
  return results;
}

/** Same as listOverdueThisMonth but for the paid-late case. */
export function listPaidLateThisMonth(opts?: { buildingId?: string }): TenantRentMonth[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const settings = getOrgRentSettings();
  const tenants = getTenants().filter((t) => {
    if (t.status !== "active") return false;
    if (opts?.buildingId && t.buildingId !== opts.buildingId) return false;
    return true;
  });
  const txs = getAccountingTransactions(opts?.buildingId);

  const results: TenantRentMonth[] = [];
  for (const tenant of tenants) {
    const row = tenantMonthStatus(tenant, year, month, settings, txs);
    if (row.status === "paid-late") results.push(row);
  }
  results.sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0));
  return results;
}
