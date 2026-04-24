// ============================================================
// In-memory cache backed by Supabase.
//
// The public API (getX / saveX) is synchronous, same shape as the
// previous localStorage-based storage. At app boot (after auth),
// `hydrateFromSupabase()` fills the cache. Save functions update the
// cache synchronously and fire-and-forget a write to Supabase.
//
// This keeps all existing React components working while persisting
// data server-side.
// ============================================================

import { supabase } from "../lib/supabase";

// ──────────────────────────────────────────────────────────────
// Types (unchanged — kept identical to pre-migration)
// ──────────────────────────────────────────────────────────────
export type Currency = "CHF" | "EUR" | "USD" | "GBP";

export interface Building {
  id: string;
  name: string;
  address: string;
  units: number;
  occupiedUnits: number;
  monthlyRevenue: number;
  imageUrl?: string;
  currency?: Currency;
  ownerId?: string;
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  notes?: string;
}

export interface ExchangeRateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
}

export type TenantStatus = "active" | "pending" | "ended";
export type TenantGender = "male" | "female" | "unspecified";

export interface TenantNote {
  id: string;
  tenantId: string;
  date: string;
  text: string;
}

export type TenantDocumentType =
  | "Assurance ménage"
  | "Contrat de bail"
  | "Carte d'identité"
  | "Casier des poursuites"
  | "Fiches salaires"
  | "Communication"
  | "Autre";

export interface TenantDocument {
  id: string;
  tenantId: string;
  type: TenantDocumentType;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  dataUrl?: string;
  storagePath?: string;
}

export type DepositType =
  | "compte-bloque"
  | "garantie-bancaire"
  | "paritaire"
  | "cash"
  | "autre";

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  buildingId: string;
  buildingName: string;
  unit: string;
  rentNet: number;
  charges: number;
  leaseStart: string;
  leaseEnd?: string;
  status: TenantStatus;
  gender: TenantGender;
  paymentStatus?: "up-to-date" | "late" | "very-late";
  latePaymentMonths?: number;
  lastPaymentDate?: string;
  // Deposit / caution (Mietkaution)
  depositAmount?: number;
  depositType?: DepositType;
  depositBank?: string;
  depositIban?: string;
  depositAccountNumber?: string;
  depositDocumentName?: string;
  depositDocumentDataUrl?: string;
  depositReleasedAt?: string; // ISO date when the deposit was actually released
  depositNotes?: string;
}

export type NotificationCategory = "general" | "maintenance" | "payment" | "inspection" | "urgent";

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  buildingId?: string;
  recipientId?: string;
  category?: NotificationCategory;
}

export type MaintenanceStatus = "pending" | "in-progress" | "completed";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type RequestType = "technical" | "administrative" | "rental";

export interface TenantAbsence {
  id: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  comment?: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  buildingId: string;
  buildingName: string;
  unit: string;
  tenantId: string;
  tenantName: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: string;
  updatedAt?: string;
  category?: string;
  requestType?: RequestType;
  dateObserved?: string;
  photos?: string[];
}

export type BuildingActionPriority = "low" | "medium" | "high";
export type BuildingActionStatus = "open" | "done";

export interface BuildingAction {
  id: string;
  buildingId: string;
  title: string;
  description?: string;
  priority: BuildingActionPriority;
  status: BuildingActionStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventType = "visit" | "inspection" | "signing" | "meeting" | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  type: CalendarEventType;
  buildingId?: string;
  notes?: string;
  createdAt: string;
}

export type AccountCategory =
  | 101 | 102 | 103 | 104 | 105 | 106
  | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 209 | 210 | 211 | 212 | 213 | 214 | 215 | 216 | 217 | 218
  | 301 | 302 | 401;

export interface AccountingTransaction {
  id: string;
  buildingId: string;
  dateInvoice: string;
  datePayment?: string;
  unit?: string;
  description: string;
  category: string;
  subCategory?: string;
  accountNumber: number;
  debit: number;
  credit: number;
  status?: string;
  tenantName?: string;
  month?: string;
}

export interface Renovation {
  id: string;
  buildingId: string;
  unit?: string;
  category: string;
  item: string;
  amortizationYears: number;
  dateCompleted: string;
  cost: number;
  notes?: string;
  createdAt: string;
}

export interface AccountingSettings {
  units: string[];
  categories: string[];
  subCategories: string[];
  unitAssignments?: Record<string, string>;
  unitTypes?: Record<string, "appartement" | "garage" | "place_de_parc" | "autre">;
}

export interface ManualAdjustment {
  id: string;
  buildingId: string;
  accountNumber: number;
  label: string;
  amount: number;
  type: "debit" | "credit";
  createdAt: string;
}

export type ChartEntryType = "revenue" | "expense" | "investment" | "owner" | "charges_income";

