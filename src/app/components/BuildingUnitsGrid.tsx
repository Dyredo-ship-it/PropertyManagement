import React, { useMemo, useState } from "react";
import { Home, Car, Warehouse, CheckCircle, AlertCircle, AlertTriangle, Clock } from "lucide-react";
import type { Building, Tenant, AccountingSettings } from "../utils/storage";
import { tenantMonthStatus, type RentMonthStatus } from "../utils/rentStatus";
import { getOrgRentSettings, getAccountingTransactions } from "../utils/storage";

type TileStatus = RentMonthStatus | "vacant";

type TileData = {
  unitName: string;
  unitType: "appartement" | "garage" | "place_de_parc" | "autre";
  tenant: Tenant | null;
  status: TileStatus;
  daysLate?: number;
};

const STATUS_STYLES: Record<TileStatus, {
  bg: string;
  border: string;
  ring: string;
  fg: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
}> = {
  paid: {
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.35)",
    ring: "#16a34a",
    fg: "#166534",
    icon: CheckCircle,
    label: "Loyer payé",
  },
  "paid-late": {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.40)",
    ring: "#d97706",
    fg: "#92400e",
    icon: Clock,
    label: "Payé en retard",
  },
  overdue: {
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.40)",
    ring: "#dc2626",
    fg: "#991B1B",
    icon: AlertCircle,
    label: "Impayé",
  },
  unpaid: {
    bg: "var(--card)",
    border: "var(--border)",
    ring: "#9ca3af",
    fg: "var(--muted-foreground)",
    icon: Clock,
    label: "Pas encore dû",
  },
  vacant: {
    bg: "var(--background)",
    border: "var(--border)",
    ring: "#d1d5db",
    fg: "var(--muted-foreground)",
    icon: AlertTriangle,
    label: "Vacant",
  },
};

const UNIT_TYPE_ICONS = {
  appartement: Home,
  garage: Warehouse,
  place_de_parc: Car,
  autre: Home,
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .filter((c) => /[A-Za-zÀ-ÿ]/.test(c))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function inferUnitType(unit: string, stored?: Record<string, "appartement" | "garage" | "place_de_parc" | "autre">): TileData["unitType"] {
  if (stored?.[unit]) return stored[unit];
  const lower = unit.toLowerCase();
  if (lower.startsWith("garage")) return "garage";
  if (lower.startsWith("place")) return "place_de_parc";
  return "appartement";
}

export function BuildingUnitsGrid({
  building,
  tenants,
  acctSettings,
}: {
  building: Building;
  tenants: Tenant[];
  acctSettings: AccountingSettings;
}) {
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);

  const tiles = useMemo<TileData[]>(() => {
    const settings = getOrgRentSettings();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const txs = getAccountingTransactions(building.id);

    const unitList = acctSettings.units?.length
      ? acctSettings.units
      : Array.from(new Set(tenants.map((t) => t.unit).filter(Boolean)));

    return unitList.map<TileData>((unit) => {
      const unitType = inferUnitType(unit, acctSettings.unitTypes);
      const assignedId = acctSettings.unitAssignments?.[unit];
      const tenant =
        tenants.find((t) => t.id === assignedId && t.status === "active") ??
        tenants.find((t) => t.unit === unit && t.status === "active") ??
        null;

      if (!tenant) {
        return { unitName: unit, unitType, tenant: null, status: "vacant" };
      }

      // Garages / places de parc don't show payment status (too little
      // signal, often bundled with apartment leases). Show a plain
      // "assigned" state by reusing the unpaid neutral style.
      if (unitType !== "appartement") {
        return { unitName: unit, unitType, tenant, status: "unpaid" };
      }

      const row = tenantMonthStatus(tenant, year, month, settings, txs);
      return {
        unitName: unit,
        unitType,
        tenant,
        status: row.status,
        daysLate: row.daysLate,
      };
    });
  }, [building.id, tenants, acctSettings]);

  const counts = useMemo(() => {
    const c: Record<TileStatus, number> = { paid: 0, "paid-late": 0, overdue: 0, unpaid: 0, vacant: 0 };
    tiles.forEach((t) => { c[t.status] += 1; });
    return c;
  }, [tiles]);

  if (tiles.length === 0) {
    return null;
  }

  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid var(--border)",
      background: "var(--card)",
      padding: "16px 18px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            État des unités — {monthLabel(new Date())}
          </h3>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
            Vue d'ensemble des {tiles.length} unités avec leur statut de paiement pour le mois en cours
          </p>
        </div>
        <Legend counts={counts} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        {tiles.map((tile) => (
          <Tile
            key={tile.unitName}
            tile={tile}
            hovered={hoveredUnit === tile.unitName}
            onHover={(active) => setHoveredUnit(active ? tile.unitName : null)}
          />
        ))}
      </div>
    </div>
  );
}

function Tile({
  tile,
  hovered,
  onHover,
}: {
  tile: TileData;
  hovered: boolean;
  onHover: (active: boolean) => void;
}) {
  const style = STATUS_STYLES[tile.status];
  const TypeIcon = UNIT_TYPE_ICONS[tile.unitType];
  const StatusIcon = style.icon;

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        position: "relative",
        borderRadius: 12,
        padding: "12px 12px 10px",
        border: `1px solid ${style.border}`,
        background: style.bg,
        minHeight: 92,
        cursor: "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 20px ${style.border}` : "none",
      }}
    >
      {/* Status indicator strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: style.ring,
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
      }} />

      {/* Top row: type icon + status icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <TypeIcon style={{ width: 13, height: 13, color: style.fg, opacity: 0.7 }} />
        <StatusIcon style={{ width: 14, height: 14, color: style.ring }} />
      </div>

      {/* Unit label */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--foreground)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: 4,
      }}>
        {tile.unitName}
      </div>

      {/* Tenant row */}
      {tile.tenant ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            background: style.ring, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(tile.tenant.name)}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 500, color: style.fg,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, minWidth: 0,
          }}>
            {tile.tenant.name.split(" ")[0]}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 10, fontStyle: "italic", color: style.fg, opacity: 0.7 }}>
          Vacant
        </span>
      )}

      {/* Days-late badge */}
      {tile.daysLate && tile.daysLate > 0 && (
        <div style={{
          position: "absolute", top: 8, right: 34,
          fontSize: 9, fontWeight: 700,
          padding: "1px 6px", borderRadius: 10,
          background: style.ring, color: "#fff",
        }}>
          +{tile.daysLate}j
        </div>
      )}
    </div>
  );
}

function Legend({ counts }: { counts: Record<TileStatus, number> }) {
  const entries: { key: TileStatus; label: string }[] = [
    { key: "paid", label: "Payé" },
    { key: "paid-late", label: "Payé tard" },
    { key: "overdue", label: "Impayé" },
    { key: "vacant", label: "Vacant" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {entries.map((e) => (
        <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted-foreground)" }}>
          <span style={{
            width: 10, height: 10, borderRadius: 3,
            background: STATUS_STYLES[e.key].ring,
          }} />
          <span>{e.label}</span>
          {counts[e.key] > 0 && (
            <span style={{ fontWeight: 700, color: "var(--foreground)" }}>
              {counts[e.key]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("fr-CH", { month: "long", year: "numeric" });
}
