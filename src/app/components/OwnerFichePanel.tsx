import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, Phone, MapPin, CreditCard, StickyNote, X, User } from "lucide-react";
import { getOwner, type Owner } from "../utils/storage";

interface Props {
  ownerId: string | null;
  open: boolean;
  onClose: () => void;
}

export function OwnerFichePanel({ ownerId, open, onClose }: Props) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ownerId) return;
    let cancelled = false;
    setLoading(true);
    getOwner(ownerId).then((o) => {
      if (!cancelled) {
        setOwner(o);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [ownerId, open]);

  // Lock body scroll while the modal is mounted.
  useEffect(() => {
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "0 20px 48px rgba(28,32,30,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Propriétaire
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginTop: 1 }}>
                {loading ? "Chargement…" : owner?.name ?? "—"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--muted-foreground)", padding: 6, borderRadius: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 20px 18px" }}>
          {!loading && !owner && (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "12px 0" }}>
              Aucun propriétaire associé à ce bâtiment.
            </div>
          )}
          {owner && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InfoLine icon={Mail}  label="Email"   value={owner.email} />
              <InfoLine icon={Phone} label="Téléphone" value={owner.phone} />
              <InfoLine icon={MapPin} label="Adresse" value={owner.address} />
              <InfoLine icon={CreditCard} label="IBAN" value={owner.iban} mono />
              {owner.notes && <InfoLine icon={StickyNote} label="Notes" value={owner.notes} multiline />}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InfoLine({
  icon: Icon, label, value, mono, multiline,
}: {
  icon: any; label: string; value?: string; mono?: boolean; multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      background: "var(--background)",
      border: "1px solid var(--border)",
    }}>
      <Icon style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 13, color: "var(--foreground)", marginTop: 2,
            wordBreak: mono ? "break-all" : "normal",
            fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
            whiteSpace: multiline ? "pre-wrap" : "normal",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
