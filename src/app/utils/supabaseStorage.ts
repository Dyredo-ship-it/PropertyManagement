// ============================================================
// Supabase storage layer
// Async replacements for the previous localStorage-based storage.ts
// ============================================================
import { supabase } from "../lib/supabase";
import type {
  Building,
  Tenant,
  Notification,
  MaintenanceRequest,
  TenantNote,
  TenantDocument,
  BuildingAction,
  TenantAbsence,
  RentalApplication,
  CalendarEvent,
  AccountingTransaction,
  ManualAdjustment,
  AccountingSettings,
  Renovation,
} from "./storage";

// ------------------------------------------------------------
// Org id resolver
// ------------------------------------------------------------
let cachedOrgId: string | null = null;

export function clearOrgCache() {
  cachedOrgId = null;
}

async function getOrgId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Non authentifié");
  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data?.organization_id) throw new Error("Profil sans organisation");
  cachedOrgId = data.organization_id;
  return cachedOrgId;
}

// ------------------------------------------------------------
// Type mappers: DB row ↔ frontend type
// ------------------------------------------------------------
function buildingFromRow(r: any): Building {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    units: r.units ?? 0,
    occupiedUnits: r.occupied_units ?? 0,
    monthlyRevenue: Number(r.monthly_revenue ?? 0),
    imageUrl: r.image_url ?? undefined,
    currency: r.currency ?? undefined,
  };
}

function buildingToRow(b: Partial<Building>, organizationId: string) {
  return {
    ...(b.id ? { id: b.id } : {}),
    organization_id: organizationId,
    name: b.name ?? "",
    address: b.address ?? "",
    units: b.units ?? 0,
    occupied_units: b.occupiedUnits ?? 0,
    monthly_revenue: b.monthlyRevenue ?? 0,
    image_url: b.imageUrl ?? null,
    currency: b.currency ?? "CHF",
  };
}

function tenantFromRow(r: any): Tenant {
  return {
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
  };
}

function tenantToRow(t: Partial<Tenant>, organizationId: string) {
  return {
    ...(t.id ? { id: t.id } : {}),
    organization_id: organizationId,
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
  };
}

function maintenanceFromRow(r: any): MaintenanceRequest {
  return {
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
  };
}

function maintenanceToRow(m: Partial<MaintenanceRequest>, organizationId: string) {
  return {
    ...(m.id ? { id: m.id } : {}),
    organization_id: organizationId,
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
  };
}

function notificationFromRow(r: any): Notification {
  return {
    id: r.id,
    title: r.title,
    message: r.message ?? "",
    date: r.date,
    read: r.read,
    buildingId: r.building_id ?? undefined,
    recipientId: r.recipient_id ?? undefined,
    category: r.category ?? undefined,
  };
}

function notificationToRow(n: Partial<Notification>, organizationId: string) {
  return {
    ...(n.id ? { id: n.id } : {}),
    organization_id: organizationId,
    building_id: n.buildingId || null,
    recipient_id: n.recipientId || null,
    title: n.title ?? "",
    message: n.message ?? null,
    category: n.category ?? "general",
    read: n.read ?? false,
    date: n.date ?? new Date().toISOString(),
  };
}

function rentalAppFromRow(r: any): RentalApplication {
  return {
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
  };
}

function rentalAppToRow(a: Partial<RentalApplication>, organizationId: string) {
  return {
    ...(a.id ? { id: a.id } : {}),
    organization_id: organizationId,
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
  };
}

function calendarFromRow(r: any): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    startTime: r.start_time ?? "",
    endTime: r.end_time ?? undefined,
    type: r.type,
    buildingId: r.building_id ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

function calendarToRow(e: Partial<CalendarEvent>, organizationId: string) {
  return {
    ...(e.id ? { id: e.id } : {}),
    organization_id: organizationId,
    building_id: e.buildingId || null,
    title: e.title ?? "",
    date: e.date ?? "",
    start_time: e.startTime ?? null,
    end_time: e.endTime ?? null,
    type: e.type ?? "other",
    notes: e.notes ?? null,
  };
}

function txFromRow(r: any): AccountingTransaction {
  return {
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
  };
}

function txToRow(t: Partial<AccountingTransaction>, organizationId: string) {
  return {
    ...(t.id ? { id: t.id } : {}),
    organization_id: organizationId,
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
  };
}

