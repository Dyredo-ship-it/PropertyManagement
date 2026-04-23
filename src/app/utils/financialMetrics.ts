import {
  getAccountingTransactions,
  getManualAdjustments,
  getTenants,
  getBuildings,
  type AccountingTransaction,
  type ManualAdjustment,
  type Tenant,
} from "./storage";

const REVENUE_ACCOUNTS = [101, 102, 103, 104, 105, 106, 107];
const EXPENSE_ACCOUNTS = [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219];

const REVENUE_SET = new Set(REVENUE_ACCOUNTS);
const EXPENSE_SET = new Set(EXPENSE_ACCOUNTS);

export type NetIncomeMetrics = {
  revenue: number;
  expenses: number;
  netIncome: number;
  netIncomeRatio: number; // percentage (netIncome / revenue * 100)
  hasData: boolean;
};

export type MonthlyPoint = {
  month: string;      // "YYYY-MM"
  monthLabel: string; // short month label, e.g. "Mar"
  year: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  occupancy?: number; // percentage, filled in by the caller when available
};

export type PeriodMetrics = {
  points: MonthlyPoint[];
  totals: { revenue: number; expenses: number; netIncome: number };
  hasData: boolean;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function txMonth(tx: AccountingTransaction): string | null {
  if (tx.month && /^\d{4}-\d{2}$/.test(tx.month)) return tx.month;
  const d = tx.datePayment || tx.dateInvoice;
  if (d && d.length >= 7) return d.slice(0, 7);
  return null;
}

export function computeNetIncome(opts?: {
  buildingId?: string;
  year?: number;
}): NetIncomeMetrics {
  const year = opts?.year ?? new Date().getFullYear();
  const yearPrefix = String(year);

  const txs = getAccountingTransactions(opts?.buildingId).filter((tx) => {
    const m = txMonth(tx);
    return !!m && m.startsWith(yearPrefix);
  });
  // Manual adjustments have no date → include all for the building scope.
  const adjs = getManualAdjustments(opts?.buildingId);

  let revenue = 0;
  let expenses = 0;

  for (const tx of txs) {
    const d = tx.debit || 0;
    const c = tx.credit || 0;
    if (REVENUE_SET.has(tx.accountNumber)) revenue += c - d;
    else if (EXPENSE_SET.has(tx.accountNumber)) expenses += d - c;
  }
  for (const adj of adjs) {
    const d = adj.type === "debit" ? adj.amount : 0;
    const c = adj.type === "credit" ? adj.amount : 0;
    if (REVENUE_SET.has(adj.accountNumber)) revenue += c - d;
    else if (EXPENSE_SET.has(adj.accountNumber)) expenses += d - c;
  }

  const netIncome = revenue - expenses;
  const netIncomeRatio = revenue > 0 ? (netIncome / revenue) * 100 : 0;
  const hasData = txs.length > 0 || adjs.length > 0;

  return { revenue, expenses, netIncome, netIncomeRatio, hasData };
}

export function formatRatio(ratio: number, hasData: boolean): string {
  if (!hasData) return "—";
  return `${ratio.toFixed(1)}%`;
}

/* ─── Monthly series helpers ────────────────────────────────── */

// Returns a list of "YYYY-MM" strings from start to end (inclusive).
export function expandMonthRange(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

export function shiftMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + deltaMonths;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

// Build a monthly revenue/expense/netIncome series from accounting data for a
// given building (or all) over an inclusive month range.
export function buildMonthlyMetrics(opts: {
  buildingId?: string;
  startYearMonth: string;
  endYearMonth: string;
}): PeriodMetrics {
  const months = expandMonthRange(opts.startYearMonth, opts.endYearMonth);
  const byMonth: Record<string, { revenue: number; expenses: number }> = {};
  for (const m of months) byMonth[m] = { revenue: 0, expenses: 0 };

  const txs = getAccountingTransactions(opts.buildingId);
  let touched = 0;
  for (const tx of txs) {
    const m = txMonth(tx);
    if (!m || !byMonth[m]) continue;
    const d = tx.debit || 0;
    const c = tx.credit || 0;
    if (REVENUE_SET.has(tx.accountNumber)) {
      byMonth[m].revenue += c - d;
      touched += 1;
    } else if (EXPENSE_SET.has(tx.accountNumber)) {
      byMonth[m].expenses += d - c;
      touched += 1;
    }
  }

  const points: MonthlyPoint[] = months.map((m) => {
    const [y, mm] = m.split("-").map(Number);
    const revenue = byMonth[m].revenue;
    const expenses = byMonth[m].expenses;
    return {
      month: m,
      monthLabel: MONTH_LABELS[mm - 1],
      year: y,
      revenue,
      expenses,
      netIncome: revenue - expenses,
    };
  });

  const totals = points.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      expenses: acc.expenses + p.expenses,
      netIncome: acc.netIncome + p.netIncome,
    }),
    { revenue: 0, expenses: 0, netIncome: 0 },
  );

  return { points, totals, hasData: touched > 0 };
}

