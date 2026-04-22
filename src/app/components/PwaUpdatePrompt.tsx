import React, { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * Listens for a new service worker version and surfaces a small amber
 * banner inviting the user to reload. iOS in particular won't pick up a
 * new deploy until the app is fully closed, so we expose an explicit
 * "Mettre à jour" button that triggers updateSW(true) and reloads the
 * page. On desktop / Android this banner typically appears a few
 * seconds after visiting a freshly-deployed build.
 */
export function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(reload?: boolean) => Promise<void>>(() => async () => {});

  useEffect(() => {
    const fn = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      // Do NOT auto-reload — we want the user to confirm so they don't
      // lose unsaved form state.
      immediate: true,
    });
    setUpdateSW(() => fn);
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--card)",
        color: "var(--foreground)",
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B45309" }} />
        Nouvelle version disponible.
      </span>
      <button
        onClick={() => updateSW(true)}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        Mettre à jour
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        title="Plus tard"
        style={{
          padding: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted-foreground)",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
