import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RenovationTracker } from "./RenovationTracker";
import {
  Building2,
  Plus,
  MapPin,
  Users,
  Edit,
  Trash2,
  Home,
  TrendingUp,
  X,
  ArrowLeft,
  Banknote,
  ChevronRight,
  Wrench,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Settings,
  Car,
  Warehouse,
} from "lucide-react";
import { getBuildings, saveBuildings, getTenants, getMaintenanceRequests, getAccountingSettings, saveAccountingSettings, type Building, type Currency, type Tenant, type MaintenanceRequest, type AccountingSettings } from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";

/* ─── Helpers ────────────────────────────────────────────────── */

const BUILDING_PHOTOS = [
  "/building-1.jpg",
  "/building-2.jpg",
  "/building-3.jpg",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80",
];

// formatCHF removed — use formatAmount from CurrencyContext instead

type BuildingsViewProps = {
  onSelectBuilding?: (buildingId: string) => void;
  initialSelectedId?: string | null;
};

/* ─── Building Card (image overlay) ─────────────────────────── */

function BuildingBubble({
  building,
  index,
  onClick,
  onEdit,
  onDelete,
  t,
  formattedRevenue,
}: {
  building: Building;
  index: number;
  onClick: () => void;
  onEdit: (b: Building) => void;
  onDelete: (id: string) => void;
  t: (k: string) => string;
  formattedRevenue: string;
}) {
  const photo = building.imageUrl || BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];
  const occPct =
    building.units > 0
      ? Math.round((building.occupiedUnits / building.units) * 100)
      : 0;

  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{ position: "relative", minHeight: 320 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          minHeight: 320,
          borderRadius: 20,
          overflow: "hidden",
          border: "none",
          padding: 0,
          cursor: "pointer",
          transition: "transform 0.3s, box-shadow 0.3s",
          boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.22)" : "0 4px 24px rgba(0,0,0,0.12)",
          transform: hovered ? "scale(1.02)" : "scale(1)",
        }}
      >
        {/* Background image — full cover */}
        <img
          src={photo}
          alt={building.name}
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Dark gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0.12) 100%)",
          }}
        />

        {/* Occupancy badge — top left */}
        <span
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 20,
            background: occPct >= 90 ? "#15803D" : occPct >= 70 ? "var(--primary)" : "#B45309",
            color: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {occPct}%
        </span>

        {/* Content overlaid on image */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 22,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          {/* Building name */}
          <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, color: "#FFFFFF", margin: 0, marginBottom: 4 }}>
            {building.name}
          </h3>

          {/* Address */}
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin style={{ width: 14, height: 14, flexShrink: 0 }} />
            {building.address}
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Home style={{ width: 14, height: 14, color: "rgba(255,255,255,0.6)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
                {building.occupiedUnits}/{building.units}
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.25)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
                {formattedRevenue}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Edit / Delete on hover — top right */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          gap: 6,
          zIndex: 10,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(building); }}
          style={{
            width: 32, height: 32, borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
            cursor: "pointer",
            color: "#FFFFFF",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        >
          <Edit style={{ width: 14, height: 14 }} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(building.id); }}
          style={{
            width: 32, height: 32, borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
            cursor: "pointer",
            color: "#FFFFFF",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

/* ─── Building Detail Panel ──────────────────────────────────── */

function BuildingDetail({
  building,
  index,
  onBack,
  onEdit,
  onDelete,
  t,
  formattedRevenue,
}: {
  building: Building;
  index: number;
  onBack: () => void;
  onEdit: (b: Building) => void;
  onDelete: (id: string) => void;
  t: (k: string) => string;
  formattedRevenue: string;
}) {
  const photo = building.imageUrl || BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];
  const occPct =
    building.units > 0
      ? Math.round((building.occupiedUnits / building.units) * 100)
      : 0;
  const occColor = occPct >= 90 ? "#15803D" : occPct >= 70 ? "var(--primary)" : "#B45309";

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* ── Header: back + title + actions ──────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--muted-foreground)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--foreground)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 650, margin: 0, lineHeight: 1.2,
              color: "var(--foreground)",
              borderLeft: "4px solid var(--primary)",
              paddingLeft: 12,
            }}>
              {building.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, paddingLeft: 16 }}>
              <MapPin style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{building.address}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => onEdit(building)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 550,
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--foreground)", cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
          >
            <Edit style={{ width: 13, height: 13 }} />
            {t("editBuilding")}
          </button>
          <button
            type="button"
            onClick={() => onDelete(building.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 550,
              border: "1px solid rgba(239,68,68,0.2)", background: "transparent",
              color: "#DC2626", cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            {t("confirmDeleteBuilding")}
          </button>
        </div>
      </div>

      {/* ── Top card: image + stats side by side ────────────── */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 16,
      }}>
        {/* Image — compact */}
        <div style={{
          width: 220, height: 160, borderRadius: 14, overflow: "hidden",
          flexShrink: 0, border: "1px solid var(--border)",
          position: "relative",
        }}>
          <img
            src={photo}
            alt={building.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Stats strip — horizontal */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { label: t("totalUnits"), value: building.units.toString(), icon: Home },
            { label: t("occupiedUnits"), value: building.occupiedUnits.toString(), icon: Users },
            { label: t("occupancyRate"), value: `${occPct}%`, icon: TrendingUp, accent: true },
            { label: t("monthlyRevenue"), value: formattedRevenue, icon: Banknote },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                style={{
                  padding: "16px 14px",
                  borderRadius: 12,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderLeft: s.accent ? `3px solid ${occColor}` : "1px solid var(--border)",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: "rgba(69,85,58,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 10,
                }}>
                  <Icon style={{ width: 13, height: 13, color: "var(--primary)" }} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.1 }}>
                  {s.value}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 550, textTransform: "uppercase",
                  letterSpacing: "0.05em", color: "var(--muted-foreground)", marginTop: 3,
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <BuildingTabs building={building} t={t} occPct={occPct} occColor={occColor} formattedRevenue={formattedRevenue} />
    </div>
  );
}

