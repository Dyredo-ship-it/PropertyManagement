// Minimal CAMT.054 (ISO 20022) parser for incoming credit notifications.
// Focuses on the fields we need for Swiss rent reconciliation:
//   amount, currency, value date, creditor reference, debtor name.
//
// Tested against the formats most Swiss banks export (UBS, Raiffeisen,
// PostFinance, ZKB). Ignores namespaces by stripping the prefix before
// querying nodes, since Swiss banks use different xmlns versions.

export interface CamtTransaction {
  /** Unique reference (Prtry/Ref or AcctSvcrRef) used for deduplication. */
  txId: string;
  /** Amount always positive; sign is in direction. */
  amount: number;
  currency: string;
  direction: "credit" | "debit";
  /** YYYY-MM-DD value date when the money actually moves. */
  valueDate: string;
  /** Creditor reference — QRR (27 digits) or SCOR (RFxx…) or null. */
  reference: string | null;
  /** Debtor (payer) name when present. */
  debtorName: string | null;
  /** Free-text additional info from the bank. */
  info: string | null;
}

export interface CamtParseResult {
  /** Bank's IBAN of the receiving account. */
  accountIban: string | null;
  /** Message id assigned by the bank — useful for the user to identify the file. */
  messageId: string | null;
  /** All credit + debit entries in the notification. */
  transactions: CamtTransaction[];
}

/**
 * Parse a CAMT.054 XML document into structured transactions. Throws a
 * user-friendly Error when the document is not valid XML or doesn't
 * look like a CAMT notification.
 */
export function parseCamt054(xmlString: string): CamtParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  // Any parse error yields a <parsererror> element in the HTML namespace.
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Fichier XML invalide ou corrompu.");
  }

  // Namespace-agnostic: pick the first *local-name* match per element.
  const get = (node: Element | Document, name: string): Element | null => {
    const list = (node as any).getElementsByTagName("*") as HTMLCollectionOf<Element>;
    for (let i = 0; i < list.length; i++) {
      if (localName(list[i]) === name) return list[i];
    }
    return null;
  };
  const getAll = (node: Element | Document, name: string): Element[] => {
    const list = (node as any).getElementsByTagName("*") as HTMLCollectionOf<Element>;
    const out: Element[] = [];
    for (let i = 0; i < list.length; i++) {
      if (localName(list[i]) === name) out.push(list[i]);
    }
    return out;
  };

  const notif = get(doc, "Ntfctn") ?? get(doc, "Stmt");
  if (!notif) {
    throw new Error("Ce fichier ne semble pas être une notification CAMT.054.");
  }

  const messageId = text(get(notif, "MsgId") ?? get(doc, "MsgId"));
  const accountIban = text(get(get(notif, "Acct") ?? notif, "IBAN"));

  const transactions: CamtTransaction[] = [];
  for (const entry of getAll(notif, "Ntry")) {
    const amtEl = get(entry, "Amt");
    const amount = amtEl ? Number(text(amtEl)) : NaN;
    const currency = amtEl?.getAttribute("Ccy") ?? "CHF";
    const direction = (text(get(entry, "CdtDbtInd")) || "").toUpperCase() === "DBIT" ? "debit" : "credit";
    const valueDate = text(get(get(entry, "ValDt") ?? entry, "Dt")) || text(get(get(entry, "BookgDt") ?? entry, "Dt")) || "";

    // Each Ntry may contain multiple TxDtls — unroll them.
    const txDtls = getAll(entry, "TxDtls");
    if (txDtls.length === 0) {
      // Fall back to a single tx built from the Ntry summary.
      transactions.push({
        txId: text(get(entry, "AcctSvcrRef")) || `${accountIban || ""}:${valueDate}:${amount}`,
        amount,
        currency,
        direction,
        valueDate,
        reference: extractReference(entry, get, getAll),
        debtorName: text(get(get(entry, "RltdPties") ?? entry, "Nm")),
        info: text(get(entry, "AddtlNtryInf")),
      });
      continue;
    }
    for (const tx of txDtls) {
      const tAmt = get(tx, "Amt");
      transactions.push({
        txId:
          text(get(get(tx, "Refs") ?? tx, "AcctSvcrRef")) ||
          text(get(get(tx, "Refs") ?? tx, "TxId")) ||
          text(get(get(tx, "Refs") ?? tx, "EndToEndId")) ||
          `${accountIban || ""}:${valueDate}:${tAmt ? text(tAmt) : amount}:${Math.random().toString(16).slice(2, 6)}`,
        amount: tAmt ? Number(text(tAmt)) : amount,
        currency: (tAmt?.getAttribute("Ccy") ?? currency) || "CHF",
        direction,
        valueDate,
        reference: extractReference(tx, get, getAll),
        debtorName:
          text(get(get(tx, "RltdPties") ?? tx, "Nm")) ||
          text(get(get(tx, "Dbtr") ?? tx, "Nm")),
        info: text(get(tx, "AddtlTxInf")),
      });
    }
  }

  return { messageId, accountIban, transactions };
}

function localName(el: Element): string {
  return (el as any).localName ?? el.tagName.split(":").pop() ?? el.tagName;
}

function text(el: Element | null | undefined): string | null {
  if (!el) return null;
  const t = el.textContent?.trim();
  return t && t.length > 0 ? t : null;
}

function extractReference(
  node: Element,
  get: (n: Element | Document, name: string) => Element | null,
  _getAll: (n: Element | Document, name: string) => Element[],
): string | null {
  // Preferred: RmtInf/Strd/CdtrRefInf/Ref
  const strdRef = get(node, "CdtrRefInf");
  const byStrd = strdRef ? text(get(strdRef, "Ref")) : null;
  if (byStrd) return normalizeReference(byStrd);

  // Fallback: unstructured info — some banks embed the reference there.
  const unstr = get(get(node, "RmtInf") ?? node, "Ustrd");
  const u = text(unstr);
  if (u) {
    const qrMatch = u.match(/\b\d{27}\b/);
    if (qrMatch) return qrMatch[0];
    const scorMatch = u.match(/\bRF\d{2}[A-Z0-9]+\b/i);
    if (scorMatch) return scorMatch[0].toUpperCase();
  }
  return null;
}

function normalizeReference(raw: string): string {
  const cleaned = raw.replace(/\s+/g, "");
  if (/^\d{27}$/.test(cleaned)) return cleaned;
  if (/^RF\d{2}[A-Z0-9]+$/i.test(cleaned)) return cleaned.toUpperCase();
  return cleaned;
}
