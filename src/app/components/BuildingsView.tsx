import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  MapPin,
  Users,
  Edit,
  Trash2,
  ArrowUpRight,
  Home,
  TrendingUp,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { getBuildings, saveBuildings, type Building } from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Helpers ────────────────────────────────────────────────── */

const BUILDING_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=700&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=700&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80",
];

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

type BuildingsViewProps = {
  onSelectBuilding?: (buildingId: string) => void;
};

/* ─── Building Card ──────────────────────────────────────────── */

function BuildingCard({
  building,
  index,
  onSelect,
  onEdit,
  onDelete,
  t,
}: {
  building: Building;
  index: number;
  onSelect?: (id: string) => void;
  onEdit: (b: Building) => void;
  onDelete: (id: string) => void;
  t: (k: string) => string;
}) {
  const occPct =
    building.units > 0
      ? Math.round((building.occupiedUnits / building.units) * 100)
      : 0;

  const photo = building.imageUrl || BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];

  const occColor =
    occPct >= 90
      ? { bg: "rgba(34,197,94,0.12)", fg: "#15803D" }
      : occPct >= 70
      ? { bg: "rgba(69,85,58,0.10)", fg: "#45553A" }
      : { bg: "rgba(245,158,11,0.12)", fg: "#B45309" };

  return (
    <div
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(69,85,58,0.30)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      {/* ── Image ── */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        <img
          src={photo}
          alt={building.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Occupancy pill — top left */}
        <div className="absolute top-3 left-3">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              color: occColor.fg,
            }}
          >
            {occPct}% occupé
          </span>
        </div>

        {/* Edit / Delete — top right, visible on hover */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(building); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)" }}
            title={t("editBuilding")}
          >
            <Edit className="w-3.5 h-3.5" style={{ color: "#374151" }} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(building.id); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)" }}
            title={t("confirmDeleteBuilding")}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-5">
        {/* Name + address */}
        <div className="mb-4">
          <h3 className="text-[15px] font-semibold leading-tight mb-1" style={{ color: "var(--foreground)" }}>
            {building.name}
          </h3>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
            <p className="text-[12px] leading-snug" style={{ color: "var(--muted-foreground)" }}>
              {building.address}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: t("units"), value: `${building.occupiedUnits}/${building.units}`, icon: Home },
            { label: t("occupancyRate"), value: `${occPct}%`, icon: Users, accent: true },
            { label: t("revenue"), value: formatCHF(building.monthlyRevenue), icon: TrendingUp },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl p-2.5 flex flex-col items-center text-center"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <Icon className="w-3.5 h-3.5 mb-1" style={{ color: s.accent ? "var(--primary)" : "var(--muted-foreground)" }} />
                <p
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: s.accent ? "var(--primary)" : "var(--foreground)" }}
                >
                  {s.value}
                </p>
                <p className="text-[9px] uppercase mt-0.5" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Occupancy progress bar */}
        <div className="mb-4">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${occPct}%`, background: occColor.fg }}
            />
          </div>
        </div>

        {/* Action */}
        <button
          type="button"
          onClick={() => onSelect?.(building.id)}
          className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all"
          style={{
            padding: "9px 16px",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <ArrowUpRight className="w-4 h-4" />
          {t("details")}
        </button>
      </div>
    </div>
  );
}

/* ─── Main view ──────────────────────────────────────────────── */

export function BuildingsView({ onSelectBuilding }: BuildingsViewProps) {
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    units: 0,
    occupiedUnits: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => { loadBuildings(); }, []);

  const loadBuildings = () => setBuildings(getBuildings());

  const resetForm = () =>
    setFormData({ name: "", address: "", units: 0, occupiedUnits: 0, monthlyRevenue: 0 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuilding) {
      const updated = buildings.map((b) =>
        b.id === editingBuilding.id ? { ...editingBuilding, ...formData } : b
      );
      saveBuildings(updated);
    } else {
      saveBuildings([...buildings, { id: Date.now().toString(), ...formData }]);
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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteBuilding"))) {
      saveBuildings(buildings.filter((b) => b.id !== id));
      loadBuildings();
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setEditingBuilding(null); resetForm(); }
  };

  /* Summary stats */
  const totalUnits = buildings.reduce((s, b) => s + b.units, 0);
  const totalOccupied = buildings.reduce((s, b) => s + b.occupiedUnits, 0);
  const totalRevenue = buildings.reduce((s, b) => s + b.monthlyRevenue, 0);
  const globalOcc = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {t("buildingsTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {t("buildingsSub")}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                padding: "9px 18px",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Plus className="w-4 h-4" />
              {t("addBuilding")}
            </button>
          </DialogTrigger>

          <DialogContent
            className="rounded-2xl max-w-md"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: "var(--foreground)" }}>
                {editingBuilding ? t("editBuilding") : t("newBuilding")}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {[
                { id: "name", label: t("buildingName"), type: "text", key: "name" as const },
                { id: "address", label: t("buildingAddress"), type: "text", key: "address" as const },
              ].map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id} style={{ color: "var(--foreground)" }}>{field.label}</Label>
                  <Input
                    id={field.id}
                    type={field.type}
                    value={formData[field.key] as string}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    required
                    className="mt-2"
                    style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "units", label: t("numberOfUnits"), key: "units" as const },
                  { id: "occupied", label: t("occupiedUnits"), key: "occupiedUnits" as const },
                ].map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id} style={{ color: "var(--foreground)" }}>{field.label}</Label>
                    <Input
                      id={field.id}
                      type="number"
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: parseInt(e.target.value) || 0 })}
                      required
                      className="mt-2"
                      style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="revenue" style={{ color: "var(--foreground)" }}>{t("monthlyRevenueLabel")}</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={formData.monthlyRevenue}
                  onChange={(e) => setFormData({ ...formData, monthlyRevenue: parseInt(e.target.value) || 0 })}
                  required
                  className="mt-2"
                  style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl text-sm font-semibold py-2.5 transition-opacity"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  {editingBuilding ? t("update") : t("create")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDialogChange(false)}
                  className="flex-1 rounded-xl text-sm font-medium py-2.5 transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--background)" }}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary strip */}
      {buildings.length > 0 && (
        <div
          className="rounded-2xl px-6 py-4 mb-8 flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {[
            { label: t("totalBuildings"), value: buildings.length.toString() },
            { label: t("totalUnits"), value: totalUnits.toString() },
            { label: t("occupancyRate"), value: `${globalOcc}%` },
            { label: t("monthlyRevenue"), value: formatCHF(totalRevenue) },
          ].map((m, i, arr) => (
            <React.Fragment key={m.label}>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{m.value}</p>
                <p className="text-[10px] uppercase mt-0.5" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
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

      {/* Building grid */}
      {buildings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {buildings.map((building, i) => (
            <BuildingCard
              key={building.id}
              building={building}
              index={i}
              onSelect={onSelectBuilding}
              onEdit={handleEdit}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div
          className="rounded-2xl p-16 text-center"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
          >
            <Building2 className="w-8 h-8" style={{ color: "var(--muted-foreground)" }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            {t("noBuildings")}
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            {t("startAddBuilding")}
          </p>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl text-sm font-semibold py-2.5 px-5 transition-opacity"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Plus className="w-4 h-4" />
            {t("addABuilding")}
          </button>
        </div>
      )}
    </div>
  );
}
