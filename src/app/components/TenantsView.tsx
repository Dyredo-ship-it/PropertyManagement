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
  X,
  Search,
  ChevronRight,
  MapPin,
  Home,
  DollarSign,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
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
  getMaintenanceRequests,
  type Tenant,
  type Building,
  type MaintenanceRequest,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

type TenantNote = {
  id: string;
  date: string;
  text: string;
  createdAt: string;
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
  uploadedAt: string;
  dataUrl: string;
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

// Premium building gradient backgrounds for visual identity
const BUILDING_GRADIENTS = [
  "from-[#45553A]/90 to-[#45553A]/70",
  "from-[#5A6B4F]/90 to-[#3D4A33]/70",
  "from-[#4A5D3E]/90 to-[#354529]/70",
  "from-[#526645]/90 to-[#3A4D2E]/70",
  "from-[#3E5235]/90 to-[#2D3C26]/70",
];

// Building placeholder images (Unsplash)
const BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=600&h=300&fit=crop",
];

// Status badge component
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const config = {
    active: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    ended: { bg: "bg-slate-100 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" },
  }[status] ?? { bg: "bg-slate-100 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" };

  const label = status === "active" ? t("active") : status === "pending" ? t("pending") : t("ended");

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", config.bg, config.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {label}
    </span>
  );
}

