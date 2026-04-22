import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Shield,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  X,
  Users as UsersIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { usePlanLimits, PLANS } from "../lib/billing";
import {
  FEATURES,
  ROLE_PRESETS,
  buildPermissionsFromRole,
  describeRole,
  type FeatureKey,
  type MemberRole,
  type PermissionLevel,
} from "../lib/permissions";

type RolePreset = Exclude<MemberRole, "tenant">;

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  member_role: MemberRole | null;
  permissions: Partial<Record<FeatureKey, PermissionLevel>>;
  is_super_admin: boolean;
}

interface Invitation {
  id: string;
  invited_email: string;
  member_role: RolePreset;
  permissions: Partial<Record<FeatureKey, PermissionLevel>>;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
}

const LEVEL_LABEL: Record<PermissionLevel, string> = {
  none: "Aucun",
  read: "Lecture",
  write: "Accès complet",
};

export function TeamTab() {
  const { user } = useAuth();
  const planState = usePlanLimits();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RolePreset>("manager");
  const [inviteOverrides, setInviteOverrides] = useState<Partial<Record<FeatureKey, PermissionLevel>>>({});
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; emailSent: boolean } | null>(null);

  const isSuperAdmin = !!user?.isSuperAdmin;

  // Seats accounting — active admin members + pending *team* invitations count
  // against the plan's teamSeats limit. Tenant-portal invites have their own
  // cap and must not inflate this counter. null = unlimited (Business).
  const seatCap = planState.limits.teamSeats;
  const teamInvitations = useMemo(
    () => invitations.filter((i) => i.member_role !== "tenant"),
    [invitations],
  );
  const pendingCount = teamInvitations.filter((i) => i.status === "pending").length;
  const seatsUsed = members.length + pendingCount;
  const atLimit = seatCap !== null && seatsUsed >= seatCap;
  const planConfig = PLANS.find((p) => p.id === planState.plan) ?? PLANS[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, member_role, permissions, is_super_admin, role")
          .eq("role", "admin")
          .order("is_super_admin", { ascending: false }),
        supabase
          .from("organization_invitations")
          .select("id, invited_email, member_role, permissions, token, status, expires_at, created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (invitesRes.error) throw invitesRes.error;
      setMembers((membersRes.data as Member[]) ?? []);
      setInvitations((invitesRes.data as Invitation[]) ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const effectiveInvitePermissions = useMemo(() => {
    const base = buildPermissionsFromRole(inviteRole);
    return { ...base, ...inviteOverrides };
  }, [inviteRole, inviteOverrides]);

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteRole("manager");
    setInviteOverrides({});
    setInviteResult(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setError("Email requis");
      return;
    }
    setInviteBusy(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("invite-member", {
        body: {
          email: inviteEmail.trim(),
          memberRole: inviteRole,
          permissions: effectiveInvitePermissions,
        },
      });
      if (fnErr) throw fnErr;
      if (!data?.acceptUrl) throw new Error("Pas d'URL d'invitation retournée");
      setInviteResult({ url: data.acceptUrl, emailSent: !!data.emailSent });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Révoquer cette invitation ?")) return;
    const { error: e } = await supabase.from("organization_invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    if (e) { alert(e.message); return; }
    await load();
  };

  const handleUpdateMember = async (member: Member, role: RolePreset) => {
    const permissions = buildPermissionsFromRole(role);
    const { error: e } = await supabase.from("profiles")
      .update({ member_role: role, permissions })
      .eq("id", member.id);
    if (e) { alert(e.message); return; }
    await load();
  };

  const handleUpdatePermission = async (member: Member, feature: FeatureKey, level: PermissionLevel) => {
    const nextPerms = { ...(member.permissions || {}), [feature]: level };
    const { error: e } = await supabase.from("profiles")
      .update({ permissions: nextPerms })
      .eq("id", member.id);
    if (e) { alert(e.message); return; }
    await load();
  };

  const handleRemoveMember = async (member: Member) => {
    if (member.is_super_admin) { alert("Le super admin ne peut pas être retiré."); return; }
    if (!confirm(`Retirer ${member.email} de la régie ? Son accès sera révoqué.`)) return;
    // We don't delete the auth user (that would purge their data). We just
    // detach them from the org by clearing organization_id.
    const { error: e } = await supabase.from("profiles")
      .update({ organization_id: null })
      .eq("id", member.id);
    if (e) { alert(e.message); return; }
    await load();
  };

  if (!isSuperAdmin) {
    return (
      <div style={{
        padding: 24, borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)",
        color: "var(--muted-foreground)", textAlign: "center",
      }}>
        <Shield size={28} style={{ margin: "0 auto 10px", opacity: 0.6 }} />
        <p style={{ fontSize: 14 }}>Seul le super admin peut gérer l'équipe.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Members section */}
      <Section title="Membres de la régie" description="Gérez les accès de vos collègues à Palier.">
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, flexWrap: "wrap", marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 999,
              background: atLimit ? "rgba(239,68,68,0.10)" : "rgba(99,102,241,0.10)",
              color: atLimit ? "#DC2626" : "#4338CA",
              fontSize: 12, fontWeight: 600,
            }}
          >
            <UsersIcon size={13} />
            Plan {planConfig.name} · {seatsUsed}
            {seatCap !== null ? ` / ${seatCap}` : ""} siège{seatsUsed > 1 ? "s" : ""} utilisé{seatsUsed > 1 ? "s" : ""}
            {seatCap === null && " · illimité"}
          </div>
          <button
            onClick={() => setShowInvite(true)}
            disabled={atLimit}
            title={atLimit ? "Plan au maximum — passez au plan supérieur" : "Inviter un collègue"}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 16px", borderRadius: 10, border: "none",
              background: atLimit ? "var(--border)" : "var(--primary)",
              color: atLimit ? "var(--muted-foreground)" : "var(--primary-foreground)",
              fontSize: 13, fontWeight: 600,
              cursor: atLimit ? "not-allowed" : "pointer",
              opacity: atLimit ? 0.7 : 1,
            }}
          >
            <UserPlus size={14} />
            Inviter un collègue
          </button>
        </div>
        {atLimit && (
          <div
            style={{
              padding: 12, borderRadius: 10,
              background: "rgba(245,158,11,0.10)", color: "#B45309",
              fontSize: 12, marginBottom: 14,
            }}
          >
            Votre plan <strong>{planConfig.name}</strong> est limité à{" "}
            <strong>{seatCap}</strong> siège{seatCap && seatCap > 1 ? "s" : ""}.
            Pour inviter plus de collègues, passez au plan <strong>{planState.plan === "starter" ? "Pro" : "Business"}</strong>.
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: 12 }}>Chargement…</div>
        ) : error ? (
          <div style={{ fontSize: 12, color: "#DC2626", padding: 12 }}>{error}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isSelf={m.id === user?.id}
                onRoleChange={(role) => handleUpdateMember(m, role)}
                onPermissionChange={(f, l) => handleUpdatePermission(m, f, l)}
                onRemove={() => handleRemoveMember(m)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Pending invitations — team only. Tenant-portal invites are managed
          from the Locataires view and shouldn't appear here. */}
      <Section title="Invitations en attente" description="Les invitations expirées ou déjà acceptées sont masquées.">
        {teamInvitations.filter((i) => i.status === "pending").length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>
            Aucune invitation en attente.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {teamInvitations.filter((i) => i.status === "pending").map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                onRevoke={() => handleRevoke(inv.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          email={inviteEmail}
          setEmail={setInviteEmail}
          role={inviteRole}
          setRole={(r) => { setInviteRole(r); setInviteOverrides({}); }}
          overrides={inviteOverrides}
          setOverrides={setInviteOverrides}
          effective={effectiveInvitePermissions}
          busy={inviteBusy}
          result={inviteResult}
          onSend={handleInvite}
          onClose={() => { setShowInvite(false); resetInviteForm(); }}
        />
      )}
    </div>
  );
}

/* ─── Row components ───────────────────────────────────────── */

function MemberRow({
  member, isSelf, onRoleChange, onPermissionChange, onRemove,
}: {
  member: Member;
  isSelf: boolean;
  onRoleChange: (role: RolePreset) => void;
  onPermissionChange: (feature: FeatureKey, level: PermissionLevel) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleLabel = describeRole(member.member_role, member.is_super_admin);

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: member.is_super_admin ? "rgba(250,204,21,0.15)" : "var(--background)",
              color: member.is_super_admin ? "#A16207" : "var(--foreground)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}
          >
            {(member.full_name ?? member.email).slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {member.full_name ?? member.email}{isSelf && " (vous)"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {member.email} · {roleLabel}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!member.is_super_admin && (
            <>
              <select
                value={member.member_role ?? "manager"}
                onChange={(e) => onRoleChange(e.target.value as RolePreset)}
                disabled={isSelf}
                style={{
                  padding: "6px 10px", borderRadius: 8, fontSize: 12,
                  border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
                  cursor: isSelf ? "not-allowed" : "pointer",
                }}
              >
                <option value="admin">Administrateur</option>
                <option value="manager">Gérant</option>
                <option value="accountant">Comptable</option>
                <option value="viewer">Lecture seule</option>
              </select>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                {expanded ? "Masquer" : "Détails"}
              </button>
              {!isSelf && (
                <button
                  onClick={onRemove}
                  title="Retirer de la régie"
                  style={{
                    padding: 6, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
                    background: "transparent", color: "#DC2626", cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {expanded && !member.is_super_admin && member.member_role && member.member_role !== "tenant" && (
        <div style={{
          padding: "10px 14px 14px", borderTop: "1px solid var(--border)",
          background: "var(--background)",
        }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>
            Surcharge par fonctionnalité (override le rôle ci-dessus)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 10px", alignItems: "center" }}>
            {FEATURES.map((f) => {
              const preset = ROLE_PRESETS[member.member_role as RolePreset][f.key];
              const override = member.permissions?.[f.key];
              const effective = override ?? preset;
              return (
                <React.Fragment key={f.key}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--foreground)" }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{f.description}</div>
                  </div>
                  <select
                    value={effective}
                    onChange={(e) => onPermissionChange(f.key, e.target.value as PermissionLevel)}
                    style={{
                      padding: "5px 8px", borderRadius: 6, fontSize: 11,
                      border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
                    }}
                  >
                    <option value="none">{LEVEL_LABEL.none}</option>
                    <option value="read">{LEVEL_LABEL.read}</option>
                    <option value="write">{LEVEL_LABEL.write}</option>
                  </select>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InvitationRow({ invitation, onRevoke }: { invitation: Invitation; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const appBase = window.location.origin;
  const acceptUrl = `${appBase}/?invite_token=${invitation.token}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10,
      background: "var(--card)", gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          {invitation.invited_email}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <Clock size={11} />
          expire le {new Date(invitation.expires_at).toLocaleDateString("fr-CH")}
          {" · "}
          {describeRole(invitation.member_role, false)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(acceptUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          {copied ? "Copié" : "Copier lien"}
        </button>
        <button
          onClick={onRevoke}
          title="Révoquer cette invitation"
          style={{
            padding: 6, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
            background: "transparent", color: "#DC2626", cursor: "pointer",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function InviteModal({
  email, setEmail, role, setRole, overrides, setOverrides, effective,
  busy, result, onSend, onClose,
}: {
  email: string;
  setEmail: (e: string) => void;
  role: RolePreset;
  setRole: (r: RolePreset) => void;
  overrides: Partial<Record<FeatureKey, PermissionLevel>>;
  setOverrides: (o: Partial<Record<FeatureKey, PermissionLevel>>) => void;
  effective: Record<FeatureKey, PermissionLevel>;
  busy: boolean;
  result: { url: string; emailSent: boolean } | null;
  onSend: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--card)", borderRadius: 16, width: "94vw", maxWidth: 620,
        maxHeight: "88vh", display: "flex", flexDirection: "column",
        border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Inviter un collègue</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              Un email avec un lien d'invitation sera envoyé. Vous pouvez aussi copier le lien manuellement.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
          {result ? (
            <div>
              <div style={{
                padding: 14, borderRadius: 10, background: "rgba(22,163,74,0.10)",
                color: "#166534", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                marginBottom: 14,
              }}>
                <CheckCircle size={16} />
                Invitation créée {result.emailSent ? "et envoyée par email" : "— partagez le lien ci-dessous"}.
              </div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>Lien à partager</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  readOnly
                  value={result.url}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--background)",
                    color: "var(--foreground)", fontSize: 12, fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer",
                  }}
                >
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collegue@regie.ch"
                  style={{
                    width: "100%", marginTop: 6, padding: "9px 12px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--card)",
                    color: "var(--foreground)", fontSize: 13, outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Rôle de base</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RolePreset)}
                  style={{
                    width: "100%", marginTop: 6, padding: "9px 12px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--card)",
                    color: "var(--foreground)", fontSize: 13,
                  }}
                >
                  <option value="admin">Administrateur (tout sauf facturation/équipe)</option>
                  <option value="manager">Gérant (locataires, demandes, calendrier — pas de compta)</option>
                  <option value="accountant">Comptable (compta + analytique — lecture sur le reste)</option>
                  <option value="viewer">Lecture seule</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8 }}>
                  Permissions effectives (modifier pour surcharger)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 10px", alignItems: "center" }}>
                  {FEATURES.map((f) => (
                    <React.Fragment key={f.key}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--foreground)" }}>{f.label}</div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{f.description}</div>
                      </div>
                      <select
                        value={effective[f.key]}
                        onChange={(e) =>
                          setOverrides({ ...overrides, [f.key]: e.target.value as PermissionLevel })
                        }
                        style={{
                          padding: "5px 8px", borderRadius: 6, fontSize: 11,
                          border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
                        }}
                      >
                        <option value="none">{LEVEL_LABEL.none}</option>
                        <option value="read">{LEVEL_LABEL.read}</option>
                        <option value="write">{LEVEL_LABEL.write}</option>
                      </select>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: "12px 22px", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--foreground)", cursor: "pointer",
            }}
          >
            {result ? "Fermer" : "Annuler"}
          </button>
          {!result && (
            <button
              onClick={onSend}
              disabled={busy || !email.trim()}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "none", color: "var(--primary-foreground)",
                background: (busy || !email.trim()) ? "var(--border)" : "var(--primary)",
                cursor: (busy || !email.trim()) ? "not-allowed" : "pointer",
                opacity: (busy || !email.trim()) ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <UserPlus size={14} />
              {busy ? "Envoi…" : "Envoyer l'invitation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: 28, padding: 20, border: "1px solid var(--border)",
      borderRadius: 12, background: "var(--card)",
    }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{title}</h3>
        {description && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
