// buildingssection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getBuildings, type Building as StorageBuilding } from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

type BuildingCardModel = {
  id: string;
  name: string;
  address?: string;
  unitsTotal: number;
  unitsOccupied: number;
};

type BuildingsSectionProps = {
  onSelectBuilding?: (buildingId: string) => void;
};

function clampPct(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

const BUILDING_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=700&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=700&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80",
];

function BuildingCard({
  building,
  index,
  onSelect,
}: {
  building: BuildingCardModel;
  index: number;
  onSelect?: (id: string) => void;
}) {
  const pct = clampPct((building.unitsOccupied / building.unitsTotal) * 100);
  const clickable = Boolean(onSelect);
  const photo = BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : -1}
      onClick={() => onSelect?.(building.id)}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(building.id);
        }
      }}
      className="group relative overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl"
      style={{
        minHeight: 280,
        cursor: clickable ? "pointer" : "default",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {/* Background image */}
      <img
        src={photo}
        alt={building.name}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0.12) 100%)",
        }}
      />

      {/* Occupancy badge — top left */}
      <span
        className="absolute top-4 left-4 text-[11px] font-bold px-3 py-1 rounded-full"
        style={{
          background: pct >= 90 ? "#15803D" : pct >= 70 ? "#45553A" : "#B45309",
          color: "#FFFFFF",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        {pct.toFixed(0)}%
      </span>

      {/* Content overlaid on image */}
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <h3 className="text-[17px] font-bold leading-tight text-white mb-1">
          {building.name}
        </h3>

        {building.address && (
          <p className="text-[12px] text-white/70 mb-3">
            {building.address}
          </p>
        )}

        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-white/80">
            {building.unitsOccupied}/{building.unitsTotal}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: pct >= 90 ? "#22C55E" : pct >= 70 ? "#A3E635" : "#F59E0B",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuildingsSection({ onSelectBuilding }: BuildingsSectionProps) {
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<StorageBuilding[]>([]);

  useEffect(() => {
    setBuildings(getBuildings());
  }, []);

  const cards: BuildingCardModel[] = useMemo(() => {
    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      unitsTotal: Number(b.units ?? 0),
      unitsOccupied: Number(b.occupiedUnits ?? 0),
    }));
  }, [buildings]);

  return (
    <section className="w-full">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[#171414] text-xl font-medium tracking-[-0.01em]">
            {t("navBuildings")}
          </h2>
          <p className="mt-1 text-[#6B6560] text-sm">
            {t("buildingsPortfolioSub")}
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] px-4 py-2 text-sm text-[#171414] transition hover:bg-[#E8E5DB]/50"
        >
          {t("addABuilding")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((b, i) => (
          <BuildingCard key={b.id} building={b} index={i} onSelect={onSelectBuilding} />
        ))}
      </div>
    </section>
  );
}
