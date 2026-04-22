import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SignaturePadProps {
  open: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

// Pure-canvas signature pad. Supports mouse and touch (finger or Apple
// Pencil) input. Returns the signature as a PNG data URL, ready to be
// embedded in a jsPDF document via doc.addImage().
export function SignaturePad({ open, title, onCancel, onConfirm }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const [empty, setEmpty] = useState(true);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const { width } = parent.getBoundingClientRect();
    const targetWidth = width - 24;
    const targetHeight = Math.round(targetWidth / 2.8);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(targetWidth * dpr);
    canvas.height = Math.round(targetHeight * dpr);
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }, []);

  useEffect(() => {
    if (!open) return;
    hasStrokes.current = false;
    setEmpty(true);
    // Setup after the modal is mounted and sized.
    const raf = requestAnimationFrame(setupCanvas);
    window.addEventListener("resize", setupCanvas);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setupCanvas);
    };
  }, [open, setupCanvas]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    const pos = getPos(e);
    if (!pos) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasStrokes.current) {
      hasStrokes.current = true;
      setEmpty(false);
    }
  };

  const handleUp = () => {
    drawing.current = false;
  };

  const handleClear = () => {
    setupCanvas();
    hasStrokes.current = false;
    setEmpty(true);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: "var(--card)", borderRadius: 16, width: "92vw", maxWidth: 640,
          border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 22px", borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
            {title ?? "Signature"}
          </div>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <div
            style={{
              padding: 12, border: "1px solid var(--border)", borderRadius: 10,
              background: "#fff",
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handleDown}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerLeave={handleUp}
              onPointerCancel={handleUp}
              style={{
                display: "block", touchAction: "none", cursor: "crosshair",
                background: "#fff", borderRadius: 8,
              }}
            />
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6, textAlign: "center" }}>
              Signez au doigt ou à la souris dans la zone ci-dessus.
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "12px 22px", borderTop: "1px solid var(--border)",
            display: "flex", gap: 8, justifyContent: "space-between",
          }}
        >
          <button
            onClick={handleClear}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--foreground)", cursor: "pointer",
            }}
          >
            Effacer
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={empty}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "none", color: "var(--primary-foreground)",
                background: empty ? "var(--border)" : "var(--primary)",
                cursor: empty ? "not-allowed" : "pointer", opacity: empty ? 0.6 : 1,
              }}
            >
              Valider la signature
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