/* ─── Building Tabs ──────────────────────────────────────────── */

const TAB_LIST = [
  { key: "overview", label: "Vue d'ensemble", icon: BarChart3 },
  { key: "tenants", label: "Locataires", icon: Users },
  { key: "renovations", label: "Rénovations", icon: Wrench },
  { key: "maintenance", label: "Maintenance", icon: AlertCircle },
  { key: "settings", label: "Paramètres", icon: Settings },
] as const;

type TabKey = typeof TAB_LIST[number]["key"];

function BuildingTabs({ building, t, occPct, occColor, formattedRevenue }: {
  building: Building; t: (k: string) => string;
  occPct: number; occColor: string; formattedRevenue: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [bTenants, setBTenants] = useState<Tenant[]>([]);
  const [bRequests, setBRequests] = useState<MaintenanceRequest[]>([]);
  const [acctSettings, setAcctSettings] = useState<AccountingSettings>({ units: [], categories: [], subCategories: [] });
  const [settingsNewUnit, setSettingsNewUnit] = useState("");

  useEffect(() => {
    setBTenants(getTenants().filter((tn: any) => tn.buildingId === building.id));
    setBRequests(getMaintenanceRequests().filter((r) => r.buildingId === building.id));
    setAcctSettings(getAccountingSettings(building.id));
  }, [building.id]);

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TAB_LIST.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px", fontSize: 12, fontWeight: 600,
                border: "none", cursor: "pointer",
                background: "transparent",
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
            >
              <Icon style={{ width: 14, height: 14 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Occupancy bar */}
          <div style={{ padding: "14px 18px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("occupancyRate")}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>{occPct}%</span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  ({building.occupiedUnits}/{building.units} {t("unit")})
                </span>
              </div>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 99, overflow: "hidden", background: "var(--background)" }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${occPct}%`, background: occColor, transition: "width 0.4s ease" }} />
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>
                {t("tenants") || "Locataires"}
              </span>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginTop: 4 }}>{bTenants.length}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>
                Demandes ouvertes
              </span>
              <div style={{ fontSize: 20, fontWeight: 700, color: bRequests.filter(r => r.status !== "completed").length > 0 ? "#F59E0B" : "var(--foreground)", marginTop: 4 }}>
                {bRequests.filter(r => r.status !== "completed").length}
              </div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>
                {t("monthlyRevenue")}
              </span>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", marginTop: 4 }}>{formattedRevenue}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tenants" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bTenants.length === 0 ? (
            <div style={{ padding: "48px 24px", borderRadius: 14, textAlign: "center", background: "var(--card)", border: "1px solid var(--border)" }}>
              <Users style={{ width: 32, height: 32, color: "var(--border)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Aucun locataire dans ce bâtiment</p>
            </div>
          ) : (
            bTenants.map((tn: any) => {
              const tenantRequests = bRequests.filter(r => r.tenantId === tn.id);
              const openReqs = tenantRequests.filter(r => r.status !== "completed").length;
              return (
                <div key={tn.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12,
                  background: "var(--card)", border: "1px solid var(--border)",
                  transition: "box-shadow 0.15s",
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: "rgba(69,85,58,0.07)", color: "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {tn.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{tn.name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                        background: tn.status === "active" ? "rgba(34,197,94,0.08)" : "rgba(107,114,128,0.08)",
                        color: tn.status === "active" ? "#16a34a" : "#6b7280",
                      }}>
                        {tn.status === "active" ? t("active") : t("ended")}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {t("unit")} {tn.unit}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {tn.email && (
                      <a href={`mailto:${tn.email}`} style={{ color: "var(--muted-foreground)", transition: "color 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                      >
                        <Mail style={{ width: 14, height: 14 }} />
                      </a>
                    )}
                    {tn.phone && (
                      <a href={`tel:${tn.phone}`} style={{ color: "var(--muted-foreground)", transition: "color 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                      >
                        <Phone style={{ width: 14, height: 14 }} />
                      </a>
                    )}
                    {openReqs > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                        background: "rgba(245,158,11,0.1)", color: "#B45309",
                      }}>
                        {openReqs} demande{openReqs > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "renovations" && (
        <RenovationTracker buildingId={building.id} />
      )}

      {activeTab === "maintenance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bRequests.length === 0 ? (
            <div style={{ padding: "48px 24px", borderRadius: 14, textAlign: "center", background: "var(--card)", border: "1px solid var(--border)" }}>
              <Wrench style={{ width: 32, height: 32, color: "var(--border)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Aucune demande de maintenance</p>
            </div>
          ) : (
            bRequests.map((req) => {
              const sc = req.status === "pending" ? { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", label: t("pending") }
                : req.status === "in-progress" ? { color: "var(--primary)", bg: "rgba(69,85,58,0.07)", label: t("inProgress") }
                : { color: "#15803D", bg: "rgba(34,197,94,0.08)", label: t("completed") };
              return (
                <div key={req.id} style={{ display: "flex", overflow: "hidden", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 4, flexShrink: 0, background: sc.color }} />
                  <div style={{ flex: 1, padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{req.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {req.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {req.tenantName || `Apt ${req.unit}`}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        · {new Date(req.createdAt).toLocaleDateString("fr-CH")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Appartements / Unités */}
          <div style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "rgba(69,85,58,0.07)", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "3px solid var(--primary)" }}>
                <Home style={{ width: 14, height: 14, color: "var(--primary)" }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 650, color: "var(--foreground)", flex: 1 }}>
                Appartements & Locaux
              </span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {acctSettings.units.length} élément{acctSettings.units.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 12px" }}>
                Ajoutez les appartements, garages, places de parc et autres locaux de cet immeuble. Ils seront disponibles dans les rénovations, la comptabilité et les attributions.
              </p>
              {/* Add new */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  value={settingsNewUnit}
                  onChange={(e) => setSettingsNewUnit(e.target.value)}
                  placeholder="Ex: 1er / 4.5p, Garage N°1, Place de parc N°2..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && settingsNewUnit.trim()) {
                      const updated = { ...acctSettings, units: [...acctSettings.units, settingsNewUnit.trim()] };
                      setAcctSettings(updated);
                      saveAccountingSettings(building.id, updated);
                      setSettingsNewUnit("");
                    }
                  }}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 9, fontSize: 13,
                    border: "1px solid var(--border)", background: "var(--background)",
                    color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const,
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <button
                  onClick={() => {
                    if (!settingsNewUnit.trim()) return;
                    const updated = { ...acctSettings, units: [...acctSettings.units, settingsNewUnit.trim()] };
                    setAcctSettings(updated);
                    saveAccountingSettings(building.id, updated);
                    setSettingsNewUnit("");
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "0 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    transition: "opacity 0.15s", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Plus style={{ width: 13, height: 13 }} />
                  Ajouter
                </button>
              </div>

              {/* List */}
              {acctSettings.units.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "16px 0" }}>
                  Aucun appartement configuré. Ajoutez-en ci-dessus.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {acctSettings.units.map((unit, idx) => {
                    const lower = unit.toLowerCase();
                    const IconUnit = lower.includes("garage") ? Warehouse
                      : (lower.includes("parc") || lower.includes("parking")) ? Car
                      : Home;
                    const assignedTenantId = acctSettings.unitAssignments?.[unit] || "";
                    const assignedTenant = bTenants.find((tn: any) => tn.id === assignedTenantId);
                    return (
                      <div
                        key={idx}
                        className="group"
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", borderRadius: 10,
                          border: "1px solid var(--border)", background: "var(--background)",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--card)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--background)"; }}
                      >
                        <IconUnit style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", minWidth: 120 }}>{unit}</span>
                        {/* Tenant assignment dropdown */}
                        <select
                          value={assignedTenantId}
                          onChange={(e) => {
                            const newAssignments = { ...(acctSettings.unitAssignments || {}), [unit]: e.target.value };
                            if (!e.target.value) delete newAssignments[unit];
                            const updated = { ...acctSettings, unitAssignments: newAssignments };
                            setAcctSettings(updated);
                            saveAccountingSettings(building.id, updated);
                          }}
                          style={{
                            flex: 1, padding: "5px 8px", borderRadius: 7, fontSize: 11,
                            border: "1px solid var(--border)", background: "var(--card)",
                            color: assignedTenantId ? "var(--foreground)" : "var(--muted-foreground)",
                            outline: "none", cursor: "pointer", boxSizing: "border-box" as const,
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                        >
                          <option value="">— Non attribué —</option>
                          {bTenants.map((tn: any) => (
                            <option key={tn.id} value={tn.id}>{tn.name}</option>
                          ))}
                        </select>
                        {assignedTenant && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                            background: "rgba(34,197,94,0.08)", color: "#16a34a", flexShrink: 0,
                          }}>
                            Attribué
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const newAssignments = { ...(acctSettings.unitAssignments || {}) };
                            delete newAssignments[unit];
                            const updated = { ...acctSettings, units: acctSettings.units.filter((_, i) => i !== idx), unitAssignments: newAssignments };
                            setAcctSettings(updated);
                            saveAccountingSettings(building.id, updated);
                          }}
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            width: 24, height: 24, borderRadius: 6, border: "none",
                            background: "transparent", color: "var(--muted-foreground)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s", flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main view ──────────────────────────────────────────────── */

export function BuildingsView({ onSelectBuilding, initialSelectedId }: BuildingsViewProps) {
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const { formatAmount, getBuildingCurrency, convertToBase, baseCurrency } = useCurrency();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    units: 0,
    occupiedUnits: 0,
    monthlyRevenue: 0,
    currency: "" as string, // "" means use base currency
  });

  useEffect(() => { loadBuildings(); }, []);

  const loadBuildings = () => setBuildings(getBuildings());

  const resetForm = () =>
    setFormData({ name: "", address: "", units: 0, occupiedUnits: 0, monthlyRevenue: 0, currency: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buildingData = {
      ...formData,
      currency: (formData.currency || undefined) as Currency | undefined,
    };
    if (editingBuilding) {
      const updated = buildings.map((b) =>
        b.id === editingBuilding.id ? { ...editingBuilding, ...buildingData } : b
      );
      saveBuildings(updated);
    } else {
      saveBuildings([...buildings, { id: Date.now().toString(), ...buildingData }]);
    }
    setIsDialogOpen(false);
    setEditingBuilding(null);
    resetForm();
    loadBuildings();
  };

  const handleEdit = (b: Building) => {
    setEditingBuilding(b);
    setFormData({
      name: b.name,
      address: b.address,
      units: b.units,
      occupiedUnits: b.occupiedUnits,
      monthlyRevenue: b.monthlyRevenue,
      currency: b.currency ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteBuilding"))) {
      saveBuildings(buildings.filter((b) => b.id !== id));
      setSelectedId(null);
      loadBuildings();
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setEditingBuilding(null); resetForm(); }
  };

  const totalUnits = buildings.reduce((s, b) => s + b.units, 0);
  const totalOccupied = buildings.reduce((s, b) => s + b.occupiedUnits, 0);
  const totalRevenue = buildings.reduce((s, b) => s + convertToBase(b.monthlyRevenue, getBuildingCurrency(b)), 0);
  const globalOcc = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

  const selectedBuilding = selectedId
    ? buildings.find((b) => b.id === selectedId) ?? null
    : null;
  const selectedIndex = selectedBuilding
    ? buildings.indexOf(selectedBuilding)
    : 0;

  /* ── Detail mode ── */
  if (selectedBuilding) {
    return (
      <div style={{ padding: "32px 32px 48px" }}>
        <BuildingDetail
          building={selectedBuilding}
          index={selectedIndex}
          onBack={() => setSelectedId(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          t={t}
          formattedRevenue={formatAmount(selectedBuilding.monthlyRevenue, getBuildingCurrency(selectedBuilding))}
        />

        {/* Form dialog (shared) */}
        <FormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          editing={!!editingBuilding}
          t={t}
        />
      </div>
    );
  }

  /* ── Bubble grid mode ── */
  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* Page header */}
      <div className="flex items-start justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1
            className="text-[22px] font-semibold leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {t("buildingsTitle")}
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("buildingsSub")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => { resetForm(); setEditingBuilding(null); setIsDialogOpen(true); }}
          className="flex items-center gap-2 text-[13px] font-medium transition-colors shrink-0"
          style={{
            padding: "10px 20px",
            borderRadius: 14,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <Plus className="w-4 h-4" />
          {t("addBuilding")}
        </button>
      </div>

      {/* Summary strip */}
      {buildings.length > 0 && (
        <div
          className="flex items-center justify-between gap-4 flex-wrap"
          style={{
            padding: "16px 24px",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card)",
            marginBottom: 32,
          }}
        >
          {[
            { label: t("totalBuildings"), value: buildings.length.toString() },
            { label: t("totalUnits"), value: totalUnits.toString() },
            { label: t("occupancyRate"), value: `${globalOcc}%` },
            { label: t("monthlyRevenue"), value: formatAmount(totalRevenue) },
          ].map((m, i, arr) => (
            <React.Fragment key={m.label}>
              <div className="text-center">
                <p className="text-[18px] font-bold" style={{ color: "var(--foreground)" }}>
                  {m.value}
                </p>
                <p
                  className="text-[10px] uppercase mt-0.5"
                  style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
                >
                  {m.label}
                </p>
              </div>
              {i < arr.length - 1 && (
                <div className="h-8 w-px hidden sm:block" style={{ background: "var(--border)" }} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Building bubbles grid */}
      {buildings.length > 0 ? (
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 28,
          }}
        >
          {buildings.map((b, i) => (
            <BuildingBubble
              key={b.id}
              building={b}
              index={i}
              onClick={() => setSelectedId(b.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              t={t}
              formattedRevenue={formatAmount(b.monthlyRevenue, getBuildingCurrency(b))}
            />
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            padding: "64px 24px",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--sidebar-accent)" }}
          >
            <Building2 className="w-6 h-6" style={{ color: "var(--muted-foreground)" }} />
          </div>
          <p
            className="text-[14px] font-medium mt-4"
            style={{ color: "var(--foreground)" }}
          >
            {t("noBuildings")}
          </p>
          <p
            className="text-[12px] mt-1 mb-5"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("startAddBuilding")}
          </p>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 text-[13px] font-medium transition-colors"
            style={{
              padding: "10px 20px",
              borderRadius: 14,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Plus className="w-4 h-4" />
            {t("addABuilding")}
          </button>
        </div>
      )}

      {/* Form dialog */}
      <FormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogChange}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editing={!!editingBuilding}
        t={t}
      />
    </div>
  );
}

/* ─── Form Dialog ────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
  outline: "none", transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "var(--muted-foreground)", marginBottom: 5,
  textTransform: "uppercase", letterSpacing: "0.04em",
};

function FormDialog({
  open,
  onOpenChange,
  onSubmit,
  formData,
  setFormData,
  editing,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (d: any) => void;
  editing: boolean;
  t: (k: string) => string;
}) {
  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.35)", padding: 16,
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Accent header ─────────────────────────────────── */}
        <div style={{
          padding: "16px 22px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: "rgba(69,85,58,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderLeft: "3px solid var(--primary)",
          }}>
            <Building2 style={{ width: 16, height: 16, color: "var(--primary)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)" }}>
              {editing ? t("editBuilding") : t("newBuilding")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none",
              color: "var(--muted-foreground)", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Form body ─────────────────────────────────────── */}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t("buildingName")}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>

            {/* Address */}
            <div>
              <label style={labelStyle}>{t("buildingAddress")}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>

            {/* Units + Occupied */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("numberOfUnits")}</label>
                <input
                  type="number"
                  value={formData.units}
                  onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) || 0 })}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("occupiedUnits")}</label>
                <input
                  type="number"
                  value={formData.occupiedUnits}
                  onChange={(e) => setFormData({ ...formData, occupiedUnits: parseInt(e.target.value) || 0 })}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Revenue + Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("monthlyRevenueLabel")}</label>
                <input
                  type="number"
                  value={formData.monthlyRevenue}
                  onChange={(e) => setFormData({ ...formData, monthlyRevenue: parseInt(e.target.value) || 0 })}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select
                  value={formData.currency ?? ""}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  style={{
                    ...inputStyle, cursor: "pointer",
                    height: 38, padding: "0 12px",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <option value="">Base currency</option>
                  <option value="CHF">CHF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Footer actions ────────────────────────────────── */}
          <div style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border)",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          }}>
            <button
              type="submit"
              style={{
                padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
                border: "none", cursor: "pointer",
                background: "var(--primary)", color: "var(--primary-foreground)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {editing ? t("update") : t("create")}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 550,
                border: "1px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
