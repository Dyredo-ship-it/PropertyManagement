// Thin wrapper around the rent_invoices Supabase table. We insert a row
// every time a rent receipt PDF with a QR-bill is generated, and update
// it to "paid" when a matching CAMT.054 transaction is imported.

import { supabase } from "./supabase";

export interface RentInvoice {
  id: string;
  tenantId?: string;
  buildingId?: string;
  month: string;
  reference: string;
  amount: number;
  currency: string;
  iban: string;
  status: "issued" | "paid" | "cancelled";
  paidAmount?: number | null;
  paidAt?: string | null;
  camtTxId?: string | null;
  createdAt: string;
}

export async function recordRentInvoice(params: {
  tenantId?: string;
  buildingId?: string;
  month: string;
  reference: string;
  amount: number;
  currency: string;
  iban: string;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return;
  // Resolve the caller's organization_id via their profile (single-source
  // of truth — the table's RLS policy enforces this).
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile?.organization_id) return;

  await supabase.from("rent_invoices").upsert(
    {
      organization_id: profile.organization_id,
      tenant_id: params.tenantId ?? null,
      building_id: params.buildingId ?? null,
      month: params.month,
      reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      iban: params.iban,
      status: "issued",
    },
    { onConflict: "organization_id,reference" },
  );
}

export async function findRentInvoicesByReferences(
  references: string[],
): Promise<RentInvoice[]> {
  if (references.length === 0) return [];
  const { data, error } = await supabase
    .from("rent_invoices")
    .select("id, tenant_id, building_id, month, reference, amount, currency, iban, status, paid_amount, paid_at, camt_tx_id, created_at")
    .in("reference", references);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id ?? undefined,
    buildingId: r.building_id ?? undefined,
    month: r.month,
    reference: r.reference,
    amount: Number(r.amount),
    currency: r.currency,
    iban: r.iban,
    status: r.status,
    paidAmount: r.paid_amount != null ? Number(r.paid_amount) : null,
    paidAt: r.paid_at,
    camtTxId: r.camt_tx_id,
    createdAt: r.created_at,
  }));
}

export async function markRentInvoicePaid(params: {
  id: string;
  paidAmount: number;
  paidAt: string;
  camtTxId?: string;
}): Promise<void> {
  await supabase
    .from("rent_invoices")
    .update({
      status: "paid",
      paid_amount: params.paidAmount,
      paid_at: params.paidAt,
      camt_tx_id: params.camtTxId ?? null,
    })
    .eq("id", params.id);
}