function adjFromRow(r: any): ManualAdjustment {
  return {
    id: r.id,
    buildingId: r.building_id,
    accountNumber: r.account_number,
    label: r.label,
    amount: Number(r.amount),
    type: r.type,
    createdAt: r.created_at,
  };
}

function adjToRow(a: Partial<ManualAdjustment>, organizationId: string) {
  return {
    ...(a.id ? { id: a.id } : {}),
    organization_id: organizationId,
    building_id: a.buildingId ?? "",
    account_number: a.accountNumber ?? 0,
    label: a.label ?? "",
    amount: a.amount ?? 0,
    type: a.type ?? "debit",
  };
}

function renoFromRow(r: any): Renovation {
  return {
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
  };
}

function renoToRow(r: Partial<Renovation>, organizationId: string) {
  return {
    ...(r.id ? { id: r.id } : {}),
    organization_id: organizationId,
    building_id: r.buildingId ?? "",
    unit: r.unit ?? null,
    category: r.category ?? null,
    item: r.item ?? null,
    amortization_years: r.amortizationYears ?? 10,
    date_completed: r.dateCompleted || null,
    cost: r.cost ?? 0,
    notes: r.notes ?? null,
  };
}

function actionFromRow(r: any): BuildingAction {
  return {
    id: r.id,
    buildingId: r.building_id,
    title: r.title,
    description: r.description ?? undefined,
    priority: r.priority,
    status: r.status,
    dueDate: r.due_date ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function actionToRow(a: Partial<BuildingAction>, organizationId: string) {
  return {
    ...(a.id ? { id: a.id } : {}),
    organization_id: organizationId,
    building_id: a.buildingId ?? "",
    title: a.title ?? "",
    description: a.description ?? null,
    priority: a.priority ?? "medium",
    status: a.status ?? "open",
    due_date: a.dueDate || null,
  };
}

function tenantNoteFromRow(r: any): TenantNote {
  return { id: r.id, tenantId: r.tenant_id, date: r.date, text: r.text };
}

function tenantDocFromRow(r: any): TenantDocument {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    type: r.type,
    fileName: r.file_name,
    fileSize: r.file_size ?? undefined,
    mimeType: r.mime_type ?? undefined,
    createdAt: r.created_at,
    dataUrl: r.storage_path ?? undefined, // will be replaced by Storage URL on read
  };
}

function absenceFromRow(r: any): TenantAbsence {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    startDate: r.start_date,
    endDate: r.end_date,
    comment: r.comment ?? undefined,
  };
}

// ------------------------------------------------------------
// Buildings
// ------------------------------------------------------------
export async function getBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(buildingFromRow);
}

export async function createBuilding(b: Omit<Building, "id">): Promise<Building> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("buildings")
    .insert(buildingToRow(b, orgId))
    .select()
    .single();
  if (error) throw error;
  return buildingFromRow(data);
}

export async function updateBuilding(b: Building): Promise<void> {
  const orgId = await getOrgId();
  const row = buildingToRow(b, orgId);
  const { error } = await supabase.from("buildings").update(row).eq("id", b.id);
  if (error) throw error;
}

export async function deleteBuilding(id: string): Promise<void> {
  const { error } = await supabase.from("buildings").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Tenants
// ------------------------------------------------------------
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(tenantFromRow);
}

export async function createTenant(t: Omit<Tenant, "id">): Promise<Tenant> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("tenants")
    .insert(tenantToRow(t, orgId))
    .select()
    .single();
  if (error) throw error;
  return tenantFromRow(data);
}

export async function updateTenant(t: Tenant): Promise<void> {
  const orgId = await getOrgId();
  const { error } = await supabase.from("tenants").update(tenantToRow(t, orgId)).eq("id", t.id);
  if (error) throw error;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Maintenance requests
// ------------------------------------------------------------
export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(maintenanceFromRow);
}

export async function createMaintenanceRequest(
  m: Omit<MaintenanceRequest, "id" | "createdAt" | "updatedAt">,
): Promise<MaintenanceRequest> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert(maintenanceToRow(m as any, orgId))
    .select()
    .single();
  if (error) throw error;
  return maintenanceFromRow(data);
}

export async function updateMaintenanceRequest(m: MaintenanceRequest): Promise<void> {
  const orgId = await getOrgId();
  const { error } = await supabase
    .from("maintenance_requests")
    .update(maintenanceToRow(m, orgId))
    .eq("id", m.id);
  if (error) throw error;
}

export async function deleteMaintenanceRequest(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_requests").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Notifications
// ------------------------------------------------------------
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(notificationFromRow);
}