// One row per (org, num). Stores either an override on a standard account
// (is_custom=false, possibly with custom_label and/or disabled), or a user-
// defined custom account (is_custom=true, custom_label required).
// buildingIds empty = applies to all buildings of the org.
export interface ChartEntry {
  id: string;
  num: number;
  customLabel: string | null;
  type: ChartEntryType;
  buildingIds: string[];
  disabled: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgRentSettings {
  // Day of the month (1..28) by which rent must arrive for the month it covers.
  rentDueDay: number;
  // true = Swiss convention: rent for month M is due by day D of M.
  // false = rent for month M is due by day D of the previous month.
  rentInAdvance: boolean;
}

export const DEFAULT_ORG_RENT_SETTINGS: OrgRentSettings = {
  rentDueDay: 1,
  rentInAdvance: true,
};

export type RentalApplicationStatus = "received" | "under-review" | "accepted" | "rejected";

export interface RentalApplication {
  id: string;
  buildingId: string;
  buildingName: string;
  desiredUnit: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  currentAddress: string;
  desiredMoveIn: string;
  monthlyIncome: number;
  householdSize: number;
  occupation: string;
  employer: string;
  message: string;
  status: RentalApplicationStatus;
  createdAt: string;
  updatedAt: string;
  documents?: { name: string; type: string; data: string }[];
}

/* ─── Contracts (assurances, chauffage, conciergerie…) ────────── */

export type ContractType =
  | "assurance-batiment"
  | "assurance-rc"
  | "assurance-incendie"
  | "chauffage"
  | "conciergerie"
  | "ascenseur"
  | "jardinage"
  | "nettoyage"
  | "securite"
  | "telecom"
  | "autre";

export type ContractStatus = "active" | "expired" | "cancelled";
export type PaymentFrequency = "monthly" | "quarterly" | "yearly" | "one-time";

export interface Contract {
  id: string;
  buildingId: string;
  type: ContractType;
  label: string;
  provider?: string;
  policyNumber?: string;
  startDate?: string;        // YYYY-MM-DD
  renewalDate?: string;      // YYYY-MM-DD — next renewal
  noticePeriodDays: number;  // how many days' notice required to opt out
  autoRenew: boolean;
  annualAmount?: number;
  currency?: Currency;
  paymentFrequency?: PaymentFrequency;
  notes?: string;
  status: ContractStatus;
  documentName?: string;     // original filename of the attached PDF/scan
  documentDataUrl?: string;  // base64 data URL of the attached document
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────
// In-memory cache
// ──────────────────────────────────────────────────────────────
type Cache = {
  buildings: Building[];
  tenants: Tenant[];
  notifications: Notification[];
  maintenanceRequests: MaintenanceRequest[];
  tenantNotes: TenantNote[];
  tenantDocuments: TenantDocument[];
  tenantAbsences: TenantAbsence[];
  buildingActions: BuildingAction[];
  rentalApplications: RentalApplication[];
  calendarEvents: CalendarEvent[];
  accountingTransactions: AccountingTransaction[];
  manualAdjustments: ManualAdjustment[];
  chartEntries: ChartEntry[];
  renovations: Renovation[];
  contracts: Contract[];
  accountingSettings: Record<string, AccountingSettings>; // keyed by buildingId
  orgRentSettings: OrgRentSettings;
  baseCurrency: Currency;
  exchangeRates: ExchangeRateCache | null;
};

const cache: Cache = {
  buildings: [],
  tenants: [],
  notifications: [],
  maintenanceRequests: [],
  tenantNotes: [],
  tenantDocuments: [],
  tenantAbsences: [],
  buildingActions: [],
  rentalApplications: [],
  calendarEvents: [],
  accountingTransactions: [],
  manualAdjustments: [],
  chartEntries: [],
  renovations: [],
  contracts: [],
  accountingSettings: {},
  orgRentSettings: { ...DEFAULT_ORG_RENT_SETTINGS },
  baseCurrency: ((): Currency => {
    const stored =
      localStorage.getItem("palier_baseCurrency") ??
      localStorage.getItem("immostore_baseCurrency");
    return stored === "CHF" || stored === "EUR" || stored === "USD" || stored === "GBP" ? stored : "CHF";
  })(),
  exchangeRates: (() => {
    try {
      const raw =
        localStorage.getItem("palier_exchangeRates") ??
        localStorage.getItem("immostore_exchangeRates");
      return raw ? (JSON.parse(raw) as ExchangeRateCache) : null;
    } catch {
      return null;
    }
  })(),
};

let hydrated = false;
let orgIdCache: string | null = null;

function nowISO() {
  return new Date().toISOString();
}

function genTmpId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidDbId(id: string | undefined | null): boolean {
  return !!id && UUID_RE.test(id);
}

// Returns x unchanged if id is a valid UUID (= already persisted) or already a tmp_ id.
// Any other non-UUID id (e.g. Date.now().toString() from legacy components) is
// deterministically prefixed with tmp_ so subsequent saves see the same identity.
function ensureId<T extends { id: string }>(x: T): T {
  if (isValidDbId(x.id)) return x;
  if (x.id?.startsWith("tmp_")) return x;
  if (x.id) return { ...x, id: `tmp_${x.id}` };
  return { ...x, id: genTmpId() };
}

function toastError(where: string, err: any) {
  const msg = err?.message ?? err?.hint ?? JSON.stringify(err);
  // eslint-disable-next-line no-console
  console.error(`[storage] ${where}:`, err);
  try {
    // Visible toast so users see sync failures without opening devtools
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    import("sonner").then(({ toast }) => toast.error(`Sync ${where}: ${msg}`));
  } catch {}
}

function toastInfo(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`[storage] ${msg}`);
}

async function getOrgId(): Promise<string> {
  if (orgIdCache) return orgIdCache;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not authenticated");
  const { data } = await supabase.from("profiles").select("organization_id").eq("id", uid).maybeSingle();
  if (!data?.organization_id) throw new Error("No organization");
  orgIdCache = data.organization_id;
  return orgIdCache;
}

export function clearStorageCache() {
  orgIdCache = null;
  hydrated = false;
  cache.buildings = [];
  cache.tenants = [];
  cache.notifications = [];
  cache.maintenanceRequests = [];
  cache.tenantNotes = [];
  cache.tenantDocuments = [];
  cache.tenantAbsences = [];
  cache.buildingActions = [];
  cache.rentalApplications = [];
  cache.calendarEvents = [];
  cache.accountingTransactions = [];
  cache.manualAdjustments = [];
  cache.chartEntries = [];
  cache.renovations = [];
  cache.accountingSettings = {};
  cache.orgRentSettings = { ...DEFAULT_ORG_RENT_SETTINGS };
}

// ──────────────────────────────────────────────────────────────
// Mappers (DB row ↔ client type)
// ──────────────────────────────────────────────────────────────
const b2c = (r: any): Building => ({
  id: r.id,
  name: r.name,
  address: r.address,
  units: r.units ?? 0,
  occupiedUnits: r.occupied_units ?? 0,
  monthlyRevenue: Number(r.monthly_revenue ?? 0),
  imageUrl: r.image_url ?? undefined,
  currency: r.currency ?? undefined,
  ownerId: r.owner_id ?? undefined,
});

const b2r = (b: Partial<Building>, org: string) => ({
  ...(isValidDbId(b.id) ? { id: b.id } : {}),
  organization_id: org,
  name: b.name ?? "",
  address: b.address ?? "",
  units: b.units ?? 0,
  occupied_units: b.occupiedUnits ?? 0,
  monthly_revenue: b.monthlyRevenue ?? 0,
  image_url: b.imageUrl ?? null,
  currency: b.currency ?? "CHF",
  ...(b.ownerId ? { owner_id: b.ownerId } : {}),
});

export async function getOwner(ownerId: string): Promise<Owner | null> {
  const { data, error } = await supabase
    .from("owners")
    .select("id, name, email, phone, address, iban, notes")
    .eq("id", ownerId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email ?? undefined,
    phone: data.phone ?? undefined,
    address: data.address ?? undefined,
    iban: data.iban ?? undefined,
    notes: data.notes ?? undefined,
  };
}

// Lists every owner of the current org. Used by the Propriétaires view
// to show portfolio summaries + generate quarterly reports. Not cached
// in `cache.*` yet because the volume is typically tiny (< 50 rows).
export async function listOwners(): Promise<Owner[]> {
  const { data, error } = await supabase
    .from("owners")
    .select("id, name, email, phone, address, iban, notes")
    .order("name");
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    iban: r.iban ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

const t2c = (r: any): Tenant => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone ?? "",
  buildingId: r.building_id ?? "",
  buildingName: r.building_name ?? "",
  unit: r.unit ?? "",
  rentNet: Number(r.rent_net ?? 0),
  charges: Number(r.charges ?? 0),
  leaseStart: r.lease_start ?? "",
  leaseEnd: r.lease_end ?? undefined,
  status: r.status ?? "active",
  gender: r.gender ?? "unspecified",
  paymentStatus: r.payment_status ?? undefined,
  latePaymentMonths: r.late_payment_months ?? undefined,
  lastPaymentDate: r.last_payment_date ?? undefined,
  depositAmount: r.deposit_amount != null ? Number(r.deposit_amount) : undefined,
  depositType: r.deposit_type ?? undefined,
  depositBank: r.deposit_bank ?? undefined,
  depositIban: r.deposit_iban ?? undefined,
  depositAccountNumber: r.deposit_account_number ?? undefined,
  depositDocumentName: r.deposit_document_name ?? undefined,
  depositDocumentDataUrl: r.deposit_document_data_url ?? undefined,
  depositReleasedAt: r.deposit_released_at ?? undefined,
  depositNotes: r.deposit_notes ?? undefined,
});

