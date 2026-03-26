import React, { useEffect, useState } from "react";
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
  DollarSign,
  ChevronRight,
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
  "/building-1.jpg",
  "/building-2.jpg",
  "/building-3.jpg",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80",
];

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

type BuildingsViewProps = {
  onSelectBuilding?: (buildingId: string) => void;
};

/* ─── Building Card (image overlay) ─────────────────────────── */

function BuildingBubble({
  building,
  index,
  onClick,
  onEdit,
  onDelete,
  t,
}: {
  building: Building;
  index: number;
  onClick: () => void;
  onEdit: (b: Building) => void;
  onDelete: (id: string) => void;
  t: (k: string) => string;
}) {
  const photo = building.imageUrl || BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];
  const occPct =
    building.units > 0
      ? Math.round((building.occupiedUnits / building.units) * 100)
      : 0;

  return (
    <div className="group relative w-full" style={{ minHeight: 320 }}>
      <button
        type="button"
        onClick={onClick}
        className="relative w-full h-full overflow-hidden transition-all duration-300 block"
        style={{
          borderRadius: 20,
          minHeight: 320,
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02)";
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.22)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.12)";
        }}
      >
        {/* Background image */}
        <img
          src={photo}
          alt={building.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          style={{ borderRadius: 20 }}
        />

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: 20,
            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 100%)",
          }}
        />

        {/* Occupancy badge — top left */}
        <span
          className="absolute top-4 left-4 text-[11px] font-bold px-3 py-1 rounded-full"
          style={{
            background: occPct >= 90 ? "#15803D" : occPct >= 70 ? "var(--primary)" : "#B45309",
            color: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {occPct}%
        </span>

        {/* Content overlaid on image */}
        <div className="absolute inset-0 flex flex-col justify-end p-5" style={{ borderRadius: 20 }}>
          {/* Building name */}
          <h3 className="text-[18px] font-bold leading-tight text-white mb-1">
            {building.name}
          </h3>

          {/* Address */}
          <p className="text-[12px] flex items-center gap-1.5 mb-4" style={{ color: "rgba(255,255,255,0.75)" }}>
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {building.address}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.6)" }} />
              <span className="text-[13px] font-semibold text-white">
                {building.occupiedUnits}/{building.units}
              </span>
            </div>
            <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.25)" }} />
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.6)" }} />
              <span className="text-[13px] font-semibold text-white">
                {formatCHF(building.monthlyRevenue)}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Edit / Delete on hover — top right */}
      <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(building); }}
          className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        >
          <Edit className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(building.id); }}
          className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
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
}: {
  building: Building;
  index: number;
  onBack: () => void;
  onEdit: (b: Building) => void;
  onDelete: (id: string) => void;
  t: (k: string) => string;
}) {
  const photo = building.imageUrl || BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];
  const occPct =
    building.units > 0
      ? Math.round((building.occupiedUnits / building.units) * 100)
      : 0;

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-[13px] font-medium mb-6 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("buildingsTitle")}
      </button>

      {/* Hero card */}
      <div
        className="overflow-hidden flex flex-col lg:flex-row"
        style={{
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--card)",
          marginBottom: 24,
        }}
      >
        {/* Image */}
        <div className="relative lg:w-[45%] min-h-[260px]">
          <img
            src={photo}
            alt={building.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="lg:w-[55%] p-8 flex flex-col justify-between">
          <div>
            <h2
              className="text-[24px] font-bold leading-tight mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {building.name}
            </h2>
            <p
              className="flex items-center gap-1.5 text-[13px] mb-6"
              style={{ color: "var(--muted-foreground)" }}
            >
              <MapPin className="w-3.5 h-3.5" />
              {building.address}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: t("totalUnits"), value: building.units.toString(), icon: Home },
                { label: t("occupiedUnits"), value: building.occupiedUnits.toString(), icon: Users },
                { label: t("occupancyRate"), value: `${occPct}%`, icon: TrendingUp },
                { label: t("monthlyRevenue"), value: formatCHF(building.monthlyRevenue), icon: DollarSign },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Icon className="w-4 h-4 mb-2" style={{ color: "var(--primary)" }} />
                    <p
                      className="text-[18px] font-bold leading-tight"
                      style={{ color: "var(--foreground)" }}
                    >
                      {s.value}
                    </p>
                    <p
                      className="text-[10px] uppercase mt-0.5"
                      style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
                    >
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                {t("occupancyRate")}
              </span>
              <span className="text-[13px] font-bold" style={{ color: "var(--foreground)" }}>
                {occPct}%
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "var(--muted)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${occPct}%`,
                  background: occPct >= 90 ? "#15803D" : occPct >= 70 ? "var(--primary)" : "#B45309",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => onEdit(building)}
              className="flex items-center gap-2 text-[13px] font-medium transition-colors"
              style={{
                padding: "9px 18px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            >
              <Edit className="w-3.5 h-3.5" />
              {t("editBuilding")}
            </button>
            <button
              type="button"
              onClick={() => onDelete(building.id)}
              className="flex items-center gap-2 text-[13px] font-medium transition-colors"
              style={{
                padding: "9px 18px",
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#DC2626",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("confirmDeleteBuilding")}
            </button>
          </div>
        </div>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const totalRevenue = buildings.reduce((s, b) => s + b.monthlyRevenue, 0);
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
            { label: t("monthlyRevenue"), value: formatCHF(totalRevenue) },
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-2xl max-w-md"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--foreground)" }}>
            {editing ? t("editBuilding") : t("newBuilding")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
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
              className="flex-1 rounded-xl text-[13px] font-medium py-2.5 transition-opacity"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {editing ? t("update") : t("create")}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl text-[13px] font-medium py-2.5 transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