export async function createNotification(n: Omit<Notification, "id">): Promise<Notification> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("notifications")
    .insert(notificationToRow(n, orgId))
    .select()
    .single();
  if (error) throw error;
  return notificationFromRow(data);
}

export async function markNotificationRead(id: string, read: boolean = true): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read }).eq("id", id);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Rental applications
// ------------------------------------------------------------
export async function getRentalApplications(): Promise<RentalApplication[]> {
  const { data, error } = await supabase
    .from("rental_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rentalAppFromRow);
}

export async function createRentalApplication(
  a: Omit<RentalApplication, "id" | "createdAt" | "updatedAt" | "status">,
): Promise<RentalApplication> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("rental_applications")
    .insert(rentalAppToRow({ ...a, status: "received" } as any, orgId))
    .select()
    .single();
  if (error) throw error;
  return rentalAppFromRow(data);
}

export async function updateRentalApplication(a: RentalApplication): Promise<void> {
  const orgId = await getOrgId();
  const { error } = await supabase
    .from("rental_applications")
    .update(rentalAppToRow(a, orgId))
    .eq("id", a.id);
  if (error) throw error;
}

export async function deleteRentalApplication(id: string): Promise<void> {
  const { error } = await supabase.from("rental_applications").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Calendar events
// ------------------------------------------------------------
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(calendarFromRow);
}

export async function createCalendarEvent(
  e: Omit<CalendarEvent, "id" | "createdAt">,
): Promise<CalendarEvent> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(calendarToRow(e as any, orgId))
    .select()
    .single();
  if (error) throw error;
  return calendarFromRow(data);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Accounting transactions
