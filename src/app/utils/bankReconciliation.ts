import {
  getTenants,
  getAccountingTransactions,
  saveAccountingTransactions,
  type Tenant,
  type AccountingTransaction,
} from "./storage";

/**
 * Smart bank reconciliation — suggest the right tenant for a payment
 * transaction that hasn't been linked yet. Scores candidates on three
 * signals and returns the top matches:
 *
 *  - Amount match:        tenant's expected monthly total = tx.credit  (40 pts)
 *                         near-match (within 5 CHF)                    (25 pts)
 *  - Name in description: last-name or first-name token found          (35 pts)
 *                         first name only                              (15 pts)
 *  - Same building:       tx.buildingId matches tenant.buildingId      (15 pts)
 *  - Month coverage:      tenant's lease covers tx.month               (10 pts)
 *
 * A score ≥ 70 means we're confident enough to batch-accept without
 * asking. < 70 needs a manual review.
 */

export const CONFIDENT_THRESHOLD = 70;

const RENT_ACCOUNTS = new Set([101, 102, 103]);

export type MatchCandidate = {
  tenant: Tenant;
  score: number;
  reasons: string[];
};

function nameTokens(fullName: string): { last: string; first: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    last: (parts[parts.length - 1] ?? "").toLowerCase(),
    first: (parts[0] ?? "").toLowerCase(),
  };
}

function leaseCovers(tenant: Tenant, monthKey: string | undefined): boolean {
  if (!monthKey) return true;
  if (tenant.leaseStart && tenant.leaseStart.slice(0, 7) > monthKey) return false;
  if (tenant.leaseEnd && tenant.leaseEnd.slice(0, 7) < monthKey) return false;
  return true;
}

export function suggestTenantMatchesForTx(
  tx: AccountingTransaction,
  tenants?: Tenant[],
): MatchCandidate[] {
  const list = tenants ?? getTenants();
  const desc = (tx.description ?? "").toLowerCase();
  const amount = tx.credit || 0;
  const candidates: MatchCandidate[] = [];

  for (const tenant of list) {
    if (tenant.status === "ended") continue;
    const reasons: string[] = [];
    let score = 0;

    // Name in description
    const { last, first } = nameTokens(tenant.name);
    if (last && last.length >= 3 && desc.includes(last)) {
      score += 35;
      reasons.push(`nom « ${last} » dans la description`);
    } else if (first && first.length >= 3 && desc.includes(first)) {
      score += 15;
      reasons.push(`prénom « ${first} » dans la description`);
    }

    // Amount match
    const expected = (tenant.rentNet ?? 0) + (tenant.charges ?? 0);
    if (expected > 0 && amount > 0) {
      const delta = Math.abs(expected - amount);
      if (delta < 0.01) {
        score += 40;
        reasons.push(`montant exact (${amount})`);
      } else if (delta < 5) {
        score += 25;
        reasons.push(`montant proche (±${delta.toFixed(2)})`);
      } else if (Math.abs(tenant.rentNet - amount) < 0.01) {
        score += 25;
        reasons.push(`= loyer net seul`);
      } else if (Math.abs(tenant.charges - amount) < 0.01) {
        score += 20;
        reasons.push(`= acompte de charges`);
      }
    }

    // Same building
    if (tx.buildingId && tx.buildingId === tenant.buildingId) {
      score += 15;
      reasons.push(`même immeuble`);
    }

    // Lease covers the transaction month
    if (leaseCovers(tenant, tx.month)) {
      score += 10;
      reasons.push(`bail actif au mois concerné`);
    }

    if (score > 0) candidates.push({ tenant, score, reasons });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 5);
}

/**
 * Returns incoming rent transactions that haven't been linked to a
 * tenant yet (tenantName empty) AND carry a credit (money received).
 * Ignores fully-matched imports so the panel only shows work left.
 */
export function listUnmatchedPayments(opts?: {
  buildingId?: string;
  year?: number;
}): AccountingTransaction[] {
  const year = opts?.year;
  const txs = getAccountingTransactions(opts?.buildingId);
  return txs.filter((tx) => {
    if (!RENT_ACCOUNTS.has(tx.accountNumber)) return false;
    if ((tx.credit || 0) <= 0) return false;
    if (tx.tenantName && tx.tenantName.trim()) return false;
    if (year) {
      const d = tx.datePayment || tx.dateInvoice || "";
      if (!d.startsWith(String(year))) return false;
    }
    return true;
  });
}

export type UnmatchedRow = {
  tx: AccountingTransaction;
  candidates: MatchCandidate[];
  top: MatchCandidate | null;
  confident: boolean;
};

export function buildUnmatchedRows(opts?: { buildingId?: string; year?: number }): UnmatchedRow[] {
  const tenants = getTenants();
  const unmatched = listUnmatchedPayments(opts);
  return unmatched.map((tx) => {
    const candidates = suggestTenantMatchesForTx(tx, tenants);
    const top = candidates[0] ?? null;
    return {
      tx,
      candidates,
      top,
      confident: !!top && top.score >= CONFIDENT_THRESHOLD,
    };
  });
}

/** Accepts a match — writes tenantName on the transaction + saves. */
export function acceptMatch(txId: string, tenant: Tenant): void {
  const all = getAccountingTransactions();
  const next = all.map((t) => {
    if (t.id !== txId) return t;
    return {
      ...t,
      tenantName: tenant.name,
      buildingId: t.buildingId || tenant.buildingId,
    };
  });
  saveAccountingTransactions(next);
}

/** Batch-accept all confident matches in one go. Returns count accepted. */
export function acceptAllConfident(opts?: { buildingId?: string; year?: number }): number {
  const rows = buildUnmatchedRows(opts).filter((r) => r.confident && r.top);
  if (rows.length === 0) return 0;
  const all = getAccountingTransactions();
  const byId = new Map(rows.map((r) => [r.tx.id, r.top!.tenant] as const));
  const next = all.map((t) => {
    const tenant = byId.get(t.id);
    if (!tenant) return t;
    return {
      ...t,
      tenantName: tenant.name,
      buildingId: t.buildingId || tenant.buildingId,
    };
  });
  saveAccountingTransactions(next);
  return rows.length;
}
