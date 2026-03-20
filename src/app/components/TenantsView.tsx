import { cn } from "./ui/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  Calendar,
  Edit,
  Trash2,
  Send,
  FileText,
  Paperclip,
  Download,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getTenants,
  saveTenants,
  getBuildings,
  type Tenant,
  type Building,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

type TenantNote = {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: string; // ISO
};

type TenantDocument = {
  id: string;
  category:
    | "Assurance ménage"
    | "Contrat de bail"
    | "Carte d'identité"
    | "Casier des poursuites"
    | "Fiches salaires"
    | "Communication"
    | "Autre";
  filename: string;
  mimeType: string;
  uploadedAt: string; // ISO
  dataUrl: string; // base64
};

const DOC_CATEGORIES: TenantDocument["category"][] = [
  "Assurance ménage",
  "Contrat de bail",
  "Carte d'identité",
  "Casier des poursuites",
  "Fiches salaires",
  "Communication",
  "Autre",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });

export function TenantsView() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");

  const [isFicheOpen, setIsFicheOpen] = useState(false);
  const [ficheTenantId, setFicheTenantId] = useState<string | null>(null);

  const [noteDate, setNoteDate] = useState<string>(todayISO());
  const [noteText, setNoteText] = useState<string>("");

  const [docCategory, setDocCategory] =
    useState<TenantDocument["category"]>("Contrat de bail");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    buildingId: "",
    unit: "",
    rentNet: 0,
    charges: 0,
    leaseStart: "",
    leaseEnd: "",
    status: "active" as const,
    gender: "unspecified" as "male" | "female" | "unspecified",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = () => {
    const allTenants = getTenants() as any[];
    const b = getBuildings();
    setTenants(allTenants as Tenant[]);
    setBuildings(b);

    if (
      selectedBuildingId !== "all" &&
      !b.some((x) => x.id === selectedBuildingId)
    ) {
      setSelectedBuildingId("all");
    }
  };

  const filteredTenants = useMemo(() => {
    if (selectedBuildingId === "all") return tenants;
    return tenants.filter((t: any) => t.buildingId === selectedBuildingId);
  }, [tenants, selectedBuildingId]);

  const ficheTenant = useMemo(() => {
    if (!ficheTenantId) return null;
    return (tenants as any[]).find((t) => t.id === ficheTenantId) ?? null;
  }, [tenants, ficheTenantId]);

  const ficheNotes: TenantNote[] = useMemo(() => {
    const raw = (ficheTenant as any)?.notes ?? [];
    return Array.isArray(raw) ? (raw as TenantNote[]) : [];
  }, [ficheTenant]);

  const ficheDocs: TenantDocument[] = useMemo(() => {
    const raw = (ficheTenant as any)?.documents ?? [];
    return Array.isArray(raw) ? (raw as TenantDocument[]) : [];
  }, [ficheTenant]);

  const formatCHF = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    const s = Math.round(n).toString();
    const withApostrophe = s.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `CHF ${withApostrophe}`;
  };

  const formatDateRange = (start?: string, end?: string) => {
    const fmt = (d?: string) =>
      d ? new Date(d).toLocaleDateString("fr-CA") : "\u2014";
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const handleEmailTenant = (tenant: any) => {
    const subject = "Message concernant votre location";
    const body = `Bonjour ${tenant?.name ?? ""},\n\nConcernant votre appartement ${
      tenant?.buildingName ?? ""
    } - Unit\u00E9 ${tenant?.unit ?? ""},\n\n`;
    window.location.href = `mailto:${encodeURIComponent(
      tenant?.email ?? ""
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedBuilding = buildings.find((b) => b.id === formData.buildingId);
    if (!selectedBuilding) return;

    const payload: any = {
      ...formData,
      buildingName: (selectedBuilding as any).name,
      rentNet: Number(formData.rentNet) || 0,
      charges: Number(formData.charges) || 0,
      leaseEnd: formData.leaseEnd || "",
    };

    if (editingTenant) {
      const updated = (tenants as any).map((t: any) =>
        t.id === (editingTenant as any).id ? { ...t, ...payload } : t
      );
      saveTenants(updated as any);
    } else {
      const newTenant: any = {
        id: Date.now().toString(),
        ...payload,
        notes: [],
        documents: [],
      };
      saveTenants([...(tenants as any), newTenant] as any);
    }

    setIsDialogOpen(false);
    setEditingTenant(null);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      buildingId: "",
      unit: "",
      rentNet: 0,
      charges: 0,
      leaseStart: "",
      leaseEnd: "",
      status: "active",
      gender: "unspecified",
    });
  };

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant as Tenant);
    setFormData({
      name: tenant.name ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      buildingId: tenant.buildingId ?? "",
      unit: tenant.unit ?? "",
      rentNet: Number(tenant.rentNet ?? tenant.rent ?? 0) || 0,
      charges: Number(tenant.charges ?? 0) || 0,
      leaseStart: tenant.leaseStart ?? "",
      leaseEnd: tenant.leaseEnd ?? "",
      status: tenant.status ?? "active",
      gender: (tenant.gender ?? "unspecified") as any,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteTenant"))) {
      const updated = (tenants as any).filter((t: any) => t.id !== id);
      saveTenants(updated as any);
      loadData();
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTenant(null);
      resetForm();
    }
  };

  const openFiche = (tenantId: string) => {
    setFicheTenantId(tenantId);
    setNoteDate(todayISO());
    setNoteText("");
    setDocCategory("Contrat de bail");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsFicheOpen(true);
  };

  const updateTenantById = (tenantId: string, patch: Partial<any>) => {
    const updated = (tenants as any[]).map((t) =>
      t.id === tenantId ? { ...t, ...patch } : t
    );
    saveTenants(updated as any);
    setTenants(updated as any);
  };

  const addNote = () => {
    if (!ficheTenantId) return;
    const text = noteText.trim();
    if (!text) return;

    const next: TenantNote = {
      id: `${Date.now()}`,
      date: noteDate || todayISO(),
      text,
      createdAt: new Date().toISOString(),
    };

    const current = ((ficheTenant as any)?.notes ?? []) as TenantNote[];
    updateTenantById(ficheTenantId, { notes: [next, ...current] });

    setNoteText("");
    setNoteDate(todayISO());
  };

  const deleteNote = (noteId: string) => {
    if (!ficheTenantId) return;
    const current = ((ficheTenant as any)?.notes ?? []) as TenantNote[];
    updateTenantById(ficheTenantId, {
      notes: current.filter((n) => n.id !== noteId),
    });
  };

  const uploadDoc = async (file: File) => {
    if (!ficheTenantId) return;

    const dataUrl = await fileToDataUrl(file);
    const next: TenantDocument = {
      id: `${Date.now()}`,
      category: docCategory,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      dataUrl,
    };

    const current = ((ficheTenant as any)?.documents ?? []) as TenantDocument[];
    updateTenantById(ficheTenantId, { documents: [next, ...current] });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteDoc = (docId: string) => {
    if (!ficheTenantId) return;
    const current = ((ficheTenant as any)?.documents ?? []) as TenantDocument[];
    updateTenantById(ficheTenantId, {
      documents: current.filter((d) => d.id !== docId),
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8 gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl mb-2 text-[#171414]">{t("tenantsTitle")}</h1>
          <p className="text-[#6B6560]">{t("tenantsSub")}</p>

          <div className="mt-4 w-full max-w-md">
            <Label htmlFor="buildingFilter" className="text-[#171414]">{t("building")}</Label>
            <Select
              value={selectedBuildingId}
              onValueChange={(v) => setSelectedBuildingId(v)}
            >
              <SelectTrigger
                id="buildingFilter"
                className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
              >
                <SelectValue placeholder={t("allBuildings")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allBuildings")}</SelectItem>
                {buildings.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white shrink-0">
              <Plus className="w-5 h-5 mr-2" />
              {t("addTenant")}
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-white border-[#E8E5DB] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#171414]">
                {editingTenant ? t("editTenant") : t("newTenant")}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name" className="text-[#171414]">{t("fullName")}</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-[#171414]">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-[#171414]">{t("phone")}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="building" className="text-[#171414]">{t("building")}</Label>
                <Select
                  value={formData.buildingId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, buildingId: value })
                  }
                >
                  <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                    <SelectValue placeholder={t("selectBuilding")} />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building: any) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit" className="text-[#171414]">{t("units")}</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="gender" className="text-[#171414]">{t("gender")}</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("male")}</SelectItem>
                      <SelectItem value="female">{t("female")}</SelectItem>
                      <SelectItem value="unspecified">{t("unspecified")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rentNet" className="text-[#171414]">{t("netRent")}</Label>
                  <Input
                    id="rentNet"
                    type="number"
                    value={formData.rentNet}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rentNet: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="charges" className="text-[#171414]">{t("monthlyCharges")}</Label>
                  <Input
                    id="charges"
                    type="number"
                    value={formData.charges}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        charges: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaseStart" className="text-[#171414]">{t("leaseStartLabel")}</Label>
                  <Input
                    id="leaseStart"
                    type="date"
                    value={formData.leaseStart}
                    onChange={(e) =>
                      setFormData({ ...formData, leaseStart: e.target.value })
                    }
                    required
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="leaseEnd" className="text-[#171414]">{t("leaseEndOptional")}</Label>
                  <Input
                    id="leaseEnd"
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, leaseEnd: e.target.value })
                    }
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-[#171414]">{t("status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("active")}</SelectItem>
                    <SelectItem value="pending">{t("pending")}</SelectItem>
                    <SelectItem value="ended">{t("ended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-[#45553A] hover:bg-[#3a4930] text-white"
                >
                  {editingTenant ? t("update") : t("create")}
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

      {/* FICHE LOCATAIRE (notes + documents) */}
      <Dialog open={isFicheOpen} onOpenChange={setIsFicheOpen}>
        <DialogContent className="bg-white border-[#E8E5DB] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#171414]">
              {t("tenantFile")} — {ficheTenant?.name ?? ""}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-8">
            {/* Notes */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#171414]">{t("tenantNotes")}</h3>
                  <p className="text-sm text-[#6B6560]">
                    {t("addDateNote")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3">
                <div>
                  <Label htmlFor="noteDate" className="text-[#171414]">{t("noteDate")}</Label>
                  <Input
                    id="noteDate"
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label htmlFor="noteText" className="text-[#171414]">{t("tenantNotes")}</Label>
                  <Input
                    id="noteText"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addNote}
                    className="bg-[#45553A] hover:bg-[#3a4930] text-white w-full"
                  >
                    {t("add")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {ficheNotes.length === 0 ? (
                  <div className="text-sm text-[#6B6560]">
                    {t("noNotes")}
                  </div>
                ) : (
                  ficheNotes
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-[#E8E5DB] bg-[#FAF5F2] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#171414]">
                              {new Date(n.date).toLocaleDateString("fr-CA")}
                            </div>
                            <div className="text-sm text-[#6B6560] mt-1 whitespace-pre-wrap">
                              {n.text}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteNote(n.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer la note"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>

            {/* Documents */}
            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[#171414]">{t("documents")}</h3>
                <p className="text-sm text-[#6B6560]">
                  Stockage local (prototype). Plus tard, a connecter a votre
                  stockage cloud.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr_auto] gap-3 items-end">
                <div>
                  <Label className="text-[#171414]">{t("category")}</Label>
                  <Select
                    value={docCategory}
                    onValueChange={(v: any) => setDocCategory(v)}
                  >
                    <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[#171414]">{t("file")}</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadDoc(file);
                      } catch {
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end">
                  <div className="text-xs text-[#6B6560]">
                    Formats: PDF, images, etc.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {ficheDocs.length === 0 ? (
                  <div className="text-sm text-[#6B6560]">
                    {t("noDocuments")}
                  </div>
                ) : (
                  ficheDocs.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border border-[#E8E5DB] bg-[#FAF5F2] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-[#6B6560]" />
                            <span className="text-sm font-semibold text-[#171414]">
                              {d.category}
                            </span>
                          </div>
                          <div className="text-sm text-[#6B6560] mt-1 truncate">
                            {d.filename}
                          </div>
                          <div className="text-xs text-[#6B6560] mt-1">
                            {t("addedOn")}{" "}
                            {new Date(d.uploadedAt).toLocaleDateString("fr-CA")}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={d.dataUrl}
                            download={d.filename}
                            className="p-2 hover:bg-[#E8E5DB]/50 rounded-lg transition-colors"
                            title="Telecharger"
                          >
                            <Download className="w-4 h-4 text-[#45553A]" />
                          </a>

                          <button
                            onClick={() => deleteDoc(d.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant: any) => {
          const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
          const charges = Number(tenant.charges ?? 0) || 0;
          const total = rentNet + charges;

          return (
            <Card
              key={tenant.id}
              className="p-6 bg-white border border-[#E8E5DB] shadow-sm hover:border-[#45553A]/50 transition-all rounded-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-[#45553A]/10 flex items-center justify-center">
                  {tenant.gender === "female" ? (
                    <span className="text-xl text-[#45553A]">{"\u2640"}</span>
                  ) : tenant.gender === "male" ? (
                    <span className="text-xl text-[#45553A]">{"\u2642"}</span>
                  ) : (
                    <Users className="w-6 h-6 text-[#45553A]" />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openFiche(tenant.id)}
                    className="p-2 hover:bg-[#E8E5DB]/50 rounded-lg transition-colors"
                    title={t("tenantFile")}
                  >
                    <FileText className="w-4 h-4 text-[#45553A]" />
                  </button>

                  <button
                    onClick={() => handleEmailTenant(tenant)}
                    className="p-2 hover:bg-[#E8E5DB]/50 rounded-lg transition-colors"
                    title={t("sendEmail")}
                  >
                    <Send className="w-4 h-4 text-[#45553A]" />
                  </button>

                  <button
                    onClick={() => handleEdit(tenant)}
                    className="p-2 hover:bg-[#E8E5DB]/50 rounded-lg transition-colors"
                    title={t("editTenant")}
                  >
                    <Edit className="w-4 h-4 text-[#6B6560]" />
                  </button>

                  <button
                    onClick={() => handleDelete(tenant.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title={t("confirmDeleteTenant")}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl mb-1 text-[#171414]">{tenant.name}</h3>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs",
                    tenant.status === "active" && "bg-green-100 text-green-700",
                    tenant.status === "pending" &&
                      "bg-yellow-100 text-yellow-700",
                    tenant.status === "ended" && "bg-gray-100 text-gray-600"
                  )}
                >
                  {tenant.status === "active" ? t("active") : ""}
                  {tenant.status === "pending" ? t("pending") : ""}
                  {tenant.status === "ended" ? t("ended") : ""}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#6B6560]" />
                  <span className="text-sm text-[#6B6560] truncate">
                    {tenant.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#6B6560]" />
                  <span className="text-sm text-[#6B6560]">
                    {tenant.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#6B6560]" />
                  <span className="text-sm text-[#6B6560]">
                    {tenant.buildingName} - {t("units")} {tenant.unit}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8E5DB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B6560]">{t("netRentLabel")}</span>
                  <span className="font-medium text-[#171414]">{formatCHF(rentNet)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B6560]">{t("chargesLabel")}</span>
                  <span className="font-medium text-[#171414]">{formatCHF(charges)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B6560]">
                    {t("monthlyTotal")}
                  </span>
                  <span className="font-semibold text-[#171414]">{formatCHF(total)}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Calendar className="w-4 h-4 text-[#6B6560]" />
                  <span className="text-sm text-[#6B6560]">
                    {formatDateRange(tenant.leaseStart, tenant.leaseEnd)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTenants.length === 0 && (
        <Card className="p-12 bg-white border border-[#E8E5DB] shadow-sm text-center mt-6">
          <Users className="w-16 h-16 text-[#6B6560] mx-auto mb-4" />
          <h3 className="text-xl mb-2 text-[#171414]">{t("noTenants")}</h3>
          <p className="text-[#6B6560] mb-6">
            {selectedBuildingId === "all"
              ? t("startAddTenant")
              : t("noTenants")}
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#45553A] hover:bg-[#3a4930] text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("addTenant")}
          </Button>
        </Card>
      )}
    </div>
  );
}
