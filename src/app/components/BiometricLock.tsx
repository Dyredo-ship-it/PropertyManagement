import React, { useEffect, useState } from "react";
import { Fingerprint, Lock } from "lucide-react";
import { requestBiometricUnlock, disableBiometric } from "../lib/biometric";
import { PalierLogo } from "./PalierLogo";

interface BiometricLockProps {
  onUnlock: () => void;
  onSignOut: () => void;
}

export function BiometricLock({ onUnlock, onSignOut }: BiometricLockProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const attempt = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await requestBiometricUnlock();
      if (ok) {
        onUnlock();
      } else {
        setError("Déverrouillage annulé.");
      }
    } catch (err) {
      setError((err as Error).message ?? "Échec du déverrouillage.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Prompt immediately on mount so the user doesn't have to tap first.
    const id = setTimeout(() => { void attempt(); }, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTurnOffAndSignOut = () => {
    if (confirm("Désactiver le verrouillage biométrique et se déconnecter ?")) {
      disableBiometric();
      onSignOut();
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--background)", color: "var(--foreground)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <PalierLogo size={56} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Palier verrouillé</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 8 }}>
          Confirmez votre identité pour accéder à l'application.
        </p>

        <button
          type="button"
          onClick={attempt}
          disabled={busy}
          style={{
            marginTop: 28, padding: "14px 20px", borderRadius: 12,
            border: "none", cursor: busy ? "not-allowed" : "pointer",
            background: "var(--primary)", color: "var(--primary-foreground)",
            fontSize: 14, fontWeight: 600, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Fingerprint size={18} />
          {busy ? "En attente…" : "Déverrouiller"}
        </button>

        {error && (
          <p style={{ fontSize: 12, color: "#DC2626", marginTop: 14 }}>{error}</p>
        )}

        <button
          type="button"
          onClick={handleTurnOffAndSignOut}
          style={{
            marginTop: 20, padding: "8px 14px", borderRadius: 8,
            background: "none", color: "var(--muted-foreground)",
            border: "none", fontSize: 12, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Lock size={12} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
