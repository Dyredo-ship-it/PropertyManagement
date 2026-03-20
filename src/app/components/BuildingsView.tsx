import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  MapPin,
  DollarSign,
  Users,
  Edit,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Card } from "./ui/card";
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

const fallbackImage =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#E8E5DB" offset="0"/>
        <stop stop-color="#FAF5F2" offset="1"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      fill="rgba(107,101,96,0.55)" font-family="system-ui, -apple-system, Segoe UI, Roboto"
      font-size="34">Image Du B\u00E2timent</text>
  </svg>
`);

type BuildingsViewProps = {
  onSelectBuilding?: (buildingId: string) => void;
};

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

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = () => {
    setBuildings(getBuildings());
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      units: 0,
      occupiedUnits: 0,
      monthlyRevenue: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingBuilding) {
      const updated = buildings.map((b) =>
        b.id === editingBuilding.id ? { ...editingBuilding, ...formData } : b
      );
      saveBuildings(updated);
    } else {
      const newBuilding: Building = {
        id: Date.now().toString(),
        ...formData,
      };
      saveBuildings([...buildings, newBuilding]);
    }

    setIsDialogOpen(false);
    setEditingBuilding(null);
    resetForm();
    loadBuildings();
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      address: building.address,
      units: building.units,
      occupiedUnits: building.occupiedUnits,
      monthlyRevenue: building.monthlyRevenue,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteBuilding"))) {
      const updated = buildings.filter((b) => b.id !== id);
      saveBuildings(updated);
      loadBuildings();
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingBuilding(null);
      resetForm();
    }
  };

  const handleOpenDetail = (buildingId: string) => {
    if (!onSelectBuilding) return;
    onSelectBuilding(buildingId);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[#171414]">{t("buildingsTitle")}</h1>
          <p className="text-[#6B6560]">
            {t("buildingsSub")}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white">
              <Plus className="w-5 h-5 mr-2" />
              {t("addBuilding")}
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-white border-[#E8E5DB]">
            <DialogHeader>
              <DialogTitle className="text-[#171414]">
                {editingBuilding ? t("editBuilding") : t("newBuilding")}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name" className="text-[#171414]">{t("buildingName")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-[#171414]">{t("buildingAddress")}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                  className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="units" className="text-[#171414]">{t("numberOfUnits")}</Label>
                  <Input
                    id="units"
                    type="number"
                    value={formData.units}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        units: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="occupiedUnits" className="text-[#171414]">{t("occupiedUnits")}</Label>
                  <Input
                    id="occupiedUnits"
                    type="number"
                    value={formData.occupiedUnits}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        occupiedUnits: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="monthlyRevenue" className="text-[#171414]">{t("monthlyRevenueLabel")}</Label>
                <Input
                  id="monthlyRevenue"
                  type="number"
                  value={formData.monthlyRevenue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyRevenue: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                  className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-[#45553A] hover:bg-[#3a4930] text-white"
                >
                  {editingBuilding ? t("update") : t("create")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  className="flex-1 border-[#E8E5DB] text-[#171414]"
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => {
          const occupancyRate =
            building.units > 0
              ? ((building.occupiedUnits / building.units) * 100).toFixed(0)
              : "0";

          return (
            <Card
              key={building.id}
              role={onSelectBuilding ? "button" : undefined}
              tabIndex={onSelectBuilding ? 0 : -1}
              onClick={() => handleOpenDetail(building.id)}
              onKeyDown={(e) => {
                if (!onSelectBuilding) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOpenDetail(building.id);
                }
              }}
              className={[
                "overflow-hidden bg-white border border-[#E8E5DB] shadow-sm hover:border-[#45553A]/50 transition-all rounded-2xl",
                onSelectBuilding ? "cursor-pointer" : "",
              ].join(" ")}
            >
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={building.imageUrl || fallbackImage}
                  alt={building.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/80 border border-[#E8E5DB] backdrop-blur flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#45553A]" />
                  </div>

                  <div className="flex gap-2">
                    {onSelectBuilding && (
                      <div className="p-2 rounded-lg bg-white/80 border border-[#E8E5DB]">
                        <ChevronRight className="w-4 h-4 text-[#171414]" />
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(building);
                      }}
                      className="p-2 rounded-lg bg-white/80 border border-[#E8E5DB] hover:bg-white transition-colors"
                      aria-label={t("editBuilding")}
                      title={t("editBuilding")}
                    >
                      <Edit className="w-4 h-4 text-[#171414]" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(building.id);
                      }}
                      className="p-2 rounded-lg bg-white/80 border border-[#E8E5DB] hover:bg-white transition-colors"
                      aria-label={t("confirmDeleteBuilding")}
                      title={t("confirmDeleteBuilding")}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-4 left-5 right-5">
                  <h3 className="text-xl text-white font-medium">
                    {building.name}
                  </h3>
                  <div className="mt-2 flex items-start gap-2 text-white/70">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <p className="text-sm">{building.address}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 pt-2 border-t border-[#E8E5DB]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#6B6560]" />
                      <span className="text-sm text-[#6B6560]">
                        {t("occupation")}
                      </span>
                    </div>
                    <span className="font-medium text-[#171414]">{occupancyRate}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#6B6560]" />
                      <span className="text-sm text-[#6B6560]">
                        {t("units")}
                      </span>
                    </div>
                    <span className="font-medium text-[#171414]">
                      {building.occupiedUnits}/{building.units}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#6B6560]" />
                      <span className="text-sm text-[#6B6560]">
                        {t("revenue")}
                      </span>
                    </div>
                    <span className="font-medium text-[#171414]">
                      {building.monthlyRevenue.toLocaleString()}{" "}
                      {building.monthlyRevenue ? "" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {buildings.length === 0 && (
        <Card className="p-12 bg-white border border-[#E8E5DB] shadow-sm text-center">
          <Building2 className="w-16 h-16 text-[#6B6560] mx-auto mb-4" />
          <h3 className="text-xl mb-2 text-[#171414]">{t("noBuildings")}</h3>
          <p className="text-[#6B6560] mb-6">
            {t("startAddBuilding")}
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#45553A] hover:bg-[#3a4930] text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("addABuilding")}
          </Button>
        </Card>
      )}
    </div>
  );
}
