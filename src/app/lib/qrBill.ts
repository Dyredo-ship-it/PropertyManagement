// Swiss QR-bill helpers — generate a QRR reference and rasterise a
// SwissQRBill SVG into a PNG data URL that jsPDF can embed as an image
// on the bottom 105mm of an A4 page (official payment-part size).

import { SwissQRBill } from "swissqrbill/svg";
import {
  isQRIBAN,
  isIBANValid,
  calculateQRReferenceChecksum,
  calculateSCORReferenceChecksum,
} from "swissqrbill/utils";

export interface QRBillCreditor {
  name: string;
  address: string; // free-form street (will be split automatically)
  zip: string;
  city: string;
  country?: string; // defaults to "CH"
  iban: string;
}

export interface QRBillDebtor {
  name: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
}

export interface QRBillOptions {
  creditor: QRBillCreditor;
  debtor?: QRBillDebtor;
  amount: number;
  currency: "CHF" | "EUR";
  /** Billing period label (e.g. "Loyer avril 2026") — emitted as the unstructured message. */
  message?: string;
  /** Deterministic seed to produce a stable reference (ex. tenantId + yearMonth). */
  referenceSeed: string;
}

/**
 * Builds a 27-digit QR-Reference (QRR) from a deterministic seed. The
 * first 26 digits are derived from the seed, and the 27th is the
 * recursive mod-10 checksum. With a QR-IBAN this reference is required
 * by the bank to match incoming payments back to the invoice.
 */
export function buildQRReference(seed: string): string {
  // Reduce the seed to digits only, keep 26 of them (pad left with zeroes).
  const digits = seed.replace(/\D+/g, "") || hashToDigits(seed);
  const truncated = digits.slice(0, 26).padStart(26, "0");
  const checksum = calculateQRReferenceChecksum(truncated);
  return truncated + checksum;
}

/**
 * Builds a creditor reference (SCOR, RFxx) usable with a plain Swiss
 * IBAN when no QR-IBAN is available. Up to 21 alphanumeric chars.
 */
export function buildSCORReference(seed: string): string {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 21);
  const checksum = calculateSCORReferenceChecksum(clean);
  return `RF${checksum}${clean}`;
}

function hashToDigits(input: string): string {
  // Very light positional hash — sufficient for seed uniqueness, we rely
  // on tenantId + yearMonth to be unique anyway.
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return String(h).padStart(10, "0");
}

function splitAddress(raw: string): { street: string; buildingNumber?: string } {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { street: "-" };
  const m = trimmed.match(/^(.+?)\s+([0-9]+[a-zA-Z]?)$/);
  if (m) return { street: m[1], buildingNumber: m[2] };
  return { street: trimmed };
}

export interface RenderedQRBill {
  png: string;            // PNG data URL
  reference: string;      // QRR (27 digits) or SCOR (RFxx…)
  isQRReference: boolean; // true = QRR derived from a QR-IBAN
}

/**
 * Renders the Swiss QR-bill as a PNG data URL, sized to fit the
 * standard 210x105 mm payment part. The caller embeds it at the bottom
 * of an A4 page via jsPDF's addImage, and persists the reference to
 * rent_invoices so later CAMT.054 imports can match it back.
 */
export async function renderQRBillPng(opts: QRBillOptions): Promise<RenderedQRBill> {
  if (!isIBANValid(opts.creditor.iban)) {
    throw new Error("IBAN invalide — vérifiez la valeur saisie dans Paramètres → Société.");
  }

  const isQr = isQRIBAN(opts.creditor.iban);
  const reference = isQr
    ? buildQRReference(opts.referenceSeed)
    : buildSCORReference(opts.referenceSeed);

  const { street: cStreet, buildingNumber: cNum } = splitAddress(opts.creditor.address);

  const data: any = {
    amount: Math.round(opts.amount * 100) / 100,
    currency: opts.currency,
    creditor: {
      name: opts.creditor.name || "Bailleur",
      address: cStreet,
      ...(cNum ? { buildingNumber: cNum } : {}),
      zip: Number(opts.creditor.zip) || opts.creditor.zip || "0000",
      city: opts.creditor.city || "—",
      country: opts.creditor.country ?? "CH",
      account: opts.creditor.iban.replace(/\s+/g, ""),
    },
    reference,
    ...(opts.message ? { message: opts.message } : {}),
  };

  if (opts.debtor && opts.debtor.name) {
    const { street: dStreet, buildingNumber: dNum } = splitAddress(opts.debtor.address ?? "");
    data.debtor = {
      name: opts.debtor.name,
      address: dStreet,
      ...(dNum ? { buildingNumber: dNum } : {}),
      zip: Number(opts.debtor.zip) || opts.debtor.zip || "0000",
      city: opts.debtor.city || "—",
      country: opts.debtor.country ?? "CH",
    };
  }

  const svgString = new SwissQRBill(data, { language: "FR" }).toString();
  const result: RenderedQRBill = { png: "", reference, isQRReference: isQr };

  // Rasterize the SVG to PNG via a canvas (2x density for crisper printing).
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    // SwissQRBill SVG is authored in mm; width="210mm" height="105mm".
    // At 96 DPI this is ~793 x ~397 px. We upscale 2x for print quality.
    const targetW = 210 * 8; // ~1680px
    const targetH = 105 * 8;
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D non disponible.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    result.png = canvas.toDataURL("image/png");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
