import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Building, Tenant } from "../utils/storage";
import { renderQRBillPng } from "./qrBill";
import { recordRentInvoice } from "./rentInvoices";

/* ─── Types ────────────────────────────────────────────────────── */

export interface LandlordInfo {
  name: string;
  address?: string;
  email?: string;
  vatId?: string;
  iban?: string; // Swiss IBAN or QR-IBAN for QR-bill generation.
}

export interface RentReceiptOptions {
  /** ISO date "YYYY-MM" e.g. "2026-04" */
  period: string;
  amount: number;
  currency?: string;
  /** Optional issue date. Defaults to today. */
  issuedOn?: string;
  /** Optional PNG data URL of the bailleur's signature to embed above the signature line. */
  signatureDataUrl?: string;
}

export interface MonthlyStatementRow {
  tenantName: string;
  unit: string;
  rentNet: number;
  charges: number;
  paid: boolean;
}

export interface MonthlyStatementOptions {
  period: string; // "YYYY-MM"
  rows: MonthlyStatementRow[];
  currency?: string;
}

/* ─── Helpers ──────────────────────────────────────────────────── */

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${FR_MONTHS[monthIdx]} ${y}`;
}

function formatToday(): string {
  return new Date().toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(value: number, currency = "CHF"): string {
  return `${currency} ${value.toLocaleString("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function header(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 20, 22);
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(20, 27, 190, 27);
}

function block(doc: jsPDF, title: string, lines: string[], x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(title.toUpperCase(), x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(20);
  lines.forEach((line, i) => {
    doc.text(line, x, y + 6 + i * 5);
  });
}

function footer(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Document généré par Palier — palier.ch", 20, h - 10);
}

function safeFileName(parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join("_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-");
}

// Save the PDF, and on mobile devices that support the Web Share API
// with files, offer a native share sheet (email, WhatsApp, AirDrop, …)
// in addition. Falls back silently to plain download on desktop or
// browsers without file sharing.
async function savePdfWithShare(doc: jsPDF, filename: string): Promise<void> {
  const fullName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const blob = doc.output("blob");

  try {
    const file = new File([blob], fullName, { type: "application/pdf" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
    };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fullName });
      return;
    }
  } catch {
    // User cancelled or sharing failed — fall through to download.
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fullName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Lease (bail) ─────────────────────────────────────────────── */

export async function generateLeasePdf(
  tenant: Tenant,
  building: Building,
  landlord: LandlordInfo,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  header(doc, "Contrat de bail à loyer");

  block(
    doc,
    "Bailleur",
    [
      landlord.name || "—",
      landlord.address || "",
      landlord.email || "",
      landlord.vatId ? `TVA : ${landlord.vatId}` : "",
    ].filter(Boolean),
    20,
    40,
  );

  block(
    doc,
    "Locataire",
    [tenant.name || "—", tenant.email || "", tenant.phone || ""].filter(Boolean),
    115,
    40,
  );

  block(
    doc,
    "Logement",
    [
      building.name,
      building.address,
      tenant.unit ? `Unité : ${tenant.unit}` : "",
    ].filter(Boolean),
    20,
    80,
  );

  block(
    doc,
    "Durée du bail",
    [
      tenant.leaseStart ? `Début : ${tenant.leaseStart}` : "Début : à définir",
      tenant.leaseEnd ? `Fin : ${tenant.leaseEnd}` : "Fin : indéterminée",
    ],
    115,
    80,
  );

  autoTable(doc, {
    startY: 115,
    head: [["Désignation", "Montant mensuel"]],
    body: [
      ["Loyer net", formatAmount(tenant.rentNet ?? 0, building.currency)],
      ["Charges", formatAmount(tenant.charges ?? 0, building.currency)],
      [
        { content: "Total mensuel", styles: { fontStyle: "bold" } },
        {
          content: formatAmount(
            (tenant.rentNet ?? 0) + (tenant.charges ?? 0),
            building.currency,
          ),
          styles: { fontStyle: "bold" },
        },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241], halign: "left" },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // Signatures block
  const finalY = (doc as any).lastAutoTable?.finalY ?? 150;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    "Lieu et date : ____________________________________________",
    20,
    finalY + 25,
  );

  doc.text("Signature du bailleur", 20, finalY + 55);
  doc.line(20, finalY + 65, 90, finalY + 65);

  doc.text("Signature du locataire", 115, finalY + 55);
  doc.line(115, finalY + 65, 185, finalY + 65);

  footer(doc);
  await savePdfWithShare(doc, `${safeFileName(["bail", tenant.name, building.name])}.pdf`);
}

/* ─── Rent receipt (quittance de loyer) ────────────────────────── */

export async function generateRentReceiptPdf(
  tenant: Tenant,
  building: Building,
  landlord: LandlordInfo,
  options: RentReceiptOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  header(doc, "Quittance de loyer");

  block(
    doc,
    "Bailleur",
    [landlord.name || "—", landlord.address || "", landlord.email || ""].filter(
      Boolean,
    ),
    20,
    40,
  );

  block(
    doc,
    "Locataire",
    [tenant.name || "—", tenant.email || ""].filter(Boolean),
    115,
    40,
  );

  block(
    doc,
    "Logement",
    [
      building.name,
      building.address,
      tenant.unit ? `Unité : ${tenant.unit}` : "",
    ].filter(Boolean),
    20,
    75,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(20);
  const text = `Le bailleur reconnaît avoir reçu de M./Mme ${tenant.name || "—"} la somme de ${formatAmount(
    options.amount,
    options.currency ?? building.currency,
  )} pour le loyer du mois de ${formatPeriod(options.period)}.`;
  const wrapped = doc.splitTextToSize(text, 170);
  doc.text(wrapped, 20, 110);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(
    formatAmount(options.amount, options.currency ?? building.currency),
    20,
    140,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Émis le ${options.issuedOn ?? formatToday()}`, 20, 150);

  doc.text("Signature du bailleur", 115, 175);
  if (options.signatureDataUrl) {
    try {
      // Embed the signature PNG just above the signature line.
      // Target box: 70mm wide x ~18mm tall, positioned on the line area.
      doc.addImage(options.signatureDataUrl, "PNG", 115, 167, 70, 18);
    } catch {
      // Silently ignore if jsPDF can't decode the image.
    }
  }
  doc.line(115, 185, 185, 185);

  footer(doc);

  // ── Swiss QR-bill at the bottom of the page (210x105mm) ───
  // Only rendered when the landlord has an IBAN configured; otherwise
  // we leave the quittance as-is so the PDF still renders end-to-end.
  if (landlord.iban && landlord.iban.trim().length > 0) {
    try {
      const { zip, city, street } = parseSwissAddress(landlord.address ?? "");
      const currency = (options.currency ?? building.currency ?? "CHF") as "CHF" | "EUR";
      const qr = await renderQRBillPng({
        creditor: {
          name: landlord.name || "Bailleur",
          address: street || "-",
          zip: zip || "0000",
          city: city || "—",
          iban: landlord.iban,
        },
        debtor: tenant.name
          ? {
              name: tenant.name,
              address: building.address || undefined,
              zip: undefined,
              city: undefined,
            }
          : undefined,
        amount: options.amount,
        currency,
        message: `Loyer ${formatPeriod(options.period)} — ${building.name}${tenant.unit ? ` / ${tenant.unit}` : ""}`,
        referenceSeed: `${tenant.id || ""}${options.period.replace(/\D/g, "")}`,
      });
      // QR-bill payment part is 210mm wide × 105mm tall, anchored to the bottom of A4.
      doc.addImage(qr.png, "PNG", 0, 297 - 105, 210, 105);

      // Persist the issuance so a later CAMT.054 import can match the
      // incoming payment back to this tenant/month. Fire-and-forget —
      // a DB failure shouldn't block the PDF download.
      void recordRentInvoice({
        tenantId: tenant.id,
        buildingId: building.id,
        month: options.period,
        reference: qr.reference,
        amount: options.amount,
        currency,
        iban: landlord.iban,
      });
    } catch {
      // QR-bill failed (invalid IBAN, unexpected error) — continue
      // without blocking the rent receipt generation.
    }
  }

  await savePdfWithShare(
    doc,
    `${safeFileName(["quittance", options.period, tenant.name])}.pdf`,
  );
}

// Parse a free-form Swiss address like "Rue de la Gare 12, 1003 Lausanne"
// into street / zip / city. Falls back to empty pieces when regex misses,
// so QR-bill generation still gets a best-effort.
function parseSwissAddress(raw: string): { street: string; zip: string; city: string } {
  if (!raw) return { street: "", zip: "", city: "" };
  // Match "...street..., NNNN City" or "...street... NNNN City".
  const m = raw.match(/^(.+?)[,\s]+(\d{4})\s+(.+)$/);
  if (m) return { street: m[1].trim().replace(/,$/, ""), zip: m[2], city: m[3].trim() };
  // Fallback: split on comma; treat last segment as city if it contains digits, else as city without zip.
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const zipCity = last.match(/(\d{4})\s+(.+)/);
    if (zipCity) {
      return { street: parts.slice(0, -1).join(", "), zip: zipCity[1], city: zipCity[2].trim() };
    }
    return { street: parts.slice(0, -1).join(", "), zip: "", city: last };
  }
  return { street: raw.trim(), zip: "", city: "" };
}

/* ─── Monthly statement (décompte mensuel) ─────────────────────── */

export async function generateMonthlyStatementPdf(
  building: Building,
  landlord: LandlordInfo,
  options: MonthlyStatementOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const currency = options.currency ?? building.currency ?? "CHF";

  header(doc, `Décompte mensuel — ${formatPeriod(options.period)}`);

  block(
    doc,
    "Bâtiment",
    [building.name, building.address],
    20,
    40,
  );

  block(
    doc,
    "Bailleur",
    [landlord.name || "—", landlord.address || ""].filter(Boolean),
    115,
    40,
  );

  const totalRent = options.rows.reduce((s, r) => s + (r.rentNet ?? 0), 0);
  const totalCharges = options.rows.reduce((s, r) => s + (r.charges ?? 0), 0);
  const totalReceived = options.rows
    .filter((r) => r.paid)
    .reduce((s, r) => s + (r.rentNet ?? 0) + (r.charges ?? 0), 0);
  const totalDue = options.rows
    .filter((r) => !r.paid)
    .reduce((s, r) => s + (r.rentNet ?? 0) + (r.charges ?? 0), 0);

  autoTable(doc, {
    startY: 75,
    head: [["Locataire", "Unité", "Loyer net", "Charges", "Statut"]],
    body: options.rows.map((r) => [
      r.tenantName,
      r.unit || "—",
      formatAmount(r.rentNet ?? 0, currency),
      formatAmount(r.charges ?? 0, currency),
      r.paid ? "Payé" : "En attente",
    ]),
    foot: [
      [
        { content: "Total", colSpan: 2, styles: { fontStyle: "bold" } },
        { content: formatAmount(totalRent, currency), styles: { fontStyle: "bold" } },
        { content: formatAmount(totalCharges, currency), styles: { fontStyle: "bold" } },
        "",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241], halign: "left" },
    footStyles: { fillColor: [243, 244, 246], textColor: 20 },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 150;

  // Summary
  autoTable(doc, {
    startY: finalY + 8,
    body: [
      ["Total attendu", formatAmount(totalRent + totalCharges, currency)],
      ["Total encaissé", formatAmount(totalReceived, currency)],
      [
        { content: "Total impayé", styles: { fontStyle: "bold" } },
        {
          content: formatAmount(totalDue, currency),
          styles: { fontStyle: "bold", textColor: totalDue > 0 ? [185, 28, 28] : 20 },
        },
      ],
    ],
    theme: "plain",
    styles: { fontSize: 11, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { halign: "right" } },
    tableWidth: 130,
    margin: { left: 20 },
  });

  footer(doc);
  await savePdfWithShare(
    doc,
    `${safeFileName(["decompte", options.period, building.name])}.pdf`,
  );
}

/* ─── Décompte de charges (per-tenant apportionment) ───────────── */

export interface ChargesStatementRow {
  tenantName: string;
  unit: string;
  m2: number;
  pctShare: number;         // 0..1
  periodFrom: string;        // YYYY-MM-DD
  periodTo: string;          // YYYY-MM-DD
  daysOccupied: number;
  proRata: number;           // 0..1
  acomptesPaid: number;
  amountDue: number;
  difference: number;
}

export interface ChargesStatementOptions {
  periodStart: string;       // ISO YYYY-MM-DD
  periodEnd: string;          // ISO YYYY-MM-DD
  periodDays: number;
  acomptesTotal: number;
  chargeExpenses: number;
  solde: number;
  rows: ChargesStatementRow[];
  currency?: string;
}

export async function generateChargesStatementPdf(
  building: Building,
  landlord: LandlordInfo,
  options: ChargesStatementOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const currency = options.currency ?? building.currency ?? "CHF";
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH");

  header(doc, `Décompte de charges — ${building.name}`);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    `Période : ${fmtDate(options.periodStart)} → ${fmtDate(options.periodEnd)} (${options.periodDays} jours)`,
    20, 34,
  );
  doc.text(`Propriétaire : ${landlord.name || "—"}`, 20, 40);
  doc.text(`Adresse : ${building.address}`, 20, 46);

  autoTable(doc, {
    startY: 55,
    head: [[
      "Locataire", "Unité", "m²", "% m²",
      "Occupation", "Jours", "Pro-rata",
      "Acomptes (CHF)", "Dû (CHF)", "Différence (CHF)",
    ]],
    body: options.rows.map((r) => [
      r.tenantName,
      r.unit || "—",
      String(r.m2),
      `${(r.pctShare * 100).toFixed(2)}%`,
      r.daysOccupied > 0 ? `${fmtDate(r.periodFrom)} → ${fmtDate(r.periodTo)}` : "—",
      String(r.daysOccupied),
      `${(r.proRata * 100).toFixed(2)}%`,
      formatAmount(r.acomptesPaid, currency),
      formatAmount(r.amountDue, currency),
      { content: `${r.difference >= 0 ? "+" : ""}${formatAmount(r.difference, currency)}`,
        styles: { textColor: r.difference >= 0 ? [22, 163, 74] : [220, 38, 38], fontStyle: "bold" } },
    ]),
    foot: [[
      { content: "TOTAL", colSpan: 7, styles: { fontStyle: "bold" } },
      { content: formatAmount(options.acomptesTotal, currency), styles: { fontStyle: "bold" } },
      { content: formatAmount(options.chargeExpenses, currency), styles: { fontStyle: "bold" } },
      {
        content: `${options.solde >= 0 ? "+" : ""}${formatAmount(options.solde, currency)}`,
        styles: {
          fontStyle: "bold",
          textColor: options.solde >= 0 ? [22, 163, 74] : [220, 38, 38],
        },
      },
    ]],
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241], halign: "left", fontSize: 9 },
    footStyles: { fillColor: [243, 244, 246], textColor: 20, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 150;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Pro-rata = jours d'occupation ÷ jours de la période. Différence positive = acomptes > charges dues (remboursement au locataire).",
    20, finalY + 8, { maxWidth: 257 },
  );

  footer(doc);
  await savePdfWithShare(
    doc,
    `${safeFileName(["decompte-charges", options.periodStart, options.periodEnd, building.name])}.pdf`,
  );
}


/* ─── Rapport propriétaire (quarterly / annual portfolio summary) ─ */

export interface OwnerReportBuildingRow {
  name: string;
  address: string;
  units: number;
  occupiedUnits: number;
  revenueYtd: number;
  expensesYtd: number;
  netIncomeYtd: number;
}

export interface OwnerReportTenantRow {
  tenantName: string;
  buildingName: string;
  unit: string;
  rentNet: number;
  charges: number;
  status: "paid" | "paid-late" | "overdue" | "unpaid";
}

export interface OwnerReportOptions {
  ownerName: string;
  ownerEmail?: string;
  ownerAddress?: string;
  year: number;
  generatedOn: string;       // ISO date
  portfolio: {
    buildingCount: number;
    tenantCount: number;
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    revenueYtd: number;
    expensesYtd: number;
    netIncomeYtd: number;
    netMarginYtd: number;
    nominalMonthlyRevenue: number;
    overdueCount: number;
    overdueAmount: number;
  };
  buildings: OwnerReportBuildingRow[];
  tenants: OwnerReportTenantRow[];
  currency?: string;
}

const STATUS_LABEL: Record<OwnerReportTenantRow["status"], string> = {
  paid: "Payé",
  "paid-late": "Payé en retard",
  overdue: "Impayé",
  unpaid: "En cours",
};

export async function generateOwnerReportPdf(
  options: OwnerReportOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const currency = options.currency ?? "CHF";
  const fmt = (v: number) => formatAmount(v, currency);

  header(doc, `Rapport propriétaire — ${options.year}`);

  // Owner + metadata block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text(options.ownerName, 20, 34);
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (options.ownerAddress) {
    doc.text(options.ownerAddress, 20, 39);
  }
  if (options.ownerEmail) {
    doc.text(options.ownerEmail, 20, 44);
  }
  const genLabel = `Édité le ${new Date(options.generatedOn).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" })}`;
  doc.text(genLabel, 190 - doc.getTextWidth(genLabel), 44);

  // KPI strip
  const kpis: { label: string; value: string }[] = [
    { label: "Immeubles", value: String(options.portfolio.buildingCount) },
    { label: "Unités", value: `${options.portfolio.occupiedUnits}/${options.portfolio.totalUnits}` },
    { label: "Occupation", value: `${options.portfolio.occupancyRate}%` },
    { label: "Loyer brut/mois", value: fmt(options.portfolio.nominalMonthlyRevenue) },
  ];
  autoTable(doc, {
    startY: 52,
    body: [kpis.map((k) => ({ content: `${k.value}\n${k.label}`, styles: { halign: "center" as const } }))],
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 5, overflow: "linebreak" },
    margin: { left: 20, right: 20 },
    tableWidth: 170,
    columnStyles: kpis.reduce<Record<number, any>>((acc, _, i) => {
      acc[i] = { cellWidth: 42.5 };
      return acc;
    }, {}),
  });

  // Financial summary
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 80) + 6,
    head: [["Résumé financier YTD", ""]],
    body: [
      ["Recettes", fmt(options.portfolio.revenueYtd)],
      ["Charges d'exploitation", fmt(options.portfolio.expensesYtd)],
      [
        { content: "Résultat net", styles: { fontStyle: "bold" } },
        {
          content: fmt(options.portfolio.netIncomeYtd),
          styles: {
            fontStyle: "bold",
            textColor: options.portfolio.netIncomeYtd >= 0 ? [22, 163, 74] : [220, 38, 38],
          },
        },
      ],
      ["Marge nette", `${options.portfolio.netMarginYtd.toFixed(1)}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: [69, 85, 58], halign: "left", fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak" },
    margin: { left: 20, right: 20 },
    tableWidth: 170,
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: "right" },
    },
  });

  // Impayés (if any)
  if (options.portfolio.overdueCount > 0) {
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 130) + 4,
      body: [[
        { content: `⚠ ${options.portfolio.overdueCount} loyer(s) impayé(s) ce mois — ${fmt(options.portfolio.overdueAmount)}`,
          styles: { fontStyle: "bold", textColor: [185, 28, 28], fillColor: [254, 242, 242] } },
      ]],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4 },
    });
  }

  // Buildings breakdown
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 150) + 6,
    head: [["Immeuble", "Adresse", "Unités", "Recettes", "Charges", "Résultat net"]],
    body: options.buildings.map((b) => [
      b.name,
      b.address,
      `${b.occupiedUnits}/${b.units}`,
      fmt(b.revenueYtd),
      fmt(b.expensesYtd),
      {
        content: fmt(b.netIncomeYtd),
        styles: { textColor: b.netIncomeYtd >= 0 ? [22, 163, 74] : [220, 38, 38], fontStyle: "bold" as const },
      },
    ]),
    theme: "grid",
    headStyles: { fillColor: [69, 85, 58], halign: "left", fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
    margin: { left: 20, right: 20 },
    tableWidth: 170,
    columnStyles: {
      0: { cellWidth: 30 },                    // Immeuble
      1: { cellWidth: 48 },                    // Adresse
      2: { cellWidth: 18, halign: "center" },  // Unités
      3: { cellWidth: 24, halign: "right" },   // Recettes
      4: { cellWidth: 24, halign: "right" },   // Charges
      5: { cellWidth: 26, halign: "right" },   // Résultat net
    },
  });

  // Tenants (new page if short on space)
  const finalYBefore = (doc as any).lastAutoTable?.finalY ?? 200;
  if (finalYBefore > 220) doc.addPage();

  autoTable(doc, {
    startY: finalYBefore > 220 ? 20 : finalYBefore + 8,
    head: [["Locataire", "Immeuble · Unité", "Loyer net", "Charges", "Total", "Statut"]],
    body: options.tenants.map((t) => [
      t.tenantName,
      `${t.buildingName} · ${t.unit}`,
      fmt(t.rentNet),
      fmt(t.charges),
      fmt(t.rentNet + t.charges),
      {
        content: STATUS_LABEL[t.status],
        styles: {
          textColor:
            t.status === "paid" ? [22, 163, 74]
            : t.status === "paid-late" ? [217, 119, 6]
            : t.status === "overdue" ? [220, 38, 38]
            : [107, 114, 128],
          fontStyle: "bold" as const,
        },
      },
    ]),
    theme: "grid",
    headStyles: { fillColor: [69, 85, 58], halign: "left", fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
    margin: { left: 20, right: 20 },
    tableWidth: 170,
    columnStyles: {
      0: { cellWidth: 38 },                   // Locataire
      1: { cellWidth: 48 },                   // Immeuble · Unité
      2: { cellWidth: 22, halign: "right" },  // Loyer net
      3: { cellWidth: 20, halign: "right" },  // Charges
      4: { cellWidth: 22, halign: "right" },  // Total
      5: { cellWidth: 20, halign: "center" }, // Statut
    },
  });

  footer(doc);
  await savePdfWithShare(
    doc,
    safeFileName(["rapport", String(options.year), options.ownerName]) + ".pdf",
  );
}

/* ─── Annual rent attestation (for tenant's tax return) ────────── */

export interface RentAttestationPayment {
  monthLabel: string;     // "Janvier 2025"
  date: string;            // ISO date
  amount: number;
  account: number;         // 101, 102, 103
  description?: string;
}

export interface RentAttestationOptions {
  year: number;
  payments: RentAttestationPayment[];
  totalRent: number;
  totalCharges: number;
  total: number;
  currency?: string;
  generatedOn?: string;
}

export async function generateRentAttestationPdf(
  tenant: Tenant,
  building: Building,
  landlord: LandlordInfo,
  options: RentAttestationOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const currency = options.currency ?? building.currency ?? "CHF";
  const fmt = (v: number) => formatAmount(v, currency);
  const generated = options.generatedOn ?? new Date().toISOString();

  header(doc, "Attestation de loyers payés");

  // Bailleur (régie) — top left
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(landlord.name || "—", 20, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (landlord.address) doc.text(landlord.address, 20, 41);
  if (landlord.email) doc.text(landlord.email, 20, 46);

  // Date d'édition — top right
  const genLabel = `Édité le ${new Date(generated).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" })}`;
  doc.text(genLabel, 190 - doc.getTextWidth(genLabel), 46);

  // Tenant block
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("DESTINATAIRE", 20, 62);
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(tenant.name, 20, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (building.address) doc.text(building.address, 20, 74);
  if (tenant.unit) doc.text(`Logement : ${tenant.unit}`, 20, 79);

  // Salutation + statement
  let y = 92;
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Madame, Monsieur,", 20, y);
  y += 8;

  const intro = `Par la présente, nous attestons que ${tenant.name}, locataire du logement situé au ${building.address}${tenant.unit ? ` (${tenant.unit})` : ""}, a versé durant l'année civile ${options.year} les montants ci-dessous au titre du loyer et des charges locatives.`;
  const split = doc.splitTextToSize(intro, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 4;

  // Payments table
  autoTable(doc, {
    startY: y,
    head: [["Mois", "Date paiement", "Compte", "Description", "Montant"]],
    body: options.payments.map((p) => [
      p.monthLabel,
      new Date(p.date).toLocaleDateString("fr-CH"),
      String(p.account),
      p.description ?? "",
      fmt(p.amount),
    ]),
    foot: [[
      { content: "Total " + options.year, colSpan: 4, styles: { fontStyle: "bold" as const, halign: "right" as const } },
      { content: fmt(options.total), styles: { fontStyle: "bold" as const, fillColor: [69, 85, 58], textColor: 255 } },
    ]],
    theme: "grid",
    headStyles: { fillColor: [69, 85, 58], halign: "left" as const, fontSize: 9 },
    footStyles: { fillColor: [243, 244, 246], textColor: 20, fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 2.5, overflow: "linebreak" as const },
    margin: { left: 20, right: 20 },
    tableWidth: 170,
    columnStyles: {
      0: { cellWidth: 32 },                   // Mois
      1: { cellWidth: 28 },                   // Date
      2: { cellWidth: 18, halign: "center" }, // Compte
      3: { cellWidth: 60 },                   // Description
      4: { cellWidth: 32, halign: "right" },  // Montant
    },
  });

  let finalY = (doc as any).lastAutoTable?.finalY ?? 200;

  // Breakdown summary box
  if (finalY < 230) {
    autoTable(doc, {
      startY: finalY + 6,
      body: [
        ["Loyers nets (compte 101 + 102)", fmt(options.totalRent)],
        ["Acomptes de charges (compte 103)", fmt(options.totalCharges)],
        [
          { content: "Total versé", styles: { fontStyle: "bold" as const } },
          { content: fmt(options.total), styles: { fontStyle: "bold" as const } },
        ],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 20, right: 20 },
      tableWidth: 170,
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 40, halign: "right" },
      },
    });
    finalY = (doc as any).lastAutoTable?.finalY ?? finalY;
  }

  // Closing + signature block — new page if not enough room
  if (finalY > 240) {
    doc.addPage();
    finalY = 30;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(
    "Cette attestation peut être présentée aux autorités fiscales suisses dans le cadre de la déclaration d'impôts.",
    20, finalY + 12, { maxWidth: 170 },
  );
  doc.text(
    "Nous restons à disposition pour tout complément d'information.",
    20, finalY + 22, { maxWidth: 170 },
  );

  // Signature block
  const sigY = finalY + 38;
  doc.text(`${landlord.address?.split(",").slice(-1)[0].trim() || "Lausanne"}, le ${new Date(generated).toLocaleDateString("fr-CH")}`, 20, sigY);
  doc.setFont("helvetica", "bold");
  doc.text(landlord.name || "—", 20, sigY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (landlord.email) doc.text(landlord.email, 20, sigY + 20);

  footer(doc);
  await savePdfWithShare(
    doc,
    safeFileName(["attestation-loyers", String(options.year), tenant.name]) + ".pdf",
  );
}

/* ─── Avis de résiliation par le bailleur (CO 266a-l) ──────────── */

export type TerminationReason =
  | "ordinaire"
  | "vente"
  | "renovation-lourde"
  | "usage-personnel"
  | "loyers-impayes"
  | "violations-graves"
  | "autre";

export const TERMINATION_REASON_LABEL: Record<TerminationReason, string> = {
  "ordinaire": "Résiliation ordinaire (sans motif particulier)",
  "vente": "Vente de l'immeuble",
  "renovation-lourde": "Travaux de rénovation lourde",
  "usage-personnel": "Usage personnel ou pour proche parent",
  "loyers-impayes": "Loyers impayés (art. 257d CO)",
  "violations-graves": "Violations graves du bail",
  "autre": "Autre motif",
};

export interface TerminationNoticeOptions {
  effectiveDate: string;       // ISO YYYY-MM-DD — date à laquelle le bail prend fin
  reason: TerminationReason;
  reasonDetails?: string;       // Précisions facultatives
  signedAt?: string;            // Lieu de signature, default canton from address
  generatedOn?: string;
}

export async function generateTerminationNoticePdf(
  tenant: Tenant,
  building: Building,
  landlord: LandlordInfo,
  options: TerminationNoticeOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generated = options.generatedOn ?? new Date().toISOString();
  const signedAt = options.signedAt ?? (landlord.address?.split(",").slice(-1)[0]?.trim() || "Lausanne");

  header(doc, "Avis de résiliation de bail");

  // Bailleur — top
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(landlord.name || "—", 20, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (landlord.address) doc.text(landlord.address, 20, 41);
  if (landlord.email) doc.text(landlord.email, 20, 46);

  const genLabel = `${signedAt}, le ${new Date(generated).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" })}`;
  doc.text(genLabel, 190 - doc.getTextWidth(genLabel), 46);

  // Tenant block — formal addressing on right
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(tenant.name, 115, 62);
  if (building.address) doc.text(building.address, 115, 67);
  if (tenant.unit) doc.text(tenant.unit, 115, 72);

  // Subject line
  let y = 92;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(
    `Objet : Résiliation de votre bail pour le ${new Date(options.effectiveDate).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" })}`,
    20, y, { maxWidth: 170 },
  );
  y += 14;

  // Salutation + body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Madame, Monsieur,", 20, y);
  y += 8;

  const intro = `Par la présente, nous vous notifions formellement la résiliation de votre bail à loyer portant sur le logement situé au ${building.address}${tenant.unit ? `, ${tenant.unit}` : ""}.`;
  const introLines = doc.splitTextToSize(intro, 170);
  doc.text(introLines, 20, y);
  y += introLines.length * 5 + 4;

  // Effective date emphasised
  doc.setFont("helvetica", "bold");
  const effDate = new Date(options.effectiveDate).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Date d'effet : ${effDate}`, 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");

  // Reason
  const reasonLabel = TERMINATION_REASON_LABEL[options.reason];
  doc.text(`Motif de la résiliation : ${reasonLabel}`, 20, y, { maxWidth: 170 });
  y += 6;
  if (options.reasonDetails && options.reasonDetails.trim()) {
    const detailLines = doc.splitTextToSize(options.reasonDetails.trim(), 170);
    doc.text(detailLines, 20, y);
    y += detailLines.length * 5;
  }
  y += 4;

  // Legal info — tenant rights
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const legalNote = "Conformément à l'art. 271a du Code des obligations, vous disposez d'un délai de 30 jours dès la réception du présent avis pour contester la résiliation auprès de l'autorité de conciliation compétente. Vous pouvez également solliciter une prolongation du bail aux conditions des art. 272 et suivants CO.";
  const legalLines = doc.splitTextToSize(legalNote, 170);
  doc.text(legalLines, 20, y);
  y += legalLines.length * 4.5 + 4;

  // Practical info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(
    "Un état des lieux de sortie sera organisé en présence des deux parties. Nous vous contacterons prochainement pour fixer un rendez-vous.",
    20, y, { maxWidth: 170 },
  );
  y += 14;

  doc.text("Veuillez agréer, Madame, Monsieur, nos salutations distinguées.", 20, y, { maxWidth: 170 });
  y += 22;

  // Signature block
  doc.setFont("helvetica", "bold");
  doc.text(landlord.name || "—", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (landlord.email) doc.text(landlord.email, 20, y + 5);

  doc.line(20, y + 25, 100, y + 25);
  doc.setFontSize(9);
  doc.text("Signature autorisée", 20, y + 30);

  // Bottom: registered-mail reminder
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "Le présent avis doit être envoyé par lettre signature (recommandé) pour faire valablement courir les délais (art. 266l CO).",
    20, h - 16, { maxWidth: 170 },
  );

  footer(doc);
  await savePdfWithShare(
    doc,
    safeFileName(["avis-resiliation", String(options.effectiveDate), tenant.name]) + ".pdf",
  );
}

/* ─── Convocation à l'état des lieux ───────────────────────────── */

export interface InspectionAppointmentOptions {
  appointmentDate: string;     // ISO YYYY-MM-DD
  appointmentTime: string;      // "HH:MM"
  appointmentType: "entree" | "sortie" | "intermediaire";
  meetingLocation?: string;     // Default = building address
  notes?: string;
  generatedOn?: string;
}

const INSPECTION_TYPE_LABEL: Record<InspectionAppointmentOptions["appointmentType"], string> = {
  entree: "État des lieux d'entrée",
  sortie: "État des lieux de sortie",
  intermediaire: "État des lieux intermédiaire",
};

export async function generateInspectionAppointmentPdf(
  tenant: Tenant,
  building: Building,
  landlord: LandlordInfo,
  options: InspectionAppointmentOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generated = options.generatedOn ?? new Date().toISOString();
  const meetingLoc = options.meetingLocation || building.address;
  const dateStr = new Date(options.appointmentDate).toLocaleDateString("fr-CH", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const typeLabel = INSPECTION_TYPE_LABEL[options.appointmentType];

  header(doc, `Convocation — ${typeLabel}`);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(landlord.name || "—", 20, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (landlord.address) doc.text(landlord.address, 20, 41);
  if (landlord.email) doc.text(landlord.email, 20, 46);

  const signedAt = landlord.address?.split(",").slice(-1)[0]?.trim() || "Lausanne";
  const genLabel = `${signedAt}, le ${new Date(generated).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" })}`;
  doc.text(genLabel, 190 - doc.getTextWidth(genLabel), 46);

  // Tenant block
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(tenant.name, 115, 62);
  if (building.address) doc.text(building.address, 115, 67);
  if (tenant.unit) doc.text(tenant.unit, 115, 72);

  // Subject
  let y = 92;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`Objet : Convocation pour ${typeLabel.toLowerCase()}`, 20, y, { maxWidth: 170 });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Madame, Monsieur,", 20, y);
  y += 8;

  const intro = `Nous vous convions à un ${typeLabel.toLowerCase()} concernant le logement situé au ${building.address}${tenant.unit ? `, ${tenant.unit}` : ""}.`;
  const introLines = doc.splitTextToSize(intro, 170);
  doc.text(introLines, 20, y);
  y += introLines.length * 5 + 6;

  // Highlighted appointment block
  autoTable(doc, {
    startY: y,
    body: [
      ["Date", dateStr],
      ["Heure", options.appointmentTime],
      ["Lieu", meetingLoc],
    ],
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 4, fontStyle: "bold" as const },
    margin: { left: 20, right: 20 },
    tableWidth: 170,
    columnStyles: {
      0: { cellWidth: 40, fillColor: [243, 244, 246] },
      1: { cellWidth: 130 },
    },
  });
  y = (doc as any).lastAutoTable?.finalY ?? y + 30;
  y += 10;

  // What to bring / expectations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("À prévoir :", 20, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40);
  const checklist =
    options.appointmentType === "sortie"
      ? [
          "• Toutes les clés du logement (porte palière, boîte aux lettres, garage, cave…)",
          "• Logement entièrement vidé et nettoyé en profondeur",
          "• Dernier décompte des charges payé",
          "• Adresse de transfert pour la libération de la caution",
        ]
      : [
          "• Document d'identité",
          "• Premier loyer + caution (si pas encore versée)",
          "• Liste des défauts éventuels constatés à votre arrivée (à remettre dans les 30 jours)",
          "• Toute question sur le règlement de l'immeuble",
        ];
  for (const line of checklist) {
    doc.text(line, 20, y, { maxWidth: 170 });
    y += 5.5;
  }

  if (options.notes && options.notes.trim()) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Note :", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(options.notes.trim(), 170);
    doc.text(noteLines, 20, y);
    y += noteLines.length * 5;
  }

  y += 8;
  doc.text(
    "Si cette date ne vous convient pas, merci de nous contacter rapidement pour fixer un autre rendez-vous.",
    20, y, { maxWidth: 170 },
  );
  y += 12;
  doc.text("Veuillez agréer, Madame, Monsieur, nos salutations distinguées.", 20, y, { maxWidth: 170 });
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.text(landlord.name || "—", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (landlord.email) doc.text(landlord.email, 20, y + 5);

  footer(doc);
  await savePdfWithShare(
    doc,
    safeFileName(["convocation-edl", options.appointmentType, options.appointmentDate, tenant.name]) + ".pdf",
  );
}
