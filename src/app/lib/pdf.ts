import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Building, Tenant } from "../utils/storage";
import { renderQRBillPng } from "./qrBill";

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
      const qrPng = await renderQRBillPng({
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
      doc.addImage(qrPng, "PNG", 0, 297 - 105, 210, 105);
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