const t2r = (t: Partial<Tenant>, org: string) => ({
  ...(isValidDbId(t.id) ? { id: t.id } : {}),
  organization_id: org,
  building_id: t.buildingId || null,
  building_name: t.buildingName ?? null,
  name: t.name ?? "",
  email: t.email ?? "",
  phone: t.phone ?? null,
  unit: t.unit ?? null,
  rent_net: t.rentNet ?? 0,
  charges: t.charges ?? 0,
  lease_start: t.leaseStart || null,
  lease_end: t.leaseEnd || null,
  status: t.status ?? "active",
  gender: t.gender ?? "unspecified",
  payment_status: t.paymentStatus ?? null,
  late_payment_months: t.latePaymentMonths ?? null,
  last_payment_date: t.lastPaymentDate ?? null,
  deposit_amount: t.depositAmount ?? null,
  deposit_type: t.depositType ?? null,
  deposit_bank: t.depositBank ?? null,
  deposit_iban: t.depositIban ?? null,
  deposit_account_number: t.depositAccountNumber ?? null,
  deposit_document_name: t.depositDocumentName ?? null,
  deposit_document_data_url: t.depositDocumentDataUrl ?? null,
  deposit_released_at: t.depositReleasedAt ?? null,
  deposit_notes: t.depositNotes ?? null,
});

const m2c = (r: any): MaintenanceRequest => ({
  id: r.id,
  title: r.title,
  description: r.description ?? "",
  buildingId: r.building_id ?? "",
  buildingName: r.building_name ?? "",
  unit: r.unit ?? "",
  tenantId: r.tenant_id ?? "",
  tenantName: r.tenant_name ?? "",
  status: r.status,
  priority: r.priority,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined,
  category: r.category ?? undefined,
  requestType: r.request_type ?? undefined,
  dateObserved: r.date_observed ?? undefined,
  photos: (r.photos as string[] | undefined) ?? undefined,
});

const m2r = (m: Partial<MaintenanceRequest>, org: string) => ({
  ...(isValidDbId(m.id) ? { id: m.id } : {}),
  organization_id: org,
  building_id: m.buildingId || null,
  building_name: m.buildingName ?? null,
  tenant_id: m.tenantId || null,
  tenant_name: m.tenantName ?? null,
  unit: m.unit ?? null,
  title: m.title ?? "",
  description: m.description ?? null,
  status: m.status ?? "pending",
  priority: m.priority ?? "medium",
  category: m.category ?? null,
  request_type: m.requestType ?? null,
  date_observed: m.dateObserved || null,
  photos: m.photos ?? [],
});

const n2c = (r: any): Notification => ({
  id: r.id,
  title: r.title,
  message: r.message ?? "",
  date: r.date,
  read: r.read,
  buildingId: r.building_id ?? undefined,
  recipientId: r.recipient_id ?? undefined,
  category: r.category ?? undefined,
});

const n2r = (n: Partial<Notification>, org: string) => ({
  ...(isValidDbId(n.id) ? { id: n.id } : {}),
  organization_id: org,
  building_id: n.buildingId || null,
  recipient_id: n.recipientId || null,
  title: n.title ?? "",
  message: n.message ?? null,
  category: n.category ?? "general",
  read: n.read ?? false,
  date: n.date ?? nowISO(),
});

const ra2c = (r: any): RentalApplication => ({
  id: r.id,
  buildingId: r.building_id ?? "",
  buildingName: r.building_name ?? "",
  desiredUnit: r.desired_unit ?? "",
  applicantName: r.applicant_name,
  applicantEmail: r.applicant_email,
  applicantPhone: r.applicant_phone ?? "",
  currentAddress: r.current_address ?? "",
  desiredMoveIn: r.desired_move_in ?? "",
  monthlyIncome: Number(r.monthly_income ?? 0),
  householdSize: r.household_size ?? 0,
  occupation: r.occupation ?? "",
  employer: r.employer ?? "",
  message: r.message ?? "",
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  documents: (r.documents as any) ?? [],
});

const ra2r = (a: Partial<RentalApplication>, org: string) => ({
  ...(isValidDbId(a.id) ? { id: a.id } : {}),
  organization_id: org,
  building_id: a.buildingId || null,
  building_name: a.buildingName ?? null,
  desired_unit: a.desiredUnit ?? null,
  applicant_name: a.applicantName ?? "",
  applicant_email: a.applicantEmail ?? "",
  applicant_phone: a.applicantPhone ?? null,
  current_address: a.currentAddress ?? null,
  desired_move_in: a.desiredMoveIn || null,
  monthly_income: a.monthlyIncome ?? null,
  household_size: a.householdSize ?? null,
  occupation: a.occupation ?? null,
  employer: a.employer ?? null,
  message: a.message ?? null,
  status: a.status ?? "received",
  documents: a.documents ?? [],
});

