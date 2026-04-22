import React, { useEffect, useState } from "react";
import { Building2, Home, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { PalierLogo } from "./PalierLogo";

interface InvitationPreview {
  invited_email: string;
  member_role: string;
  organization_name: string;
  tenant_unit: string | null;
  building_name: string | null;
  expires_at: string;
}

interface Props {
  token: string;
}

type Mode = "signup" | "login";

export function AcceptInvitePage({ token }: Props) {
  const { login, signupWithInvitation } = useAuth();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const [mode, setMode] = useState<Mode>("signup");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Fetch the invitation preview as an anonymous caller. The SECURITY
  // DEFINER RPC validates the token is pending + unexpired before
  // returning the minimal context we show below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      const { data, error } = await supabase.rpc("get_invitation_preview", {
        p_token: token,
      });
      if (cancelled) return;
      if (error) {
        setPreviewError(error.message);
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setPreviewError("Ce lien d'invitation est invalide ou a expiré.");
      } else {
        const row: InvitationPreview = Array.isArray(data) ? data[0] : data;
        setPreview(row);
      }
      setLoadingPreview(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setFormError(null);

    if (!password) {
      setFormError("Mot de passe requis");
      return;
    }
    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
      setFormError("Prénom et nom requis");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const res = await login(preview.invited_email, password);
        if (!res.ok) {
          setFormError(res.error ?? "Connexion impossible");
          return;
        }
      } else {
        const res = await signupWithInvitation({
          email: preview.invited_email,
          password,
          fullName: `${firstName.trim()} ${lastName.trim()}`,
        });
        if (!res.ok) {
          setFormError(res.error ?? "Création de compte impossible");
          return;
        }
      }
      // On success, App.tsx's existing effect will detect the
      // `invite_token` query param, call accept_organization_invitation,
      // scrub the URL, and reload.
    } finally {
      setBusy(false);
    }
  };

  const isTenant = preview?.member_role === "tenant";
  const orgName = preview?.organization_name ?? "";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "var(--background)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "0 20px 48px rgba(28,32,30,0.12)",
          overflow: "hidden",
        }}
      >
        {/* ── Brand bar ── */}
        <div
          style={{
            padding: "18px 22px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <PalierLogo size={28} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Palier</div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Gestion immobilière</div>
          </div>
        </div>

        <div style={{ padding: "24px 22px 22px" }}>
          {loadingPreview && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
              <Loader2 className="w-5 h-5" style={{ margin: "0 auto 10px", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 13, margin: 0 }}>Vérification du lien…</p>
            </div>
          )}

          {!loadingPreview && previewError && (
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                Lien invalide
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  marginTop: 10,
                  marginBottom: 18,
                  lineHeight: 1.5,
                }}
              >
                {previewError} Demandez à votre régie de vous renvoyer une nouvelle invitation.
              </p>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Retour à l'accueil
              </a>
            </div>
          )}

          {!loadingPreview && preview && (
            <>
              {/* ── Context card ── */}
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--foreground)",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.25,
                }}
              >
                {isTenant ? "Accès à votre portail locataire" : "Invitation à rejoindre Palier"}
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 8, lineHeight: 1.5 }}>
                <strong style={{ color: "var(--foreground)" }}>{orgName}</strong> vous invite
                {isTenant ? " à accéder à votre espace locataire." : " à rejoindre l'équipe sur Palier."}
              </p>

              {isTenant && (preview.building_name || preview.tenant_unit) && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Home style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.45 }}>
                    Votre logement :{" "}
                    <strong>{preview.building_name ?? "—"}</strong>
                    {preview.tenant_unit ? <> · unité {preview.tenant_unit}</> : null}
                  </div>
                </div>
              )}

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                {/* Email — read-only, tied to the invitation */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      height: 44,
                      padding: "0 14px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                      fontSize: 13,
                    }}
                  >
                    <ShieldCheck style={{ width: 14, height: 14, color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preview.invited_email}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                    L'invitation est rattachée à cette adresse.
                  </p>
                </div>

                {mode === "signup" && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Prénom</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Nom</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    style={inputStyle}
                  />
                </div>

                {formError && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "#B91C1C",
                      padding: "10px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      marginBottom: 14,
                    }}
                  >
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    width: "100%",
                    height: 46,
                    borderRadius: 12,
                    border: "none",
                    background: busy ? "color-mix(in srgb, var(--primary) 70%, black)" : "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: busy ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: busy ? 0.8 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {busy && <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} />}
                  {mode === "signup"
                    ? busy
                      ? "Création…"
                      : "Créer mon accès"
                    : busy
                      ? "Connexion…"
                      : "Se connecter"}
                </button>

                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signup" ? "login" : "signup");
                      setFormError(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted-foreground)",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    {mode === "signup" ? "J'ai déjà un compte → Se connecter" : "Créer un nouveau compte"}
                  </button>
                </div>
              </form>

              {/* ── Security note ── */}
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.5,
                }}
              >
                <Building2 style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />
                <span>
                  Seule l'adresse email invitée peut activer ce lien. Le compte créé sera
                  automatiquement rattaché à {orgName}.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};
