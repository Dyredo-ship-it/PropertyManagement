import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Upload, Camera, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  getBuildings,
  addAccountingTransactions,
  type Building,
  type AccountingTransaction,
} from "../utils/storage";
import { findDuplicates, type DuplicateMatch } from "../utils/invoiceDuplicates";
import { useCurrency } from "../context/CurrencyContext";

/**
 * Scan a Swiss invoice (PDF or photo), extract its fields via Claude
 * Vision, detect potential duplicates against existing accounting
 * transactions, then save as a new transaction with one click.
 */

type ExtractedInvoice = {
  vendorName: string | null;
  vendorAddress: string | null;
  vendorVatNumber: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: "CHF" | "EUR" | "USD" | null;
  totalAmount: number | null;
  vatAmount: number | null;
  vatRate: number | null;
  iban: string | null;
  qrReference: string | null;
  description: string | null;
  suggestedAccount: number | null;
  confidence: number;
  notes: string | null;
};

type Step = "upload" | "extracting" | "review";

export function InvoiceScannerModal({
  open,
  onClose,
  defaultBuildingId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  defaultBuildingId?: string;
  onSaved: () => void;
}) {
  const { formatAmount } = useCurrency();
  const [step, setStep] = useState<Step>("upload");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string>(defaultBuildingId ?? "");
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [forceSave, setForceSave] = useState(false);

  const buildings = getBuildings();

  const reset = () => {
    setStep("upload");
    setImageDataUrl(null);
    setImageMime(null);
    setExtracted(null);
    setError(null);
    setDuplicates([]);
    setForceSave(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError(`Fichier trop gros (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"].includes(file.type)) {
      setError(`Type non supporté : ${file.type}`);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    setImageMime(file.type);
    setStep("extracting");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("extract-invoice", {
        body: { imageDataUrl: dataUrl, mimeType: file.type },
      });
      if (invokeError) throw invokeError;
      const payload = data as { ok: boolean; data?: ExtractedInvoice; error?: string };
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error || "Extraction échouée");
      }
      setExtracted(payload.data);
      const matches = findDuplicates(payload.data, { buildingId: buildingId || undefined });
      setDuplicates(matches);
      setStep("review");
    } catch (err) {
      setError((err as Error).message || "Erreur d'extraction");
      setStep("upload");
    }
  };

  const handleSave = () => {
    if (!extracted) return;
    if (!buildingId) {
      alert("Sélectionnez un immeuble.");
      return;
    }
    const isDup = duplicates.length > 0 && duplicates[0].score >= 70;
    if (isDup && !forceSave) {
      alert("Coche 'Enregistrer malgré le doublon' avant de sauvegarder.");
      return;
    }

    const dateInvoice = extracted.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const monthKey = dateInvoice.slice(0, 7);
    const account = extracted.suggestedAccount ?? 219;
    const amount = extracted.totalAmount ?? 0;

    const tx: Omit<AccountingTransaction, "id"> = {
      buildingId,
      dateInvoice,
      datePayment: extracted.dueDate ?? undefined,
      description: [
        extracted.vendorName,
        extracted.invoiceNumber ? `n° ${extracted.invoiceNumber}` : null,
        extracted.qrReference ? `réf ${extracted.qrReference}` : null,
      ].filter(Boolean).join(" — ") || (extracted.description ?? "Facture scannée"),
      category: `${account} — ${ACCOUNT_LABEL[account] ?? ""}`,
      accountNumber: account,
      debit: amount,
      credit: 0,
      status: "À payer",
      tenantName: extracted.vendorName ?? undefined,
      month: monthKey,
    };

    setBusy(true);
    try {
      addAccountingTransactions([tx]);
      onSaved();
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const inner = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
          width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
              Scanner une facture
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}>
              IA
            </span>
          </div>
          <button onClick={handleClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: 4, borderRadius: 8,
            display: "flex", alignItems: "center",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px" }}>
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: "color-mix(in srgb, #DC2626 10%, transparent)",
              border: "1px solid color-mix(in srgb, #DC2626 30%, transparent)",
              color: "#991B1B", fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {step === "upload" && <UploadStep onFile={handleFile} />}

          {step === "extracting" && (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <Loader2 style={{ width: 32, height: 32, color: "var(--primary)", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                Lecture de la facture par l'IA…
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "6px 0 0" }}>
                Extraction du fournisseur, montant, date, IBAN, référence QR.
              </p>
            </div>
          )}

          {step === "review" && extracted && (
            <ReviewStep
              extracted={extracted}
              imageDataUrl={imageDataUrl}
              imageMime={imageMime}
              buildings={buildings}
              buildingId={buildingId}
              onBuildingIdChange={setBuildingId}
              onExtractedChange={setExtracted}
              duplicates={duplicates}
              forceSave={forceSave}
              onForceSaveChange={setForceSave}
              onSave={handleSave}
              onCancel={reset}
              busy={busy}
              formatAmount={formatAmount}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(inner, document.body);
}

function UploadStep({ onFile }: { onFile: (f: File) => void }) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
        Importe une facture (PDF, photo, scan) — l'IA en extrait le fournisseur, la date, le montant TVA inclus, l'IBAN/référence QR et propose la bonne catégorie comptable.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            padding: "26px 16px", borderRadius: 12,
            border: "2px dashed var(--border)", background: "var(--background)",
            cursor: "pointer", color: "var(--foreground)",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
            (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, var(--background))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.background = "var(--background)";
          }}
        >
          <Upload style={{ width: 24, height: 24, color: "var(--primary)" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Choisir un fichier</span>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>PDF, JPG, PNG · max 8 MB</span>
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            padding: "26px 16px", borderRadius: 12,
            border: "2px dashed var(--border)", background: "var(--background)",
            cursor: "pointer", color: "var(--foreground)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
            (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, var(--background))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.background = "var(--background)";
          }}
        >
          <Camera style={{ width: 24, height: 24, color: "var(--primary)" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Prendre une photo</span>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>via l'appareil photo</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

const ACCOUNT_LABEL: Record<number, string> = {
  201: "Assurances",
  202: "Entretien appartements",
  203: "Entretien bâtiment",
  204: "Entretien des espaces verts",
  205: "Entretien machines immeubles",
  206: "Frais d'exploitation et d'entretien du chauffage",
  207: "Frais postaux",
  208: "Annonces locatives / Publicité",
  209: "Frais de gestion locative",
  210: "Frais de conciergerie",
  211: "Débiteurs locataires ouverts",
  212: "Frais divers",
  213: "Électricité",
  214: "Honoraires de gestion",
  215: "Dédommagements locataires pour travaux",
  216: "Frais de buanderie",
  217: "Gaz",
  218: "Eau",
  219: "Autres charges",
  301: "Améliorations et rénovations",
  302: "Isolation",
};

function ReviewStep({
  extracted,
  imageDataUrl,
  imageMime,
  buildings,
  buildingId,
  onBuildingIdChange,
  onExtractedChange,
  duplicates,
  forceSave,
  onForceSaveChange,
  onSave,
  onCancel,
  busy,
  formatAmount,
}: {
  extracted: ExtractedInvoice;
  imageDataUrl: string | null;
  imageMime: string | null;
  buildings: Building[];
  buildingId: string;
  onBuildingIdChange: (id: string) => void;
  onExtractedChange: (next: ExtractedInvoice) => void;
  duplicates: DuplicateMatch[];
  forceSave: boolean;
  onForceSaveChange: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  formatAmount: (n: number) => string;
}) {
  const isDup = duplicates.length > 0 && duplicates[0].score >= 70;

  const set = <K extends keyof ExtractedInvoice>(key: K, value: ExtractedInvoice[K]) =>
    onExtractedChange({ ...extracted, [key]: value });

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "7px 10px", borderRadius: 7, fontSize: 13,
    border: "1px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 650, textTransform: "uppercase",
    letterSpacing: "0.04em", color: "var(--muted-foreground)",
    marginBottom: 3, display: "block",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Image preview */}
      <div style={{
        borderRadius: 10, border: "1px solid var(--border)",
        background: "var(--background)", overflow: "hidden",
        minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {imageDataUrl && imageMime?.startsWith("image/") ? (
          <img src={imageDataUrl} alt="Facture" style={{ width: "100%", height: "auto", display: "block" }} />
        ) : imageDataUrl && imageMime === "application/pdf" ? (
          <iframe src={imageDataUrl} title="Facture PDF" style={{ width: "100%", height: 320, border: "none" }} />
        ) : null}
      </div>

      {/* Extracted fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Confidence */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 style={{
            width: 14, height: 14,
            color: extracted.confidence >= 80 ? "#16A34A" : extracted.confidence >= 50 ? "#D97706" : "#DC2626",
          }} />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            Extraction · confiance <b style={{ color: "var(--foreground)" }}>{extracted.confidence}%</b>
          </span>
        </div>

        {/* Duplicate warning */}
        {duplicates.length > 0 && (
          <div style={{
            padding: "10px 12px", borderRadius: 9,
            background: isDup ? "color-mix(in srgb, #DC2626 10%, transparent)" : "color-mix(in srgb, #F59E0B 10%, transparent)",
            border: `1px solid ${isDup ? "color-mix(in srgb, #DC2626 30%, transparent)" : "color-mix(in srgb, #F59E0B 30%, transparent)"}`,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle style={{ width: 14, height: 14, color: isDup ? "#991B1B" : "#B45309" }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: isDup ? "#991B1B" : "#B45309", margin: 0 }}>
                {isDup ? "Doublon probable détecté" : "Possible doublon"}
              </p>
            </div>
            {duplicates.slice(0, 3).map((d) => (
              <div key={d.tx.id} style={{ fontSize: 11, color: "var(--foreground)" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {d.tx.dateInvoice} · {formatAmount(d.tx.debit || d.tx.credit)} · score {d.score}
                </p>
                <p style={{ margin: "1px 0 0", color: "var(--muted-foreground)", fontSize: 10 }}>
                  {d.tx.description ?? "(sans description)"} · {d.reasons.join(" · ")}
                </p>
              </div>
            ))}
            {isDup && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#991B1B", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={forceSave}
                  onChange={(e) => onForceSaveChange(e.target.checked)}
                />
                Enregistrer malgré le doublon
              </label>
            )}
          </div>
        )}

        <div>
          <label style={labelStyle}>Immeuble *</label>
          <select
            value={buildingId}
            onChange={(e) => onBuildingIdChange(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
            required
          >
            <option value="">— Sélectionner —</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>Date facture</label>
            <input
              type="date"
              value={extracted.invoiceDate ?? ""}
              onChange={(e) => set("invoiceDate", e.target.value || null)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date échéance</label>
            <input
              type="date"
              value={extracted.dueDate ?? ""}
              onChange={(e) => set("dueDate", e.target.value || null)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Fournisseur</label>
          <input
            type="text"
            value={extracted.vendorName ?? ""}
            onChange={(e) => set("vendorName", e.target.value || null)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>Montant total</label>
            <input
              type="number" step={0.01}
              value={extracted.totalAmount ?? ""}
              onChange={(e) => set("totalAmount", e.target.value ? Number(e.target.value) : null)}
              style={{ ...inputStyle, fontWeight: 700 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Devise</label>
            <select
              value={extracted.currency ?? "CHF"}
              onChange={(e) => set("currency", e.target.value as ExtractedInvoice["currency"])}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>TVA</label>
            <input
              type="number" step={0.01}
              value={extracted.vatAmount ?? ""}
              onChange={(e) => set("vatAmount", e.target.value ? Number(e.target.value) : null)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Compte (suggestion IA)</label>
          <select
            value={extracted.suggestedAccount ?? 219}
            onChange={(e) => set("suggestedAccount", Number(e.target.value))}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {Object.entries(ACCOUNT_LABEL).map(([num, label]) => (
              <option key={num} value={num}>{num} — {label}</option>
            ))}
          </select>
        </div>

        {extracted.iban && (
          <div>
            <label style={labelStyle}>IBAN / Référence QR</label>
            <p style={{
              fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "var(--muted-foreground)", margin: 0, wordBreak: "break-all",
            }}>
              {extracted.iban}{extracted.qrReference && ` · ${extracted.qrReference}`}
            </p>
          </div>
        )}

        {extracted.notes && (
          <div style={{
            padding: "8px 10px", borderRadius: 8,
            background: "color-mix(in srgb, #F59E0B 8%, transparent)",
            border: "1px solid color-mix(in srgb, #F59E0B 25%, transparent)",
            fontSize: 11, color: "var(--foreground)",
          }}>
            ⚠ <b>Note IA :</b> {extracted.notes}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button onClick={onCancel} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "var(--background)", color: "var(--foreground)",
            border: "1px solid var(--border)", cursor: "pointer",
          }}>
            Recommencer
          </button>
          <button
            onClick={onSave}
            disabled={busy || !buildingId || (isDup && !forceSave)}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: (busy || !buildingId || (isDup && !forceSave)) ? "var(--border)" : "var(--primary)",
              color: (busy || !buildingId || (isDup && !forceSave)) ? "var(--muted-foreground)" : "var(--primary-foreground)",
              border: "none", cursor: (busy || !buildingId || (isDup && !forceSave)) ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Enregistrement…" : "Enregistrer la facture"}
          </button>
        </div>
      </div>
    </div>
  );
}
