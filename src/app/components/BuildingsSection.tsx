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

function ImagePlaceholder({ title }: { title: string }) {
  return (
    <div className="relative h-44 w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8E5DB] via-[#FAF5F2] to-white" />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 22% 20%, rgba(69,85,58,0.10), transparent 58%), radial-gradient(circle at 80% 30%, rgba(69,85,58,0.06), transparent 62%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#171414]/50 via-[#171414]/10 to-transparent" />

      <div className="absolute bottom-3 left-4 right-4">
        <div className="text-white text-base font-medium leading-tight">
          {title}
        </div>
        <div className="mt-1 text-white/70 text-xs">
          Zone image (a remplacer plus tard)
        </div>
      </div>
    </div>
  );
}

function BuildingCard({
  building,
  onSelect,
}: {
  building: BuildingCardModel;
  onSelect?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const pct = clampPct((building.unitsOccupied / building.unitsTotal) * 100);
  const clickable = Boolean(onSelect);

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
      className={[
        "group overflow-hidden rounded-2xl border border-[#E8E5DB] bg-white shadow-sm transition",
        "hover:bg-[#FAF5F2] hover:border-[#45553A]/30",
        clickable ? "cursor-pointer" : "",
      ].join(" ")}
    >
      <ImagePlaceholder title={building.name} />

      <div className="p-5">
        {building.address ? (
          <div className="text-[#6B6560] text-sm">{building.address}</div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="text-[#6B6560] text-sm">
            {building.unitsOccupied}/{building.unitsTotal} {t("unitsOccupiedOf")}
          </div>
          <div className="rounded-full border border-[#E8E5DB] bg-[#FAF5F2] px-2.5 py-1 text-xs text-[#6B6560]">
            {pct.toFixed(0)}%
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-[#E8E5DB] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#45553A]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(building.id);
            }}
            className="rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] px-3 py-2 text-sm text-[#171414] transition hover:bg-[#E8E5DB]/50"
          >
            {t("open")}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(building.id);
            }}
            className="rounded-xl border border-[#E8E5DB] bg-transparent px-3 py-2 text-sm text-[#6B6560] transition hover:bg-[#FAF5F2]"
          >
            {t("details")}
          </button>
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
        {cards.map((b) => (
          <BuildingCard key={b.id} building={b} onSelect={onSelectBuilding} />
        ))}
      </div>
    </section>
  );
}