// ------------------------------------------------------------
export async function getAccountingTransactions(
  buildingId?: string,
): Promise<AccountingTransaction[]> {
  let q = supabase.from("accounting_transactions").select("*").order("date_invoice", { ascending: true });
  if (buildingId) q = q.eq("building_id", buildingId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(txFromRow);
}

export async function addAccountingTransactions(
  txs: Omit<AccountingTransaction, "id">[],
): Promise<AccountingTransaction[]> {
  const orgId = await getOrgId();
  if (txs.length === 0) return [];
  const rows = txs.map((t) => txToRow(t as any, orgId));
  const { data, error } = await supabase
    .from("accounting_transactions")
    .insert(rows)
    .select();
  if (error) throw error;
  return (data ?? []).map(txFromRow);
}

export async function deleteAccountingTransactions(buildingId: string): Promise<void> {
  const { error } = await supabase
    .from("accounting_transactions")
    .delete()
    .eq("building_id", buildingId);
  if (error) throw error;
}

// ------------------------------------------------------------
// Manual adjustments
// ------------------------------------------------------------
export async function getManualAdjustments(buildingId?: string): Promise<ManualAdjustment[]> {
  let q = supabase.from("manual_adjustments").select("*");
  if (buildingId) q = q.eq("building_id", buildingId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(adjFromRow);
}

export async function addManualAdjustment(
  adj: Omit<ManualAdjustment, "id" | "createdAt">,
): Promise<ManualAdjustment> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("manual_adjustments")
    .insert(adjToRow(adj as any, orgId))
    .select()
    .single();
  if (error) throw error;
  return adjFromRow(data);
}

export async function deleteManualAdjustment(id: string): Promise<void> {
  const { error } = await supabase.from("manual_adjustments").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Accounting settings (one per building, upsert)
// ------------------------------------------------------------
export async function getAccountingSettings(buildingId: string): Promise<AccountingSettings> {
  const { data, error } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("building_id", buildingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { units: [], categories: [], subCategories: [] };
  return {
    units: (data.units as string[]) ?? [],
    categories: (data.categories as string[]) ?? [],
    subCategories: (data.sub_categories as string[]) ?? [],
    unitAssignments: (data.unit_assignments as Record<string, string>) ?? {},
    unitTypes: (data.unit_types as any) ?? {},
  };
}

export async function saveAccountingSettings(
  buildingId: string,
  settings: AccountingSettings,
): Promise<void> {
  const orgId = await getOrgId();
  const payload = {
    organization_id: orgId,
    building_id: buildingId,
    units: settings.units ?? [],
    categories: settings.categories ?? [],
    sub_categories: settings.subCategories ?? [],
    unit_assignments: settings.unitAssignments ?? {},
    unit_types: settings.unitTypes ?? {},
  };
  const { error } = await supabase
    .from("accounting_settings")
    .upsert(payload, { onConflict: "building_id" });
  if (error) throw error;
}

// ------------------------------------------------------------
// Renovations
// ------------------------------------------------------------
export async function getRenovations(buildingId?: string): Promise<Renovation[]> {
  let q = supabase.from("renovations").select("*").order("date_completed", { ascending: false });
  if (buildingId) q = q.eq("building_id", buildingId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(renoFromRow);
}

export async function addRenovation(
  r: Omit<Renovation, "id" | "createdAt">,
): Promise<Renovation> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("renovations")
    .insert(renoToRow(r as any, orgId))
    .select()
    .single();
  if (error) throw error;
  return renoFromRow(data);
}

export async function deleteRenovation(id: string): Promise<void> {
  const { error } = await supabase.from("renovations").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Building actions
// ------------------------------------------------------------
export async function getBuildingActions(): Promise<BuildingAction[]> {
  const { data, error } = await supabase
    .from("building_actions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(actionFromRow);
}

export async function createBuildingAction(
  a: Omit<BuildingAction, "id" | "createdAt" | "updatedAt">,
): Promise<BuildingAction> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("building_actions")
    .insert(actionToRow(a as any, orgId))
    .select()
    .single();
  if (error) throw error;
  return actionFromRow(data);
}

export async function updateBuildingAction(a: BuildingAction): Promise<void> {
  const orgId = await getOrgId();
  const { error } = await supabase
    .from("building_actions")
    .update(actionToRow(a, orgId))
    .eq("id", a.id);
  if (error) throw error;
}

export async function deleteBuildingAction(id: string): Promise<void> {
  const { error } = await supabase.from("building_actions").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Tenant notes
// ------------------------------------------------------------
export async function getTenantNotes(tenantId?: string): Promise<TenantNote[]> {
  let q = supabase.from("tenant_notes").select("*").order("date", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(tenantNoteFromRow);
}

export async function addTenantNote(tenantId: string, text: string): Promise<TenantNote> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("tenant_notes")
    .insert({ organization_id: orgId, tenant_id: tenantId, text })
    .select()
    .single();
  if (error) throw error;
  return tenantNoteFromRow(data);
}

export async function deleteTenantNote(id: string): Promise<void> {
  const { error } = await supabase.from("tenant_notes").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Tenant documents (metadata + file in Storage)
// ------------------------------------------------------------
export async function getTenantDocuments(tenantId?: string): Promise<TenantDocument[]> {
  let q = supabase
    .from("tenant_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(tenantDocFromRow);
}

export async function uploadTenantDocument(params: {
  tenantId: string;
  file: File;
  type: string;
}): Promise<TenantDocument> {
  const orgId = await getOrgId();
  const path = `${orgId}/${params.tenantId}/${Date.now()}-${params.file.name}`;
  const { error: upErr } = await supabase.storage
    .from("tenant-documents")
    .upload(path, params.file, { cacheControl: "3600", upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("tenant_documents")
    .insert({
      organization_id: orgId,
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
  return tenantDocFromRow(data);
}

export async function getTenantDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("tenant-documents")
    .createSignedUrl(storagePath, 60 * 10); // 10 min
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTenantDocument(id: string): Promise<void> {
  // Best effort: remove Storage object too
  const { data: row } = await supabase
    .from("tenant_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.storage_path) {
    await supabase.storage.from("tenant-documents").remove([row.storage_path]);
  }
  const { error } = await supabase.from("tenant_documents").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Tenant absences
// ------------------------------------------------------------
export async function getTenantAbsences(tenantId?: string): Promise<TenantAbsence[]> {
  let q = supabase.from("tenant_absences").select("*").order("start_date", { ascending: true });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(absenceFromRow);
}

export async function addTenantAbsence(absence: Omit<TenantAbsence, "id">): Promise<TenantAbsence> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("tenant_absences")
    .insert({
      organization_id: orgId,
      tenant_id: absence.tenantId,
      start_date: absence.startDate,
      end_date: absence.endDate,
      comment: absence.comment ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return absenceFromRow(data);
}

export async function deleteTenantAbsence(id: string): Promise<void> {
  const { error } = await supabase.from("tenant_absences").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Subscription
// ------------------------------------------------------------
export type SubscriptionRow = {
  plan: "starter" | "pro" | "business";
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean;
};

export async function getSubscription(): Promise<SubscriptionRow | null> {
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,stripe_customer_id,stripe_subscription_id,cancel_at_period_end")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow) ?? null;
}