const ca2c = (r: any): CalendarEvent => ({
  id: r.id,
  title: r.title,
  date: r.date,
  startTime: r.start_time ?? "",
  endTime: r.end_time ?? undefined,
  type: r.type,
  buildingId: r.building_id ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const ca2r = (e: Partial<CalendarEvent>, org: string) => ({
  ...(isValidDbId(e.id) ? { id: e.id } : {}),
  organization_id: org,
  building_id: e.buildingId || null,
  title: e.title ?? "",
  date: e.date ?? "",
  start_time: e.startTime ?? null,
  end_time: e.endTime ?? null,
  type: e.type ?? "other",
  notes: e.notes ?? null,
});

const tx2c = (r: any): AccountingTransaction => ({
  id: r.id,
  buildingId: r.building_id,
  dateInvoice: r.date_invoice,
  datePayment: r.date_payment ?? undefined,
  unit: r.unit ?? undefined,
  description: r.description ?? "",
  category: r.category ?? "",
  subCategory: r.sub_category ?? undefined,
  accountNumber: r.account_number ?? 0,
  debit: Number(r.debit ?? 0),
  credit: Number(r.credit ?? 0),
  status: r.status ?? undefined,
  tenantName: r.tenant_name ?? undefined,
  month: r.month ?? undefined,
});

const tx2r = (t: Partial<AccountingTransaction>, org: string) => ({
  ...(isValidDbId(t.id) ? { id: t.id } : {}),
  organization_id: org,
  building_id: t.buildingId ?? "",
  date_invoice: t.dateInvoice ?? new Date().toISOString().slice(0, 10),
  date_payment: t.datePayment || null,
  unit: t.unit ?? null,
  description: t.description ?? null,
  category: t.category ?? null,
  sub_category: t.subCategory ?? null,
  account_number: t.accountNumber ?? null,
  debit: t.debit ?? 0,
  credit: t.credit ?? 0,
  status: t.status ?? null,
  tenant_name: t.tenantName ?? null,
  month: t.month ?? null,
});

const adj2c = (r: any): ManualAdjustment => ({
  id: r.id,
  buildingId: r.building_id,
  accountNumber: r.account_number,
  label: r.label,
  amount: Number(r.amount),
  type: r.type,
  createdAt: r.created_at,
});

const adj2r = (a: Partial<ManualAdjustment>, org: string) => ({
  ...(isValidDbId(a.id) ? { id: a.id } : {}),
  organization_id: org,
  building_id: a.buildingId ?? "",
  account_number: a.accountNumber ?? 0,
  label: a.label ?? "",
  amount: a.amount ?? 0,
  type: a.type ?? "debit",
});

const ce2c = (r: any): ChartEntry => ({
  id: r.id,
  num: r.num,
  customLabel: r.custom_label ?? null,
  type: r.type,
  buildingIds: Array.isArray(r.building_ids) ? r.building_ids : [],
  disabled: !!r.disabled,
  isCustom: !!r.is_custom,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const ce2r = (c: Partial<ChartEntry>, org: string) => ({
  ...(isValidDbId(c.id) ? { id: c.id } : {}),
  organization_id: org,
  num: c.num ?? 0,
  custom_label: c.customLabel ?? null,
  type: c.type ?? "revenue",
  building_ids: c.buildingIds ?? [],
  disabled: c.disabled ?? false,
  is_custom: c.isCustom ?? false,
});

const reno2c = (r: any): Renovation => ({
  id: r.id,
  buildingId: r.building_id,
  unit: r.unit ?? undefined,
  category: r.category ?? "",
  item: r.item ?? "",
  amortizationYears: r.amortization_years ?? 10,
  dateCompleted: r.date_completed ?? "",
  cost: Number(r.cost ?? 0),
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const reno2r = (r: Partial<Renovation>, org: string) => ({
  ...(isValidDbId(r.id) ? { id: r.id } : {}),
  organization_id: org,
  building_id: r.buildingId ?? "",
  unit: r.unit ?? null,
  category: r.category ?? null,
  item: r.item ?? null,
  amortization_years: r.amortizationYears ?? 10,
  date_completed: r.dateCompleted || null,
  cost: r.cost ?? 0,
  notes: r.notes ?? null,
});

const contract2c = (r: any): Contract => ({
  id: r.id,
  buildingId: r.building_id,
  type: r.type,
  label: r.label ?? "",
  provider: r.provider ?? undefined,
  policyNumber: r.policy_number ?? undefined,
  startDate: r.start_date ?? undefined,
  renewalDate: r.renewal_date ?? undefined,
  noticePeriodDays: r.notice_period_days ?? 90,
  autoRenew: r.auto_renew ?? true,
  annualAmount: r.annual_amount != null ? Number(r.annual_amount) : undefined,
  currency: r.currency ?? "CHF",
  paymentFrequency: r.payment_frequency ?? "yearly",
  notes: r.notes ?? undefined,
  status: r.status ?? "active",
  documentName: r.document_name ?? undefined,
  documentDataUrl: r.document_data_url ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const contract2r = (c: Partial<Contract>, org: string) => ({
  ...(isValidDbId(c.id) ? { id: c.id } : {}),
  organization_id: org,
  building_id: c.buildingId ?? "",
  type: c.type ?? "autre",
  label: c.label ?? "",
  provider: c.provider ?? null,
  policy_number: c.policyNumber ?? null,
  start_date: c.startDate || null,
  renewal_date: c.renewalDate || null,
  notice_period_days: c.noticePeriodDays ?? 90,
  auto_renew: c.autoRenew ?? true,
  annual_amount: c.annualAmount ?? null,
  currency: c.currency ?? "CHF",
  payment_frequency: c.paymentFrequency ?? "yearly",
  notes: c.notes ?? null,
  status: c.status ?? "active",
  document_name: c.documentName ?? null,
  document_data_url: c.documentDataUrl ?? null,
});

const ba2c = (r: any): BuildingAction => ({
  id: r.id,
  buildingId: r.building_id,
  title: r.title,
  description: r.description ?? undefined,
  priority: r.priority,
  status: r.status,
  dueDate: r.due_date ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const ba2r = (a: Partial<BuildingAction>, org: string) => ({
  ...(isValidDbId(a.id) ? { id: a.id } : {}),
  organization_id: org,
  building_id: a.buildingId ?? "",
  title: a.title ?? "",
  description: a.description ?? null,
  priority: a.priority ?? "medium",
  status: a.status ?? "open",
  due_date: a.dueDate || null,
});

const tn2c = (r: any): TenantNote => ({ id: r.id, tenantId: r.tenant_id, date: r.date, text: r.text });

const td2c = (r: any): TenantDocument => ({
  id: r.id,
  tenantId: r.tenant_id,
  type: r.type,
  fileName: r.file_name,
  fileSize: r.file_size ?? undefined,
  mimeType: r.mime_type ?? undefined,
  createdAt: r.created_at,
  storagePath: r.storage_path ?? undefined,
});

const abs2c = (r: any): TenantAbsence => ({
  id: r.id,
  tenantId: r.tenant_id,
  startDate: r.start_date,
  endDate: r.end_date,
  comment: r.comment ?? undefined,
});

// ──────────────────────────────────────────────────────────────
// Hydration
// ──────────────────────────────────────────────────────────────
const OFFLINE_CACHE_KEY = "palier_offline_cache_v1";
let lastHydrateSource: "supabase" | "offline" | null = null;

export function getLastHydrateSource(): "supabase" | "offline" | null {
  return lastHydrateSource;
}

function persistOfflineSnapshot(): void {
  try {
    const snapshot = {
      savedAt: nowISO(),
      buildings: cache.buildings,
      tenants: cache.tenants,
      notifications: cache.notifications,
      maintenanceRequests: cache.maintenanceRequests,
      rentalApplications: cache.rentalApplications,
      calendarEvents: cache.calendarEvents,
      accountingTransactions: cache.accountingTransactions,
      manualAdjustments: cache.manualAdjustments,
      renovations: cache.renovations,
      contracts: cache.contracts,
      buildingActions: cache.buildingActions,
      tenantNotes: cache.tenantNotes,
      tenantDocuments: cache.tenantDocuments,
      tenantAbsences: cache.tenantAbsences,
      chartEntries: cache.chartEntries,
      accountingSettings: cache.accountingSettings,
      orgRentSettings: cache.orgRentSettings,
    };
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota exceeded or storage disabled — ignore, cache still lives in memory.
  }
}

function loadOfflineSnapshot(): boolean {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    cache.buildings = snap.buildings ?? [];
    cache.tenants = snap.tenants ?? [];
    cache.notifications = snap.notifications ?? [];
    cache.maintenanceRequests = snap.maintenanceRequests ?? [];
    cache.rentalApplications = snap.rentalApplications ?? [];
    cache.calendarEvents = snap.calendarEvents ?? [];
    cache.accountingTransactions = snap.accountingTransactions ?? [];
    cache.manualAdjustments = snap.manualAdjustments ?? [];
    cache.renovations = snap.renovations ?? [];
    cache.contracts = snap.contracts ?? [];
    cache.buildingActions = snap.buildingActions ?? [];
    cache.tenantNotes = snap.tenantNotes ?? [];
    cache.tenantDocuments = snap.tenantDocuments ?? [];
    cache.tenantAbsences = snap.tenantAbsences ?? [];
    cache.chartEntries = snap.chartEntries ?? [];
    cache.accountingSettings = snap.accountingSettings ?? {};
    cache.orgRentSettings = snap.orgRentSettings ?? { ...DEFAULT_ORG_RENT_SETTINGS };
    return true;
  } catch {
    return false;
  }
}

export async function hydrateFromSupabase(): Promise<void> {
  hydrated = false;
  try {
    const [
      { data: buildings },
      { data: tenants },
      { data: notifications },
      { data: maintenance },
      { data: rentalApps },
      { data: calendarEvents },
      { data: txs },
      { data: adjs },
      { data: renos },
      { data: contractsRows },
      { data: actions },
      { data: tenantNotes },
      { data: tenantDocs },
      { data: tenantAbsences },
      { data: accSettings },
      { data: chartEntries },
      { data: orgRow },
    ] = await Promise.all([
      supabase.from("buildings").select("*"),
      supabase.from("tenants").select("*"),
      supabase.from("notifications").select("*"),
      supabase.from("maintenance_requests").select("*"),
      supabase.from("rental_applications").select("*"),
      supabase.from("calendar_events").select("*"),
      supabase.from("accounting_transactions").select("*"),
      supabase.from("manual_adjustments").select("*"),
      supabase.from("renovations").select("*"),
      // `contracts` table was added in 20260424. It might not yet exist
      // on older Supabase instances — swallow 404 so the rest of hydrate
      // still runs rather than failing the whole snapshot.
      supabase.from("contracts").select("*").then(
        (r) => r,
        () => ({ data: [] as any[], error: null }),
      ),
      supabase.from("building_actions").select("*"),
      supabase.from("tenant_notes").select("*"),
      supabase.from("tenant_documents").select("*"),
      supabase.from("tenant_absences").select("*"),
      supabase.from("accounting_settings").select("*"),
      supabase.from("account_chart_entries").select("*"),
      supabase.from("organizations").select("rent_due_day, rent_in_advance").maybeSingle(),
    ]);

    cache.buildings = (buildings ?? []).map(b2c);
    cache.tenants = (tenants ?? []).map(t2c);
    cache.notifications = (notifications ?? []).map(n2c);
    cache.maintenanceRequests = (maintenance ?? []).map(m2c);
    cache.rentalApplications = (rentalApps ?? []).map(ra2c);
    cache.calendarEvents = (calendarEvents ?? []).map(ca2c);
    cache.accountingTransactions = (txs ?? []).map(tx2c);
    cache.manualAdjustments = (adjs ?? []).map(adj2c);
    cache.renovations = (renos ?? []).map(reno2c);
    cache.contracts = (contractsRows ?? []).map(contract2c);
    cache.buildingActions = (actions ?? []).map(ba2c);
    cache.tenantNotes = (tenantNotes ?? []).map(tn2c);
    cache.tenantDocuments = (tenantDocs ?? []).map(td2c);
    cache.tenantAbsences = (tenantAbsences ?? []).map(abs2c);
    cache.accountingSettings = {};
    for (const r of accSettings ?? []) {
      cache.accountingSettings[(r as any).building_id] = {
        units: ((r as any).units as string[]) ?? [],
        categories: ((r as any).categories as string[]) ?? [],
        subCategories: ((r as any).sub_categories as string[]) ?? [],
        unitAssignments: ((r as any).unit_assignments as Record<string, string>) ?? {},
        unitTypes: ((r as any).unit_types as any) ?? {},
      };
    }
    cache.chartEntries = (chartEntries ?? []).map(ce2c);
    cache.orgRentSettings = orgRow
      ? {
          rentDueDay: (orgRow as any).rent_due_day ?? DEFAULT_ORG_RENT_SETTINGS.rentDueDay,
          rentInAdvance: (orgRow as any).rent_in_advance ?? DEFAULT_ORG_RENT_SETTINGS.rentInAdvance,
        }
      : { ...DEFAULT_ORG_RENT_SETTINGS };
    hydrated = true;
    lastHydrateSource = "supabase";
    persistOfflineSnapshot();
  } catch (err) {
    toastError("hydrate", err);
    // Offline fallback — serve the last known snapshot so the app is usable
    // (read-only) without network. Writes will queue in memory and sync the
    // next time Supabase calls succeed.
    const loaded = loadOfflineSnapshot();
    hydrated = true;
    lastHydrateSource = loaded ? "offline" : null;
  }
}

// ──────────────────────────────────────────────────────────────
// Diff helpers (compute what changed between cache and a new list)
// ──────────────────────────────────────────────────────────────
function diffById<T extends { id: string }>(
  prev: T[],
  next: T[],
): { inserted: T[]; updated: T[]; deletedIds: string[] } {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const nextMap = new Map(next.map((x) => [x.id, x]));
  const inserted: T[] = [];
  const updated: T[] = [];
  const deletedIds: string[] = [];
  for (const [id, x] of nextMap) {
    const p = prevMap.get(id);
    if (!p) inserted.push(x);
    else if (JSON.stringify(p) !== JSON.stringify(x)) updated.push(x);
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) deletedIds.push(id);
  }
  return { inserted, updated, deletedIds };
}

async function sync<T extends { id: string }>(
  table: string,
  prev: T[],
  next: T[],
  toRow: (x: T, org: string) => any,
  fromRow: (r: any) => T,
  updateCache: (list: T[]) => void,
) {
  const { inserted, updated, deletedIds } = diffById(prev, next);
  toastInfo(`sync ${table}: +${inserted.length} ~${updated.length} -${deletedIds.length}`);
  if (inserted.length === 0 && updated.length === 0 && deletedIds.length === 0) return;

  try {
    const org = await getOrgId();

    if (inserted.length > 0) {
      const rows = inserted.map((x) => toRow(x, org));
      toastInfo(`insert ${table}: ${JSON.stringify(rows[0])}`);
      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) throw error;
      // Replace temp ids with real ids in cache
      if (data) {
        const tmpIds = inserted.map((x) => x.id).filter((id) => !isValidDbId(id));
        if (tmpIds.length > 0) {
          const inserts = data.map(fromRow);
          const list = [...next];
          for (let i = 0; i < tmpIds.length && i < inserts.length; i++) {
            const idx = list.findIndex((x) => x.id === tmpIds[i]);
            if (idx >= 0) list[idx] = inserts[i];
          }
          updateCache(list);
        }
      }
    }
    for (const u of updated) {
      const { error } = await supabase.from(table).update(toRow(u, org)).eq("id", u.id);
      if (error) throw error;
    }
    if (deletedIds.length > 0) {
      const { error } = await supabase.from(table).delete().in("id", deletedIds);
      if (error) throw error;
    }
  } catch (err) {
    toastError(`sync:${table}`, err);
  }
}

// ──────────────────────────────────────────────────────────────
// Public API (sync) — same signatures as the previous storage
// ──────────────────────────────────────────────────────────────
// Used by components that want to know if initial load is done.
export function isHydrated() {
  return hydrated;
}

// Buildings
export const getBuildings = (): Building[] => cache.buildings;
export const saveBuildings = (next: Building[]) => {
  const prev = cache.buildings;
  // Assign tmp ids to new entries
  next = next.map((x) => ensureId(x));
  cache.buildings = next;
  void sync<Building>("buildings", prev, next, b2r as any, b2c, (list) => (cache.buildings = list));
};

// Tenants
export const getTenants = (): Tenant[] => cache.tenants;
export const saveTenants = (next: Tenant[]) => {
  const prev = cache.tenants;
  next = next.map((x) => ensureId(x));
  cache.tenants = next;
  void sync<Tenant>("tenants", prev, next, t2r as any, t2c, (list) => (cache.tenants = list));
};

// Notifications
export const getNotifications = (): Notification[] => cache.notifications;
export const saveNotifications = (next: Notification[]) => {
  const prev = cache.notifications;
  next = next.map((x) => ensureId(x));
  cache.notifications = next;
  void sync<Notification>("notifications", prev, next, n2r as any, n2c, (list) => (cache.notifications = list));
};
export const addNotification = (
  n: Omit<Notification, "id" | "date" | "read"> & Partial<Pick<Notification, "id" | "date" | "read">>,
): Notification => {
  const newNotif: Notification = {
    id: n.id ?? `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    date: n.date ?? nowISO(),
    read: n.read ?? false,
    title: n.title,
    message: n.message,
    buildingId: n.buildingId,
    recipientId: n.recipientId,
    category: n.category,
  };
  saveNotifications([newNotif, ...cache.notifications]);
  return newNotif;
};

// Maintenance requests
export const getMaintenanceRequests = (): MaintenanceRequest[] => cache.maintenanceRequests;
export const saveMaintenanceRequests = (next: MaintenanceRequest[]) => {
  const prev = cache.maintenanceRequests;
  next = next.map((x) => ensureId(x));
  cache.maintenanceRequests = next;
  void sync<MaintenanceRequest>("maintenance_requests", prev, next, m2r as any, m2c, (list) => (cache.maintenanceRequests = list));
};

// Rental applications
export const getRentalApplications = (): RentalApplication[] => cache.rentalApplications;
export const saveRentalApplications = (next: RentalApplication[]) => {
  const prev = cache.rentalApplications;
  next = next.map((x) => ensureId(x));
  cache.rentalApplications = next;
  void sync<RentalApplication>("rental_applications", prev, next, ra2r as any, ra2c, (list) => (cache.rentalApplications = list));
};
export const addRentalApplication = (
  app: Omit<RentalApplication, "id" | "createdAt" | "updatedAt" | "status">,
) => {
  const newApp: RentalApplication = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    status: "received",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...app,
  };
  saveRentalApplications([newApp, ...cache.rentalApplications]);
  return newApp;
};
export const updateRentalApplication = (updated: RentalApplication) => {
  const next = cache.rentalApplications.map((a) =>
    a.id === updated.id ? { ...updated, updatedAt: nowISO() } : a,
  );
  saveRentalApplications(next);
};
export const deleteRentalApplication = (id: string) => {
  saveRentalApplications(cache.rentalApplications.filter((a) => a.id !== id));
};

// Tenant notes
export const getTenantNotes = (): TenantNote[] => cache.tenantNotes;
export const saveTenantNotes = (next: TenantNote[]) => {
  const prev = cache.tenantNotes;
  next = next.map((x) => ensureId(x));
  cache.tenantNotes = next;
  void (async () => {
    try {
      const org = await getOrgId();
      const { inserted, deletedIds } = diffById(prev, next);
      if (inserted.length > 0) {
        const rows = inserted.map((n) => ({
          ...(isValidDbId(n.id) ? { id: n.id } : {}),
          organization_id: org,
          tenant_id: n.tenantId,
          text: n.text,
          date: n.date,
        }));
        const { data, error } = await supabase.from("tenant_notes").insert(rows).select();
        if (error) throw error;
        if (data) {
          const inserts = data.map(tn2c);
          const list = [...next];
          const tmpIds = inserted.map((n) => n.id).filter((id) => !isValidDbId(id));
          for (let i = 0; i < tmpIds.length && i < inserts.length; i++) {
            const idx = list.findIndex((n) => n.id === tmpIds[i]);
            if (idx >= 0) list[idx] = inserts[i];
          }
          cache.tenantNotes = list;
        }
      }
      if (deletedIds.length > 0) {
        await supabase.from("tenant_notes").delete().in("id", deletedIds);
      }
    } catch (err) {
      toastError("sync:tenant_notes", err);
    }
  })();
};
export const addTenantNote = (tenantId: string, text: string) => {
  const newNote: TenantNote = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    tenantId,
    date: nowISO(),
    text,
  };
  saveTenantNotes([newNote, ...cache.tenantNotes]);
  return newNote;
};

// Tenant documents (metadata — files must go via uploadTenantDocumentFile)
export const getTenantDocuments = (): TenantDocument[] => cache.tenantDocuments;
export const saveTenantDocuments = (next: TenantDocument[]) => {
  const prev = cache.tenantDocuments;
  cache.tenantDocuments = next;
  // Only support delete via this path
  const prevIds = new Set(prev.map((d) => d.id));
  const nextIds = new Set(next.map((d) => d.id));
  const deletedIds = [...prevIds].filter((id) => !nextIds.has(id));
  if (deletedIds.length > 0) {
    void (async () => {
      try {
        const paths = prev.filter((d) => deletedIds.includes(d.id) && d.storagePath).map((d) => d.storagePath!);
        if (paths.length > 0) await supabase.storage.from("tenant-documents").remove(paths);
        await supabase.from("tenant_documents").delete().in("id", deletedIds);
      } catch (err) {
        toastError("sync:tenant_documents (delete)", err);
      }
    })();
  }
};
export const addTenantDocument = (doc: Omit<TenantDocument, "id" | "createdAt">) => {
  // Legacy path: store metadata only (if caller already uploaded or supplied dataUrl)
  const newDoc: TenantDocument = {
    id: `tmp_${Date.now()}`,
    createdAt: nowISO(),
    ...doc,
  };
  cache.tenantDocuments = [newDoc, ...cache.tenantDocuments];
  void (async () => {
    try {
      const org = await getOrgId();
      const { data, error } = await supabase
        .from("tenant_documents")
        .insert({
          organization_id: org,
          tenant_id: doc.tenantId,
          type: doc.type,
          file_name: doc.fileName,
          file_size: doc.fileSize ?? null,
          mime_type: doc.mimeType ?? null,
          storage_path: doc.storagePath ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const inserted = td2c(data);
      cache.tenantDocuments = cache.tenantDocuments.map((d) => (d.id === newDoc.id ? inserted : d));
    } catch (err) {
      toastError("sync:tenant_documents (insert)", err);
    }
  })();
  return newDoc;
};
export const deleteTenantDocument = (id: string) => {
  saveTenantDocuments(cache.tenantDocuments.filter((d) => d.id !== id));
};

// Upload a file to Storage + create the metadata row
export async function uploadTenantDocumentFile(params: {
  tenantId: string;
  file: File;
  type: TenantDocumentType;
}): Promise<TenantDocument> {
  const org = await getOrgId();
  const path = `${org}/${params.tenantId}/${Date.now()}-${params.file.name}`;
  const up = await supabase.storage
    .from("tenant-documents")
    .upload(path, params.file, { cacheControl: "3600", upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await supabase
    .from("tenant_documents")
    .insert({
      organization_id: org,
      tenant_id: params.tenantId,
      type: params.type,
      file_name: params.file.name,
      file_size: params.file.size,
      mime_type: params.file.type,
      storage_path: path,
    })
    .select()
    .single();
  if (error) throw error;
  const doc = td2c(data);
  cache.tenantDocuments = [doc, ...cache.tenantDocuments];
  return doc;
}

export async function getTenantDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("tenant-documents")
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

// Building actions
export const getBuildingActions = (): BuildingAction[] => cache.buildingActions;
export const saveBuildingActions = (next: BuildingAction[]) => {
  const prev = cache.buildingActions;
  next = next.map((x) => ensureId(x));
  cache.buildingActions = next;
  void sync<BuildingAction>("building_actions", prev, next, ba2r as any, ba2c, (list) => (cache.buildingActions = list));
};
export const addBuildingAction = (
  action: Omit<BuildingAction, "id" | "createdAt" | "updatedAt">,
) => {
  const newAction: BuildingAction = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...action,
  };
  saveBuildingActions([newAction, ...cache.buildingActions]);
  return newAction;
};
export const updateBuildingAction = (updated: BuildingAction) => {
  saveBuildingActions(
    cache.buildingActions.map((a) => (a.id === updated.id ? { ...updated, updatedAt: nowISO() } : a)),
  );
};
export const deleteBuildingAction = (id: string) => {
  saveBuildingActions(cache.buildingActions.filter((a) => a.id !== id));
};

// Tenant absences
export const getTenantAbsences = (): TenantAbsence[] => cache.tenantAbsences;
export const saveTenantAbsences = (next: TenantAbsence[]) => {
  const prev = cache.tenantAbsences;
  next = next.map((x) => ensureId(x));
  cache.tenantAbsences = next;
  void (async () => {
    try {
      const org = await getOrgId();
      const { inserted, deletedIds } = diffById(prev, next);
      if (inserted.length > 0) {
        const rows = inserted.map((a) => ({
          ...(isValidDbId(a.id) ? { id: a.id } : {}),
          organization_id: org,
          tenant_id: a.tenantId,
          start_date: a.startDate,
          end_date: a.endDate,
          comment: a.comment ?? null,
        }));
        const { data, error } = await supabase.from("tenant_absences").insert(rows).select();
        if (error) throw error;
        if (data) {
          const inserts = (data as any[]).map(abs2c);
          const list = [...next];
          const tmpIds = inserted.map((a) => a.id).filter((id) => !isValidDbId(id));
          for (let i = 0; i < tmpIds.length && i < inserts.length; i++) {
            const idx = list.findIndex((a) => a.id === tmpIds[i]);
            if (idx >= 0) list[idx] = inserts[i];
          }
          cache.tenantAbsences = list;
        }
      }
      if (deletedIds.length > 0) {
        await supabase.from("tenant_absences").delete().in("id", deletedIds);
      }
    } catch (err) {
      toastError("sync:tenant_absences", err);
    }
  })();
};
export const addTenantAbsence = (absence: Omit<TenantAbsence, "id">) => {
  const newAbsence: TenantAbsence = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    ...absence,
  };
  saveTenantAbsences([...cache.tenantAbsences, newAbsence]);
  return newAbsence;
};

// Calendar events
export const getCalendarEvents = (): CalendarEvent[] => cache.calendarEvents;
export const saveCalendarEvents = (next: CalendarEvent[]) => {
  const prev = cache.calendarEvents;
  next = next.map((x) => ensureId(x));
  cache.calendarEvents = next;
  void sync<CalendarEvent>("calendar_events", prev, next, ca2r as any, ca2c, (list) => (cache.calendarEvents = list));
};
export const addCalendarEvent = (event: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent => {
  const newEvent: CalendarEvent = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowISO(),
    ...event,
  };
  saveCalendarEvents([newEvent, ...cache.calendarEvents]);
  return newEvent;
};
export const deleteCalendarEvent = (id: string) => {
  saveCalendarEvents(cache.calendarEvents.filter((e) => e.id !== id));
};

// Accounting transactions
export const getAccountingTransactions = (buildingId?: string): AccountingTransaction[] => {
  return buildingId
    ? cache.accountingTransactions.filter((t) => t.buildingId === buildingId)
    : cache.accountingTransactions;
};
export const saveAccountingTransactions = (txs: AccountingTransaction[]) => {
  const prev = cache.accountingTransactions;
  const next = txs.map((x) => ensureId(x));
  cache.accountingTransactions = next;
  void sync<AccountingTransaction>("accounting_transactions", prev, next, tx2r as any, tx2c, (list) => (cache.accountingTransactions = list));
};
export const addAccountingTransactions = (txs: Omit<AccountingTransaction, "id">[]): AccountingTransaction[] => {
  const newTxs: AccountingTransaction[] = txs.map((tx, i) => ({
    id: `tmp_${Date.now()}_${i}_${Math.random().toString(16).slice(2, 6)}`,
    ...tx,
  }));
  saveAccountingTransactions([...cache.accountingTransactions, ...newTxs]);
  return newTxs;
};
export const deleteAccountingTransactions = (buildingId: string) => {
  const kept = cache.accountingTransactions.filter((t) => t.buildingId !== buildingId);
  const removed = cache.accountingTransactions.filter((t) => t.buildingId === buildingId);
  cache.accountingTransactions = kept;
  if (removed.length > 0) {
    void (async () => {
      try {
        await supabase.from("accounting_transactions").delete().eq("building_id", buildingId);
      } catch (err) {
        toastError("sync:accounting_transactions (delete)", err);
      }
    })();
  }
};

// Manual adjustments
export const getManualAdjustments = (buildingId?: string): ManualAdjustment[] => {
  return buildingId
    ? cache.manualAdjustments.filter((a) => a.buildingId === buildingId)
    : cache.manualAdjustments;
};
export const saveManualAdjustments = (adjs: ManualAdjustment[]) => {
  const prev = cache.manualAdjustments;
  const next = adjs.map((x) => ensureId(x));
  cache.manualAdjustments = next;
  void sync<ManualAdjustment>("manual_adjustments", prev, next, adj2r as any, adj2c, (list) => (cache.manualAdjustments = list));
};
export const addManualAdjustment = (adj: Omit<ManualAdjustment, "id" | "createdAt">): ManualAdjustment => {
  const newAdj: ManualAdjustment = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowISO(),
    ...adj,
  };
  saveManualAdjustments([...cache.manualAdjustments, newAdj]);
  return newAdj;
};
export const deleteManualAdjustment = (id: string) => {
  saveManualAdjustments(cache.manualAdjustments.filter((a) => a.id !== id));
};

// Chart entries (custom plan comptable per org)
export const getChartEntries = (): ChartEntry[] => cache.chartEntries;
export const saveChartEntries = (entries: ChartEntry[]) => {
  const prev = cache.chartEntries;
  const next = entries.map((x) => ensureId(x));
  cache.chartEntries = next;
  void sync<ChartEntry>("account_chart_entries", prev, next, ce2r as any, ce2c, (list) => (cache.chartEntries = list));
};
export const upsertChartEntry = (
  entry: Omit<ChartEntry, "id" | "createdAt" | "updatedAt"> & Partial<Pick<ChartEntry, "id" | "createdAt" | "updatedAt">>,
): ChartEntry => {
  const now = nowISO();
  const existing = cache.chartEntries.find((e) => e.num === entry.num);
  const next: ChartEntry = {
    id: entry.id ?? existing?.id ?? `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    num: entry.num,
    customLabel: entry.customLabel ?? null,
    type: entry.type,
    buildingIds: entry.buildingIds ?? [],
    disabled: entry.disabled ?? false,
    isCustom: entry.isCustom ?? false,
    createdAt: entry.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
  const list = existing
    ? cache.chartEntries.map((e) => (e.id === existing.id ? next : e))
    : [...cache.chartEntries, next];
  saveChartEntries(list);
  return next;
};
export const deleteChartEntry = (id: string) => {
  saveChartEntries(cache.chartEntries.filter((e) => e.id !== id));
};

// Renovations
export const getRenovations = (buildingId?: string): Renovation[] => {
  return buildingId
    ? cache.renovations.filter((r) => r.buildingId === buildingId)
    : cache.renovations;
};
export const saveRenovations = (renovations: Renovation[]) => {
  const prev = cache.renovations;
  const next = renovations.map((x) => ensureId(x));
  cache.renovations = next;
  void sync<Renovation>("renovations", prev, next, reno2r as any, reno2c, (list) => (cache.renovations = list));
};
export const addRenovation = (reno: Omit<Renovation, "id" | "createdAt">): Renovation => {
  const newReno: Renovation = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowISO(),
    ...reno,
  };
  saveRenovations([newReno, ...cache.renovations]);
  return newReno;
};
export const deleteRenovation = (id: string) => {
  saveRenovations(cache.renovations.filter((r) => r.id !== id));
};

// Contracts (insurance, chauffage, conciergerie, …)
export const getContracts = (buildingId?: string): Contract[] => {
  return buildingId
    ? cache.contracts.filter((c) => c.buildingId === buildingId)
    : cache.contracts;
};
export const saveContracts = (contracts: Contract[]) => {
  const prev = cache.contracts;
  const next = contracts.map((x) => ensureId(x));
  cache.contracts = next;
  void sync<Contract>("contracts", prev, next, contract2r as any, contract2c, (list) => (cache.contracts = list));
};
export const addContract = (contract: Omit<Contract, "id" | "createdAt" | "updatedAt">): Contract => {
  const newContract: Contract = {
    id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...contract,
  };
  saveContracts([newContract, ...cache.contracts]);
  return newContract;
};
export const updateContract = (updated: Contract) => {
  saveContracts(cache.contracts.map((c) => (c.id === updated.id ? { ...updated, updatedAt: nowISO() } : c)));
};
export const deleteContract = (id: string) => {
  saveContracts(cache.contracts.filter((c) => c.id !== id));
};

// Accounting settings
export const getAccountingSettings = (buildingId: string): AccountingSettings => {
  return cache.accountingSettings[buildingId] ?? { units: [], categories: [], subCategories: [] };
};
export const saveAccountingSettings = (buildingId: string, settings: AccountingSettings) => {
  cache.accountingSettings[buildingId] = settings;
  void (async () => {
    try {
      const org = await getOrgId();
      await supabase.from("accounting_settings").upsert(
        {
          organization_id: org,
          building_id: buildingId,
          units: settings.units ?? [],
          categories: settings.categories ?? [],
          sub_categories: settings.subCategories ?? [],
          unit_assignments: settings.unitAssignments ?? {},
          unit_types: settings.unitTypes ?? {},
        },
        { onConflict: "building_id" },
      );
    } catch (err) {
      toastError("sync:accounting_settings", err);
    }
  })();
};

// Organization rent settings (stored on organizations row)
export const getOrgRentSettings = (): OrgRentSettings => cache.orgRentSettings;
export const saveOrgRentSettings = (settings: OrgRentSettings) => {
  cache.orgRentSettings = { ...settings };
  void (async () => {
    try {
      const org = await getOrgId();
      const { error } = await supabase
        .from("organizations")
        .update({
          rent_due_day: settings.rentDueDay,
          rent_in_advance: settings.rentInAdvance,
        })
        .eq("id", org);
      if (error) throw error;
    } catch (err) {
      toastError("sync:org_rent_settings", err);
    }
  })();
};

// Currency helpers (stay in localStorage — personal device pref)
export const getBaseCurrency = (): Currency => cache.baseCurrency;
export const saveBaseCurrency = (c: Currency) => {
  cache.baseCurrency = c;
  localStorage.setItem("palier_baseCurrency", c);
};

export const getExchangeRateCache = (): ExchangeRateCache | null => cache.exchangeRates;
export const saveExchangeRateCache = (c: ExchangeRateCache) => {
  cache.exchangeRates = c;
  localStorage.setItem("palier_exchangeRates", JSON.stringify(c));
};
