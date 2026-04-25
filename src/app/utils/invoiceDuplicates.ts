import {
  getAccountingTransactions,
  type AccountingTransaction,
} from "./storage";

/**
 * Detect potential duplicates of a freshly-scanned invoice against
 * already-recorded accounting transactions. Catches the common
 * scenario where the same invoice is scanned manually AND later
 * appears via a CAMT bank import (or vice-versa).
 */

export type ScannedInvoice = {
  vendorName?: string | null;
  invoiceDate?: string | null; // YYYY-MM-DD
  totalAmount?: number | null;
  iban?: string | null;
  qrReference?: string | null;
};

export type DuplicateMatch = {
  tx: AccountingTransaction;
  score: number;       // 0-100
  reasons: string[];
};

const HIGH_THRESHOLD = 70;

function nameMatch(scanned: string | null | undefined, txDescription: string | undefined): boolean {
  if (!scanned || !txDescription) return false;
  const a = scanned.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4);
  const b = txDescription.toLowerCase();
  return a.some((token) => b.includes(token));
}

export function findDuplicates(invoice: ScannedInvoice, opts?: { buildingId?: string }): DuplicateMatch[] {
  const txs = getAccountingTransactions(opts?.buildingId);
  if (txs.length === 0) return [];

  const matches: DuplicateMatch[] = [];
  const amount = invoice.totalAmount ?? null;
  const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : null;

  for (const tx of txs) {
    let score = 0;
    const reasons: string[] = [];

    // Amount match — the strongest signal.
    if (amount != null && amount > 0) {
      const txAmount = (tx.debit ?? 0) || (tx.credit ?? 0);
      if (txAmount > 0) {
        const delta = Math.abs(txAmount - amount);
        if (delta < 0.01) {
          score += 50;
          reasons.push(`montant exact (${amount})`);
        } else if (delta < 1) {
          score += 35;
          reasons.push(`montant proche (±${delta.toFixed(2)})`);
        }
      }
    }

    // Vendor name in description.
    if (nameMatch(invoice.vendorName ?? null, tx.description)) {
      score += 25;
      reasons.push(`fournisseur dans la description`);
    }

    // Date proximity — within 30 days.
    if (invoiceDate) {
      const txDateRaw = tx.dateInvoice || tx.datePayment;
      if (txDateRaw) {
        const txDate = new Date(txDateRaw);
        const daysDelta = Math.abs((txDate.getTime() - invoiceDate.getTime()) / 86400000);
        if (daysDelta < 1) {
          score += 20;
          reasons.push("même date de facture");
        } else if (daysDelta <= 5) {
          score += 12;
          reasons.push(`date proche (${Math.round(daysDelta)} j)`);
        } else if (daysDelta <= 30) {
          score += 6;
          reasons.push(`date dans les 30 j`);
        }
      }
    }

    // QR reference is a unique invoice ID — if it matches we're sure.
    if (invoice.qrReference && tx.description?.includes(invoice.qrReference)) {
      score += 30;
      reasons.push("référence QR identique");
    }

    if (score >= 35) matches.push({ tx, score, reasons });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 5);
}

export function isLikelyDuplicate(matches: DuplicateMatch[]): boolean {
  return matches.length > 0 && matches[0].score >= HIGH_THRESHOLD;
}
