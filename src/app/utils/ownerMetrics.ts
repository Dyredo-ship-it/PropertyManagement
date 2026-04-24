import {
  getBuildings,
  getTenants,
  getAccountingTransactions,
  type Building,
  type Tenant,
  type Owner,
} from "./storage";
import { computeNetIncome } from "./financialMetrics";
import { listOverdueThisMonth } from "./rentStatus";

/**
 * Portfolio-level metrics for a single owner. Aggregates across every
 * building where building.ownerId === owner.id. Revenue/expenses come
 * straight from accounting transactions for the given year (current
 * year by default), so they match every other financial view in the
 * app.
 */

export type OwnerPortfolio = {
  owner: Owner;
  buildings: Building[];
  tenantCount: number;
  activeTenantCount: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number; // 0..100

  // YTD financials from accounting (same accounts used throughout).
  revenueYtd: number;
  expensesYtd: number;
  netIncomeYtd: number;
  netMarginYtd: number; // % margin
  hasAccountingData: boolean;

  // Current-month snapshot
  overdueCount: number;
  overdueAmount: number;

  // Monthly-revenue summary (from building.monthlyRevenue, which is
  // the nominal target even when accounting is sparse).
  nominalMonthlyRevenue: number;

  year: number;
};

export function buildOwnerPortfolio(owner: Owner, year?: number): OwnerPortfolio {
  const y = year ?? new Date().getFullYear();
  const buildings = getBuildings().filter((b) => b.ownerId === owner.id);
  const buildingIds = new Set(buildings.map((b) => b.id));
  const tenants = getTenants().filter((t) => buildingIds.has(t.buildingId));
  const activeTenants = tenants.filter((t) => t.status === "active");

  const totalUnits = buildings.reduce((s, b) => s + (b.units ?? 0), 0);
  const occupiedUnits = buildings.reduce((s, b) => s + (b.occupiedUnits ?? 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Sum YTD net income across every building of this owner.
  let revenueYtd = 0;
  let expensesYtd = 0;
  let hasAccountingData = false;
  for (const b of buildings) {
    const m = computeNetIncome({ buildingId: b.id, year: y });
    revenueYtd += m.revenue;
    expensesYtd += m.expenses;
    if (m.hasData) hasAccountingData = true;
  }
  const netIncomeYtd = revenueYtd - expensesYtd;
  const netMarginYtd = revenueYtd > 0 ? (netIncomeYtd / revenueYtd) * 100 : 0;

  // Current-month overdue scoped to this owner's portfolio.
  const overdueAll = listOverdueThisMonth();
  const overdue = overdueAll.filter((o) => buildingIds.has(o.tenant.buildingId));
  const overdueCount = overdue.length;
  const overdueAmount = overdue.reduce((s, o) => s + o.expectedAmount, 0);

  const nominalMonthlyRevenue = buildings.reduce((s, b) => s + (b.monthlyRevenue ?? 0), 0);

  return {
    owner,
    buildings,
    tenantCount: tenants.length,
    activeTenantCount: activeTenants.length,
    totalUnits,
    occupiedUnits,
    occupancyRate,
    revenueYtd,
    expensesYtd,
    netIncomeYtd,
    netMarginYtd,
    hasAccountingData,
    overdueCount,
    overdueAmount,
    nominalMonthlyRevenue,
    year: y,
  };
}

/** Group all tenants of an owner's portfolio with payment status. */
export function ownerTenantRoster(owner: Owner, _tenants: Tenant[]): {
  building: Building;
  tenants: Tenant[];
}[] {
  const buildings = getBuildings().filter((b) => b.ownerId === owner.id);
  const tenants = getTenants();
  return buildings.map((building) => ({
    building,
    tenants: tenants.filter((t) => t.buildingId === building.id),
  }));
}

export type { Owner };
