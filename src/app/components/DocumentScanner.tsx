import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Trash2, FileDown, Wand2 } from "lucide-react";
import jsPDF from "jspdf";

interface DocumentScannerProps {
  open: boolean;
  suggestedFilename?: string;
  onClose: () => void;
}

type Page = {
  id: string;
  original: string; // data URL
  processed: string; // data URL (document-enhanced)
};

// Applies a document-like enhancement to an image: convert to grayscale,
// boost contrast, and slightly push white to white. Runs fully in the
// browser via a canvas — no network required.
async function enhance(dataUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  // Cap resolution to keep PDFs reasonable (~1800px longest edge).
  const maxEdge = 1800;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  // Contrast boost + grayscale — classic "document" look.
  const contrast = 1.45;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let v = gray * contrast + intercept;
    if (v > 245) v = 255; // push near-whites to pure white
    if (v < 20) v = 0;
    v = Math.max(0, Math.min(255, v));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/jpeg", 0.85);
}

async function savePdfFromPages(pages: Page[], filename: string) {
  if (pages.length === 0) return;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    const page = pages[i];
    // Fit into A4 with 10mm margin, preserving aspect ratio.
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const boxW = pageW - margin * 2;
    const boxH = pageH - margin * 2;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = page.processed;
    });
    const ratio = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    doc.addImage(page.processed, "JPEG", x, y, w, h);
  }

  const blob = doc.output("blob");
  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  try {
    const file = new File([blob], name, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch {
    /* fall through */
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DocumentScanner({ open, suggestedFilename, onClose }: DocumentScannerProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const incoming = Array.from(files);
    for (const f of incoming) {
      try {
        const original = await fileToDataUrl(f);
        const processed = await enhance(original);
        setPages((prev) => [...prev, {
          id: `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          original,
          processed,
        }]);
      } catch {
        /* skip bad image */
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setBusy(true);
    try {
      await savePdfFromPages(pages, suggestedFilename || `scan_${new Date().toISOString().slice(0, 10)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setPages([]);
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--card)", borderRadius: 16, width: "94vw", maxWidth: 720,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 22px", borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
              Scanner un document
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              Prenez les pages une par une, elles seront combinées en un PDF.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {pages.length === 0 ? (
            <div
              style={{
                padding: "40px 20px", border: "1px dashed var(--border)", borderRadius: 12,
                textAlign: "center", color: "var(--muted-foreground)", background: "var(--background)",
              }}
            >
              <Wand2 size={28} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Aucune page ajoutée — appuyez sur "Prendre une photo" pour commencer.
              </p>
              <p style={{ fontSize: 11 }}>
                Les pages sont automatiquement rendues en noir et blanc contrasté.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  style={{
                    position: "relative", border: "1px solid var(--border)", borderRadius: 10,
                    overflow: "hidden", background: "#fff",
                  }}
                >
                  <img src={page.processed} alt={`page ${idx + 1}`} style={{ width: "100%", display: "block" }} />
                  <div
                    style={{
                      position: "absolute", top: 4, left: 4,
                      background: "rgba(0,0,0,0.65)", color: "#fff",
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPages((prev) => prev.filter((p) => p.id !== page.id))}
                    title="Retirer cette page"
                    style={{
                      position: "absolute", top: 4, right: 4, width: 22, height: 22,
                      borderRadius: "50%", border: "none",
                      background: "rgba(220,38,38,0.9)", color: "white",
                      fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 22px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <label
              style={{
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "var(--primary)", color: "var(--primary-foreground)",
                opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto",
              }}
            >
              <Camera size={14} />
              {pages.length === 0 ? "Prendre une photo" : "Page suivante"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => handlePick(e.target.files)}
                style={{ display: "none" }}
                disabled={busy}
              />
            </label>
            {pages.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                disabled={busy}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: "1px solid var(--border)", background: "var(--card)",
                  color: "var(--foreground)", cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <Trash2 size={13} />
                Vider
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={busy || pages.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "none", color: "var(--primary-foreground)",
              background: pages.length > 0 ? "var(--primary)" : "var(--border)",
              cursor: busy || pages.length === 0 ? "not-allowed" : "pointer",
              opacity: busy || pages.length === 0 ? 0.6 : 1,
            }}
          >
            <FileDown size={14} />
            {busy ? "…" : `Enregistrer en PDF${pages.length > 0 ? ` (${pages.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