/* ─── Time-frame presets ────────────────────────────────────── */

export type TimeFrameKey = "last-6" | "last-12" | "ytd" | "year" | "all";

export type TimeFrameRange = {
  start: string; // YYYY-MM
  end: string;   // YYYY-MM
};

export function resolveTimeFrame(
  key: TimeFrameKey,
  now: Date = new Date(),
  opts?: { year?: number; earliestMonth?: string | null },
): TimeFrameRange {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const end = `${y}-${String(m).padStart(2, "0")}`;
  switch (key) {
    case "last-6":
      return { start: shiftMonth(end, -5), end };
    case "last-12":
      return { start: shiftMonth(end, -11), end };
    case "ytd":
      return { start: `${y}-01`, end };
    case "year": {
      const yr = opts?.year ?? y;
      return { start: `${yr}-01`, end: `${yr}-12` };
    }
    case "all":
      return { start: opts?.earliestMonth ?? `${y}-01`, end };
  }
}

// Returns the earliest "YYYY-MM" we have accounting data for across the scope,
// or null if there are no transactions.
export function earliestTransactionMonth(buildingId?: string): string | null {
  let min: string | null = null;
  for (const tx of getAccountingTransactions(buildingId)) {
    const m = txMonth(tx);
    if (!m) continue;
    if (!min || m < min) min = m;
  }
  return min;
}

export function formatDeltaPct(current: number, prior: number): { text: string; up: boolean | null } {
  if (!prior) return { text: "—", up: null };
  const delta = ((current - prior) / Math.abs(prior)) * 100;
  const sign = delta >= 0 ? "+" : "";
  return { text: `${sign}${delta.toFixed(1)}%`, up: delta >= 0 };
}

/* ─── Historical occupancy ──────────────────────────────────── */

// For each month in [start, end], count active tenants (leaseStart <= month-end
// AND (leaseEnd is empty OR leaseEnd >= month-start)) and divide by total units
// of the building scope.
export function buildMonthlyOccupancy(opts: {
  buildingId?: string;
  startYearMonth: string;
  endYearMonth: string;
}): { month: string; occupancy: number }[] {
  const months = expandMonthRange(opts.startYearMonth, opts.endYearMonth);
  const tenants: Tenant[] = getTenants().filter((t) =>
    opts.buildingId ? t.buildingId === opts.buildingId : true,
  );
  const buildings = getBuildings();
  const totalUnits = opts.buildingId
    ? (buildings.find((b) => b.id === opts.buildingId)?.units ?? 0)
    : buildings.reduce((s, b) => s + (b.units ?? 0), 0);

  return months.map((m) => {
    const [y, mm] = m.split("-").map(Number);
    const monthStart = `${y}-${String(mm).padStart(2, "0")}-01`;
    const lastDay = new Date(y, mm, 0).getDate();
    const monthEnd = `${y}-${String(mm).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const activeCount = tenants.filter((t) => {
      const start = t.leaseStart || "";
      const end = t.leaseEnd || "";
      if (start && start > monthEnd) return false;
      if (end && end < monthStart) return false;
      return true;
    }).length;
    const occupancy = totalUnits > 0 ? Math.min(100, Math.round((activeCount / totalUnits) * 100)) : 0;
    return { month: m, occupancy };
  });
}
