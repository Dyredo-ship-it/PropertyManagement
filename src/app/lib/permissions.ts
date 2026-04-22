// Team member permissions model.
// A user has an org-level role (super_admin, admin, manager, accountant,
// viewer) AND an optional per-feature override map. Super admins always
// have full access — the role presets are just defaults; overrides let
// the super admin allow/deny any individual feature on a per-member basis.

export type PermissionLevel = "none" | "read" | "write";

export type FeatureKey =
  | "dashboard"
  | "buildings"
  | "tenants"
  | "requests"
  | "interventions"
  | "services"
  | "calendar"
  | "accounting"
  | "analytics"
  | "settings"
  | "team"
  | "billing";

export type MemberRole = "admin" | "manager" | "accountant" | "viewer" | "tenant";

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  description: string;
}

export const FEATURES: FeatureDef[] = [
  { key: "dashboard",    label: "Tableau de bord", description: "Vue d'ensemble de la régie." },
  { key: "buildings",    label: "Bâtiments",       description: "Immeubles et unités." },
  { key: "tenants",      label: "Locataires",      description: "Dossiers locataires, notes, documents." },
  { key: "requests",     label: "Demandes",        description: "Maintenance et candidatures." },
  { key: "interventions", label: "Interventions",  description: "Suivi des interventions techniques." },
  { key: "services",     label: "Prestataires",    description: "Annuaire des prestataires." },
  { key: "calendar",     label: "Calendrier",      description: "Visites, inspections, rendez-vous." },
  { key: "accounting",   label: "Comptabilité",    description: "Transactions, comptes de gérance, décomptes de charges." },
  { key: "analytics",    label: "Analytique",      description: "Graphiques et indicateurs financiers." },
  { key: "settings",     label: "Paramètres",      description: "Préférences, société, plan comptable." },
  { key: "team",         label: "Équipe",          description: "Inviter des collègues, gérer les permissions." },
  { key: "billing",      label: "Facturation",     description: "Plan ImmoStore / Palier, paiements, abonnement." },
];

// Preset permission sets applied when a role is first assigned.
// Super admin is not in this map — they always get write everywhere.
export const ROLE_PRESETS: Record<Exclude<MemberRole, "tenant">, Record<FeatureKey, PermissionLevel>> = {
  admin: {
    dashboard: "write", buildings: "write", tenants: "write", requests: "write",
    interventions: "write", services: "write", calendar: "write", accounting: "write",
    analytics: "write", settings: "write", team: "none", billing: "none",
  },
  manager: {
    dashboard: "write", buildings: "write", tenants: "write", requests: "write",
    interventions: "write", services: "write", calendar: "write", accounting: "none",
    analytics: "none", settings: "read", team: "none", billing: "none",
  },
  accountant: {
    dashboard: "read", buildings: "read", tenants: "read", requests: "read",
    interventions: "read", services: "read", calendar: "read", accounting: "write",
    analytics: "write", settings: "read", team: "none", billing: "none",
  },
  viewer: {
    dashboard: "read", buildings: "read", tenants: "read", requests: "read",
    interventions: "read", services: "read", calendar: "read", accounting: "read",
    analytics: "read", settings: "read", team: "none", billing: "none",
  },
};

export interface PermissionContext {
  isSuperAdmin: boolean;
  role: MemberRole | null;
  permissions: Partial<Record<FeatureKey, PermissionLevel>>;
}

const LEVEL_ORDER: Record<PermissionLevel, number> = { none: 0, read: 1, write: 2 };

export function getEffectivePermission(
  ctx: PermissionContext,
  feature: FeatureKey,
): PermissionLevel {
  if (ctx.isSuperAdmin) return "write";
  // Explicit override takes precedence over the role default.
  const override = ctx.permissions[feature];
  if (override) return override;
  if (!ctx.role || ctx.role === "tenant") return "none";
  return ROLE_PRESETS[ctx.role][feature] ?? "none";
}

/**
 * Returns true iff the given user has at least the requested level on
 * the feature. `can(ctx, "accounting", "read")` == true means they can
 * at least view the Comptabilité section.
 */
export function can(
  ctx: PermissionContext,
  feature: FeatureKey,
  level: PermissionLevel = "read",
): boolean {
  const effective = getEffectivePermission(ctx, feature);
  return LEVEL_ORDER[effective] >= LEVEL_ORDER[level];
}

export function buildPermissionsFromRole(role: Exclude<MemberRole, "tenant">): Record<FeatureKey, PermissionLevel> {
  return { ...ROLE_PRESETS[role] };
}

export function describeRole(role: MemberRole | null, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "Super admin";
  switch (role) {
    case "admin": return "Administrateur";
    case "manager": return "Gérant";
    case "accountant": return "Comptable";
    case "viewer": return "Lecture seule";
    case "tenant": return "Locataire";
    default: return "—";
  }
}