// Tenant bubble card
function TenantBubble({
  tenant,
  onClick,
  formatCHF,
  t,
}: {
  tenant: any;
  onClick: () => void;
  formatCHF: (v: number) => string;
  t: (key: string) => string;
}) {
  const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
  const charges = Number(tenant.charges ?? 0) || 0;
  const total = rentNet + charges;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl border border-[#E8E5DB]/80 p-4 hover:border-[#45553A]/30 hover:shadow-lg hover:shadow-[#45553A]/5 transition-all duration-300 cursor-pointer relative overflow-hidden"
    >
      {/* Subtle hover accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#45553A]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        {/* Top row: avatar + name + status */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#45553A]/8 flex items-center justify-center shrink-0">
            {tenant.gender === "female" ? (
              <span className="text-base text-[#45553A]">{"\u2640"}</span>
            ) : tenant.gender === "male" ? (
              <span className="text-base text-[#45553A]">{"\u2642"}</span>
            ) : (
              <User className="w-4.5 h-4.5 text-[#45553A]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-[#171414] text-sm leading-tight truncate">
              {tenant.name}
            </h4>
            <p className="text-xs text-[#6B6560] mt-0.5">
              {t("unit")} {tenant.unit}
            </p>
          </div>
          <StatusBadge status={tenant.status} t={t} />
        </div>

        {/* Financial summary */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E8E5DB]/60">
          <span className="text-xs text-[#6B6560]">{t("totalMonthly")}</span>
          <span className="text-sm font-semibold text-[#171414]">{formatCHF(total)}</span>
        </div>

        {/* Hover indicator */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[10px] text-[#45553A] font-medium">{t("viewProfile")}</span>
          <ChevronRight className="w-3 h-3 text-[#45553A]" />
        </div>
      </div>
    </button>
  );
}

// Building card with tenants inside
function BuildingCard({
  building,
  tenants,
  index,
  onTenantClick,
  formatCHF,
  t,
  requests,
}: {
  building: Building;
  tenants: any[];
  index: number;
  onTenantClick: (tenant: any) => void;
  formatCHF: (v: number) => string;
  t: (key: string) => string;
  requests: MaintenanceRequest[];
}) {
  const gradient = BUILDING_GRADIENTS[index % BUILDING_GRADIENTS.length];
  const image = BUILDING_IMAGES[index % BUILDING_IMAGES.length];
  const activeTenants = tenants.filter((tn) => tn.status === "active").length;
  const buildingRequests = requests.filter((r) => r.buildingId === building.id);
  const pendingCount = buildingRequests.filter((r) => r.status === "pending" || r.status === "in-progress").length;
  const totalRevenue = tenants.reduce((sum, tn) => {
    return sum + (Number(tn.rentNet ?? 0) || 0) + (Number(tn.charges ?? 0) || 0);
  }, 0);

  return (
    <div className="rounded-3xl bg-white border border-[#E8E5DB]/60 shadow-sm overflow-hidden">
      {/* Building header with image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={image}
          alt={building.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className={cn("absolute inset-0 bg-gradient-to-t", gradient)} />

        {/* Building info overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{building.name}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/70" />
                <span className="text-sm text-white/80">{building.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Building metrics bar */}
      <div className="grid grid-cols-4 divide-x divide-[#E8E5DB]/60 border-b border-[#E8E5DB]/60">
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[#171414]">{tenants.length}</p>
          <p className="text-[10px] text-[#6B6560] uppercase tracking-wider font-medium">{t("tenantCount")}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[#171414]">{building.units}</p>
          <p className="text-[10px] text-[#6B6560] uppercase tracking-wider font-medium">{t("units")}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[#45553A]">
            {building.units > 0 ? Math.round((activeTenants / building.units) * 100) : 0}%
          </p>
          <p className="text-[10px] text-[#6B6560] uppercase tracking-wider font-medium">{t("occupancyLabel")}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[#171414]">{formatCHF(totalRevenue)}</p>
          <p className="text-[10px] text-[#6B6560] uppercase tracking-wider font-medium">{t("revenue")}</p>
        </div>
      </div>

      {/* Pending requests indicator */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50/50 border-b border-amber-100">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">
            {pendingCount} {t("openRequests").toLowerCase()}
          </span>
        </div>
      )}

      {/* Tenant grid */}
      <div className="p-5">
        {tenants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {tenants.map((tenant) => (
              <TenantBubble
                key={tenant.id}
                tenant={tenant}
                onClick={() => onTenantClick(tenant)}
                formatCHF={formatCHF}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-[#E8E5DB] mx-auto mb-3" />
            <p className="text-sm text-[#6B6560]">{t("noTenants")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Slide-out detail panel for a tenant
function TenantDetailDrawer({
  tenant,
  open,
  onClose,
  t,
  formatCHF,
  formatDateRange,
  onEdit,
  onDelete,
  onEmail,
  onOpenFiche,
  ficheNotes,
  ficheDocs,
  noteDate,
  setNoteDate,
  noteText,
  setNoteText,
  addNote,
  deleteNote,
  docCategory,
  setDocCategory,
  fileInputRef,
  uploadDoc,
  deleteDoc,
  requests,
}: {
  tenant: any;
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
  formatCHF: (v: number) => string;
  formatDateRange: (start?: string, end?: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  onOpenFiche: () => void;
  ficheNotes: TenantNote[];
  ficheDocs: TenantDocument[];
  noteDate: string;
  setNoteDate: (v: string) => void;
  noteText: string;
  setNoteText: (v: string) => void;
  addNote: () => void;
  deleteNote: (id: string) => void;
  docCategory: TenantDocument["category"];
  setDocCategory: (v: TenantDocument["category"]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadDoc: (file: File) => Promise<void>;
  deleteDoc: (id: string) => void;
  requests: MaintenanceRequest[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "documents">("overview");

  if (!tenant) return null;

  const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
  const charges = Number(tenant.charges ?? 0) || 0;
  const total = rentNet + charges;

  const tenantRequests = requests.filter((r) => r.tenantId === tenant.id);
  const openReqs = tenantRequests.filter((r) => r.status === "pending" || r.status === "in-progress");
  const closedReqs = tenantRequests.filter((r) => r.status === "completed");

  const tabs = [
    { key: "overview" as const, label: t("details") },
    { key: "notes" as const, label: t("tenantNotes") },
    { key: "documents" as const, label: t("viewDocuments") },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="shrink-0 border-b border-[#E8E5DB]/60">
          {/* Top bar with close */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#45553A]/8 flex items-center justify-center">
                {tenant.gender === "female" ? (
                  <span className="text-2xl text-[#45553A]">{"\u2640"}</span>
                ) : tenant.gender === "male" ? (
                  <span className="text-2xl text-[#45553A]">{"\u2642"}</span>
                ) : (
                  <User className="w-7 h-7 text-[#45553A]" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171414]">{tenant.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={tenant.status} t={t} />
                  <span className="text-xs text-[#6B6560]">
                    {tenant.buildingName} &middot; {t("unit")} {tenant.unit}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#E8E5DB]/50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-[#6B6560]" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-6 pb-4">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#45553A] text-white text-xs font-medium hover:bg-[#3a4930] transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              {t("edit")}
            </button>
            <button
              onClick={onEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF5F2] border border-[#E8E5DB] text-[#171414] text-xs font-medium hover:bg-[#E8E5DB]/50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {t("contactTenant")}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("delete")}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative",
                  activeTab === tab.key
                    ? "text-[#45553A] bg-[#FAF5F2]"
                    : "text-[#6B6560] hover:text-[#171414] hover:bg-[#FAF5F2]/50"
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#45553A] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "overview" && (
            <div className="p-6 space-y-6">
              {/* Contact info */}
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#6B6560]">
                  {t("contactTenant")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF5F2]/70 border border-[#E8E5DB]/40">
                    <div className="w-9 h-9 rounded-lg bg-[#45553A]/8 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-[#45553A]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium">{t("email")}</p>
                      <p className="text-sm text-[#171414] truncate">{tenant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF5F2]/70 border border-[#E8E5DB]/40">
                    <div className="w-9 h-9 rounded-lg bg-[#45553A]/8 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-[#45553A]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium">{t("phone")}</p>
                      <p className="text-sm text-[#171414]">{tenant.phone}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Lease details */}
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#6B6560]">
                  {t("leaseDetails")}
                </h3>
                <div className="rounded-2xl border border-[#E8E5DB]/60 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-[#E8E5DB]/60">
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium mb-1">{t("leaseStart")}</p>
                      <p className="text-sm font-semibold text-[#171414]">
                        {tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("fr-CH") : "\u2014"}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium mb-1">{t("leaseEnd")}</p>
                      <p className="text-sm font-semibold text-[#171414]">
                        {tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString("fr-CH") : "\u2014"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[#E8E5DB]/60 grid grid-cols-2 divide-x divide-[#E8E5DB]/60">
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium mb-1">{t("building")}</p>
                      <p className="text-sm font-semibold text-[#171414]">{tenant.buildingName}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium mb-1">{t("unit")}</p>
                      <p className="text-sm font-semibold text-[#171414]">{tenant.unit}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Financials */}
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#6B6560]">
                  {t("financials")}
                </h3>
                <div className="rounded-2xl border border-[#E8E5DB]/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B6560]">{t("netRentLabel")}</span>
                    <span className="text-sm font-medium text-[#171414]">{formatCHF(rentNet)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B6560]">{t("chargesLabel")}</span>
                    <span className="text-sm font-medium text-[#171414]">{formatCHF(charges)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#E8E5DB]/60">
                    <span className="text-sm font-semibold text-[#171414]">{t("totalMonthly")}</span>
                    <span className="text-lg font-bold text-[#45553A]">{formatCHF(total)}</span>
                  </div>
                </div>
              </section>

              {/* Requests overview */}
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#6B6560]">
                  {t("recentActivity")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#E8E5DB]/60 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-2xl font-bold text-[#171414]">{openReqs.length}</span>
                    </div>
                    <p className="text-xs text-[#6B6560]">{t("openRequests")}</p>
                  </div>
                  <div className="rounded-xl border border-[#E8E5DB]/60 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-2xl font-bold text-[#171414]">{closedReqs.length}</span>
                    </div>
                    <p className="text-xs text-[#6B6560]">{t("closedRequests")}</p>
                  </div>
                </div>

                {tenantRequests.length > 0 ? (
                  <div className="space-y-2">
                    {tenantRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF5F2]/70 border border-[#E8E5DB]/40">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          req.status === "completed" ? "bg-emerald-500" : req.status === "in-progress" ? "bg-blue-500" : "bg-amber-500"
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#171414] truncate">{req.title}</p>
                          <p className="text-xs text-[#6B6560]">
                            {new Date(req.createdAt).toLocaleDateString("fr-CH")}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          req.status === "completed" ? "bg-emerald-50 text-emerald-700" : req.status === "in-progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {req.status === "completed" ? t("completed") : req.status === "in-progress" ? t("inProgress") : t("pending")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 rounded-xl bg-[#FAF5F2]/50">
                    <Clock className="w-8 h-8 text-[#E8E5DB] mx-auto mb-2" />
                    <p className="text-xs text-[#6B6560]">{t("noActivity")}</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#6B6560]">
                  {t("internalNotes")}
                </h3>
                <p className="text-xs text-[#6B6560]">{t("managementNotes")}</p>

                {/* Add note form */}
                <div className="rounded-2xl border border-[#E8E5DB]/60 p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-32">
                      <Label className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium">{t("noteDate")}</Label>
                      <Input
                        type="date"
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-1 text-sm h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium">{t("tenantNotes")}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder={t("writeNote")}
                          className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] text-sm h-9"
                          onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                        />
                        <Button
                          type="button"
                          onClick={addNote}
                          className="bg-[#45553A] hover:bg-[#3a4930] text-white h-9 px-4"
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes list */}
                <div className="space-y-2">
                  {ficheNotes.length === 0 ? (
                    <div className="text-center py-10 rounded-xl bg-[#FAF5F2]/50">
                      <MessageSquare className="w-10 h-10 text-[#E8E5DB] mx-auto mb-3" />
                      <p className="text-sm text-[#6B6560]">{t("noNotesYet")}</p>
                    </div>
                  ) : (
                    ficheNotes
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((n) => (
                        <div
                          key={n.id}
                          className="rounded-xl border border-[#E8E5DB]/60 bg-white p-4 group/note hover:border-[#E8E5DB] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#45553A]" />
                                <span className="text-xs font-semibold text-[#45553A]">
                                  {new Date(n.date).toLocaleDateString("fr-CH")}
                                </span>
                              </div>
                              <p className="text-sm text-[#171414] whitespace-pre-wrap leading-relaxed">
                                {n.text}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteNote(n.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/note:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#6B6560]">
                  {t("documents")}
                </h3>

                {/* Upload form */}
                <div className="rounded-2xl border border-[#E8E5DB]/60 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 items-end">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium">{t("category")}</Label>
                      <Select
                        value={docCategory}
                        onValueChange={(v: any) => setDocCategory(v)}
                      >
                        <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-1 text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-[#6B6560] font-medium">{t("file")}</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-1 text-sm h-9"
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
                  </div>
                </div>

                {/* Documents list */}
                <div className="space-y-2">
                  {ficheDocs.length === 0 ? (
                    <div className="text-center py-10 rounded-xl bg-[#FAF5F2]/50">
                      <FileText className="w-10 h-10 text-[#E8E5DB] mx-auto mb-3" />
                      <p className="text-sm text-[#6B6560]">{t("noDocuments")}</p>
                    </div>
                  ) : (
                    ficheDocs.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-[#E8E5DB]/60 bg-white p-4 group/doc hover:border-[#E8E5DB] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#45553A]/8 flex items-center justify-center shrink-0">
                            <Paperclip className="w-4 h-4 text-[#45553A]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#171414] truncate">{d.filename}</p>
                            <p className="text-xs text-[#6B6560]">
                              {d.category} &middot; {t("addedOn")} {new Date(d.uploadedAt).toLocaleDateString("fr-CH")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={d.dataUrl}
                              download={d.filename}
                              className="p-2 hover:bg-[#E8E5DB]/50 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4 text-[#45553A]" />
                            </a>
                            <button
                              onClick={() => deleteDoc(d.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/doc:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Main TenantsView
// ─────────────────────────────────────────────
export function TenantsView() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Detail drawer
  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);

  // Notes/docs state
  const [noteDate, setNoteDate] = useState<string>(todayISO());
  const [noteText, setNoteText] = useState<string>("");
  const [docCategory, setDocCategory] = useState<TenantDocument["category"]>("Contrat de bail");
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
  }, []);

  const loadData = () => {
    const allTenants = getTenants() as any[];
    const b = getBuildings();
    const r = getMaintenanceRequests();
    setTenants(allTenants as Tenant[]);
    setBuildings(b);
    setRequests(r);
  };

  // Search filter
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter(
      (tn: any) =>
        tn.name?.toLowerCase().includes(q) ||
        tn.email?.toLowerCase().includes(q) ||
        tn.unit?.toLowerCase().includes(q) ||
        tn.buildingName?.toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  // Group tenants by building
  const buildingsWithTenants = useMemo(() => {
    return buildings.map((b) => ({
      building: b,
      tenants: filteredTenants.filter((tn: any) => tn.buildingId === b.id),
    })).filter((group) => group.tenants.length > 0 || !searchQuery.trim());
  }, [buildings, filteredTenants, searchQuery]);

  // Drawer tenant
  const drawerTenant = useMemo(() => {
    if (!drawerTenantId) return null;
    return (tenants as any[]).find((tn) => tn.id === drawerTenantId) ?? null;
  }, [tenants, drawerTenantId]);

  const ficheNotes: TenantNote[] = useMemo(() => {
    const raw = (drawerTenant as any)?.notes ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [drawerTenant]);

  const ficheDocs: TenantDocument[] = useMemo(() => {
    const raw = (drawerTenant as any)?.documents ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [drawerTenant]);

  const formatCHF = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    const s = Math.round(n).toString();
    const withApostrophe = s.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `CHF ${withApostrophe}`;
  };

  const formatDateRange = (start?: string, end?: string) => {
    const fmt = (d?: string) =>
      d ? new Date(d).toLocaleDateString("fr-CH") : "\u2014";
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
      const updated = (tenants as any).map((tn: any) =>
        tn.id === (editingTenant as any).id ? { ...tn, ...payload } : tn
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
    setDrawerTenantId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteTenant"))) {
      const updated = (tenants as any).filter((tn: any) => tn.id !== id);
      saveTenants(updated as any);
      setDrawerTenantId(null);
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

  const openDrawer = (tenant: any) => {
    setDrawerTenantId(tenant.id);
    setNoteDate(todayISO());
    setNoteText("");
    setDocCategory("Contrat de bail");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateTenantById = (tenantId: string, patch: Partial<any>) => {
    const updated = (tenants as any[]).map((tn) =>
      tn.id === tenantId ? { ...tn, ...patch } : tn
    );
    saveTenants(updated as any);
    setTenants(updated as any);
  };

  const addNote = () => {
    if (!drawerTenantId) return;
    const text = noteText.trim();
    if (!text) return;

    const next: TenantNote = {
      id: `${Date.now()}`,
      date: noteDate || todayISO(),
      text,
      createdAt: new Date().toISOString(),
    };

    const current = ((drawerTenant as any)?.notes ?? []) as TenantNote[];
    updateTenantById(drawerTenantId, { notes: [next, ...current] });
    setNoteText("");
    setNoteDate(todayISO());
  };

  const deleteNote = (noteId: string) => {
    if (!drawerTenantId) return;
    const current = ((drawerTenant as any)?.notes ?? []) as TenantNote[];
    updateTenantById(drawerTenantId, {
      notes: current.filter((n) => n.id !== noteId),
    });
  };

  const uploadDoc = async (file: File) => {
    if (!drawerTenantId) return;
    const dataUrl = await fileToDataUrl(file);
    const next: TenantDocument = {
      id: `${Date.now()}`,
      category: docCategory,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      dataUrl,
    };
    const current = ((drawerTenant as any)?.documents ?? []) as TenantDocument[];
    updateTenantById(drawerTenantId, { documents: [next, ...current] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteDoc = (docId: string) => {
    if (!drawerTenantId) return;
    const current = ((drawerTenant as any)?.documents ?? []) as TenantDocument[];
    updateTenantById(drawerTenantId, {
      documents: current.filter((d) => d.id !== docId),
    });
  };

  // Stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tn) => tn.status === "active").length;

  return (
    <div className="min-h-screen bg-[#FAF5F2]">
      {/* Page header */}
      <div className="sticky top-0 z-30 bg-[#FAF5F2]/95 backdrop-blur-md border-b border-[#E8E5DB]/60">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#171414]">{t("tenantsTitle")}</h1>
              <p className="text-sm text-[#6B6560] mt-0.5">{t("tenantsOverview")}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6560]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchTenants")}
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E8E5DB] text-sm text-[#171414] placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#45553A]/20 focus:border-[#45553A]/30 w-64 transition-all"
                />
              </div>

              {/* Add tenant button */}
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white rounded-xl h-10 px-5 shadow-sm shadow-[#45553A]/10">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("addTenant")}
                  </Button>
                </DialogTrigger>

                <DialogContent className="bg-white border-[#E8E5DB] max-h-[90vh] overflow-y-auto rounded-2xl">
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
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-[#171414]">{t("phone")}</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="building" className="text-[#171414]">{t("building")}</Label>
                      <Select
                        value={formData.buildingId}
                        onValueChange={(value) => setFormData({ ...formData, buildingId: value })}
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
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          required
                          className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender" className="text-[#171414]">{t("gender")}</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
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
                          onChange={(e) => setFormData({ ...formData, rentNet: parseInt(e.target.value) || 0 })}
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
                          onChange={(e) => setFormData({ ...formData, charges: parseInt(e.target.value) || 0 })}
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
                          onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
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
                          onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
                          className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="status" className="text-[#171414]">{t("status")}</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
                      <Button type="submit" className="flex-1 bg-[#45553A] hover:bg-[#3a4930] text-white">
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
          </div>

          {/* Summary metrics */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#45553A]/8 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#45553A]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#171414] leading-none">{totalTenants}</p>
                <p className="text-[10px] text-[#6B6560] uppercase tracking-wider">{t("tenantCount")}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-[#E8E5DB]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#171414] leading-none">{activeTenants}</p>
                <p className="text-[10px] text-[#6B6560] uppercase tracking-wider">{t("active")}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-[#E8E5DB]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D1D1B0]/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#45553A]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#171414] leading-none">{buildings.length}</p>
                <p className="text-[10px] text-[#6B6560] uppercase tracking-wider">{t("navBuildings")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Building sections */}
      <div className="px-6 lg:px-8 py-6 space-y-6">
        {buildingsWithTenants.length > 0 ? (
          buildingsWithTenants.map((group, i) => (
            <BuildingCard
              key={group.building.id}
              building={group.building}
              tenants={group.tenants}
              index={i}
              onTenantClick={openDrawer}
              formatCHF={formatCHF}
              t={t}
              requests={requests}
            />
          ))
        ) : (
          <div className="text-center py-20 rounded-3xl bg-white border border-[#E8E5DB]/60">
            <Building2 className="w-16 h-16 text-[#E8E5DB] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#171414] mb-2">{t("noTenants")}</h3>
            <p className="text-sm text-[#6B6560] mb-6">{t("startAddTenant")}</p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-[#45553A] hover:bg-[#3a4930] text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addTenant")}
            </Button>
          </div>
        )}
      </div>

      {/* Tenant detail drawer */}
      <TenantDetailDrawer
        tenant={drawerTenant}
        open={!!drawerTenantId}
        onClose={() => setDrawerTenantId(null)}
        t={t}
        formatCHF={formatCHF}
        formatDateRange={formatDateRange}
        onEdit={() => drawerTenant && handleEdit(drawerTenant)}
        onDelete={() => drawerTenant && handleDelete(drawerTenant.id)}
        onEmail={() => drawerTenant && handleEmailTenant(drawerTenant)}
        onOpenFiche={() => {}}
        ficheNotes={ficheNotes}
        ficheDocs={ficheDocs}
        noteDate={noteDate}
        setNoteDate={setNoteDate}
        noteText={noteText}
        setNoteText={setNoteText}
        addNote={addNote}
        deleteNote={deleteNote}
        docCategory={docCategory}
        setDocCategory={setDocCategory}
        fileInputRef={fileInputRef}
        uploadDoc={uploadDoc}
        deleteDoc={deleteDoc}
        requests={requests}
      />
    </div>
  );
}
