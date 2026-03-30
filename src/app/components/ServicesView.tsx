import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Wrench,
  Zap,
  Droplet,
  Paintbrush,
  Hammer,
  Wind,
  Lock,
  Trash2,
  Shield,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  Search,
  Award,
  Clock,
  Banknote,
  CheckCircle,
  X,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Types ───────────────────────────────────────────────────── */

type ServiceCategory =
  | "plumbing"
  | "electrical"
  | "heating"
  | "painting"
  | "general-maintenance"
  | "hvac"
  | "locksmith"
  | "cleaning"
  | "security"
  | "landscaping";

interface ServiceProvider {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  responseTime: string;
  pricing: "€" | "€€" | "€€€";
  verified: boolean;
  featured: boolean;
  services: string[];
  phone: string;
  email: string;
  address: string;
  website?: string;
  availableNow: boolean;
  certifications?: string[];
}

/* ─── Mock data ───────────────────────────────────────────────── */

const MOCK_PROVIDERS: ServiceProvider[] = [
  {
    id: "1",
    name: "SwissPlumb Pro",
    category: "plumbing",
    description: "Expert en plomberie depuis 1995. Interventions d'urgence 24/7.",
    rating: 4.8,
    reviewCount: 127,
    responseTime: "< 1h",
    pricing: "€€",
    verified: true,
    featured: true,
    services: ["Réparation fuites", "Installation sanitaire", "Débouchage", "Urgences 24/7"],
    phone: "+41 22 123 45 67",
    email: "contact@swissplumb.ch",
    address: "Rue de la Fontaine 12, 1200 Genève",
    website: "www.swissplumb.ch",
    availableNow: true,
    certifications: ["ISO 9001", "Label Qualité CH"],
  },
  {
    id: "2",
    name: "ElectroTech Services",
    category: "electrical",
    description: "Installation et dépannage électrique pour professionnels.",
    rating: 4.9,
    reviewCount: 203,
    responseTime: "< 2h",
    pricing: "€€€",
    verified: true,
    featured: true,
    services: ["Tableaux électriques", "Installation prises", "Mise aux normes", "Dépannage"],
    phone: "+41 22 234 56 78",
    email: "info@electrotech.ch",
    address: "Avenue du Léman 45, 1005 Lausanne",
    website: "www.electrotech.ch",
    availableNow: true,
    certifications: ["Electricien certifié ESTI", "Formation continue"],
  },
  {
    id: "3",
    name: "Chauffage Plus",
    category: "heating",
    description: "Spécialiste chauffage et climatisation pour immeubles.",
    rating: 4.7,
    reviewCount: 89,
    responseTime: "< 3h",
    pricing: "€€",
    verified: true,
    featured: false,
    services: ["Entretien chaudières", "Installation pompes à chaleur", "Réparations", "Contrats maintenance"],
    phone: "+41 22 345 67 89",
    email: "contact@chauffageplus.ch",
    address: "Chemin des Acacias 8, 1227 Genève",
    availableNow: false,
    certifications: ["Cecb Expert", "Swisstherm"],
  },
  {
    id: "4",
    name: "Peinture Pro SA",
    category: "painting",
    description: "Peinture intérieure et extérieure pour tous types de bâtiments.",
    rating: 4.6,
    reviewCount: 156,
    responseTime: "< 1 jour",
    pricing: "€",
    verified: true,
    featured: false,
    services: ["Peinture intérieure", "Peinture extérieure", "Papier peint", "Revêtements"],
    phone: "+41 22 456 78 90",
    email: "devis@peinturepro.ch",
    address: "Route de Meyrin 23, 1217 Meyrin",
    availableNow: true,
    certifications: ["Peintre CFC"],
  },
  {
    id: "5",
    name: "NetPro Nettoyage",
    category: "cleaning",
    description: "Nettoyage professionnel d'immeubles et parties communes.",
    rating: 4.8,
    reviewCount: 312,
    responseTime: "< 4h",
    pricing: "€",
    verified: true,
    featured: true,
    services: ["Nettoyage parties communes", "Nettoyage fin de chantier", "Désinfection", "Contrats réguliers"],
    phone: "+41 22 567 89 01",
    email: "info@netpro.ch",
    address: "Rue du Commerce 56, 1204 Genève",
    website: "www.netpro.ch",
    availableNow: true,
  },
  {
    id: "6",
    name: "SecureHome Systems",
    category: "security",
    description: "Installation et maintenance de systèmes de sécurité.",
    rating: 4.9,
    reviewCount: 178,
    responseTime: "< 2h",
    pricing: "€€€",
    verified: true,
    featured: true,
    services: ["Vidéosurveillance", "Contrôle d'accès", "Alarmes", "Interphones"],
    phone: "+41 22 678 90 12",
    email: "contact@securehome.ch",
    address: "Boulevard Carl-Vogt 89, 1205 Genève",
    website: "www.securehome.ch",
    availableNow: true,
    certifications: ["Certifié VdS", "EN 50131"],
  },
];

/* ─── Category icon map ───────────────────────────────────────── */

const CATEGORY_ICON: Record<string, React.ElementType> = {
  plumbing: Droplet,
  electrical: Zap,
  heating: Wind,
  hvac: Wind,
  painting: Paintbrush,
  "general-maintenance": Hammer,
  locksmith: Lock,
  cleaning: Trash2,
  security: Shield,
};

function getCatIcon(cat: string) {
  return CATEGORY_ICON[cat] || Wrench;
}

/* ─── Main Component ──────────────────────────────────────────── */

export function ServicesView() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  const CATEGORIES = [
    { id: "all", label: t("allServices"), icon: Wrench },
    { id: "plumbing", label: t("plumbing"), icon: Droplet },
    { id: "electrical", label: t("electrical"), icon: Zap },
    { id: "heating", label: t("heating"), icon: Wind },
    { id: "painting", label: t("painting"), icon: Paintbrush },
    { id: "general-maintenance", label: t("generalMaintenance"), icon: Hammer },
    { id: "hvac", label: t("hvac"), icon: Wind },
    { id: "locksmith", label: t("locksmith"), icon: Lock },
    { id: "cleaning", label: t("cleaning"), icon: Trash2 },
    { id: "security", label: t("security"), icon: Shield },
  ];

  const filteredProviders = useMemo(() => {
    let filtered = MOCK_PROVIDERS;
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.services.some((s) => s.toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* ── Header row: title + search ──────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 20 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 600, lineHeight: 1.2, margin: 0,
            color: "var(--foreground)",
            borderLeft: "4px solid var(--primary)",
            paddingLeft: 14,
          }}>
            {t("servicesTitle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 4, paddingLeft: 18 }}>
            {t("servicesSub")}
          </p>
        </div>
        {/* Search */}
        <div style={{ position: "relative", width: 260, flexShrink: 0 }}>
          <Search style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            width: 14, height: 14, color: "var(--muted-foreground)", pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder={t("searchServicePlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 14px 8px 34px",
              borderRadius: 10, fontSize: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>
      </div>

      {/* ── Categories + stats inline ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: active ? "rgba(69,85,58,0.07)" : "var(--card)",
                  color: active ? "var(--primary)" : "var(--muted-foreground)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--background)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "rgba(69,85,58,0.07)" : "var(--card)"; }}
              >
                <Icon style={{ width: 12, height: 12 }} />
                {cat.label}
              </button>
          );
        })}
        </div>

        {/* Inline stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>
            {filteredProviders.length} {filteredProviders.length > 1 ? t("results") : t("result")}
          </span>
          <span style={{ width: 1, height: 12, background: "var(--border)" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#15803D" }}>
            <CheckCircle style={{ width: 11, height: 11 }} />
            {MOCK_PROVIDERS.filter((p) => p.availableNow).length} {t("available")}
          </span>
        </div>
      </div>

      {/* ── Provider grid ─────────────────────────────────────── */}

      {filteredProviders.length === 0 ? (
        <div style={{
          padding: "56px 24px", borderRadius: 14, textAlign: "center",
          border: "1px solid var(--border)", background: "var(--card)",
        }}>
          <Search style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--border)" }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", margin: 0 }}>{t("noProviders")}</p>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{t("tryOtherCriteria")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filteredProviders.map((p) => (
            <ProviderCard key={p.id} provider={p} onClick={() => setSelectedProvider(p)} />
          ))}
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────── */}
      {selectedProvider && (
        <ProviderModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}

/* ─── Provider Card (compact grid card) ──────────────────────── */

function ProviderCard({
  provider,
  onClick,
}: {
  provider: ServiceProvider;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const Icon = getCatIcon(provider.category);

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", width: "100%",
        borderRadius: 14, overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--card)",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(69,85,58,0.3)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ padding: "14px 16px" }}>
        {/* Header: icon + name + rating */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: provider.featured ? "rgba(69,85,58,0.07)" : "var(--background)",
            border: provider.featured ? "none" : "1px solid var(--border)",
            color: provider.featured ? "var(--primary)" : "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 16, height: 16 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 650, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {provider.name}
              </span>
              {provider.featured && <Award style={{ width: 12, height: 12, flexShrink: 0, color: "var(--primary)" }} />}
              {provider.verified && <CheckCircle style={{ width: 12, height: 12, flexShrink: 0, color: "#15803D" }} />}
            </div>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {provider.description.length > 50 ? provider.description.slice(0, 50) + "…" : provider.description}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />

        {/* Bottom: rating + meta inline */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Star style={{ width: 12, height: 12 }} className="fill-amber-400 text-amber-400" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{provider.rating}</span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>({provider.reviewCount})</span>
            </div>
            {/* Response time */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Clock style={{ width: 11, height: 11, color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{provider.responseTime}</span>
            </div>
            {/* Pricing */}
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)" }}>{provider.pricing}</span>
          </div>

          {/* Available badge */}
          {provider.availableNow && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
              background: "rgba(34,197,94,0.08)", color: "#15803D",
            }}>
              {t("available")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Provider Modal ──────────────────────────────────────────── */

function ProviderModal({
  provider,
  onClose,
}: {
  provider: ServiceProvider;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const Icon = getCatIcon(provider.category);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.35)", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 520, maxHeight: "85vh",
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
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "rgba(69,85,58,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderLeft: "3px solid var(--primary)",
          }}>
            <Icon style={{ width: 18, height: 18, color: "var(--primary)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 650, color: "var(--foreground)" }}>
                {provider.name}
              </span>
              {provider.featured && <Award style={{ width: 14, height: 14, color: "var(--primary)", flexShrink: 0 }} />}
              {provider.verified && <CheckCircle style={{ width: 13, height: 13, color: "#15803D", flexShrink: 0 }} />}
            </div>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {provider.description}
            </span>
          </div>
          <button
            onClick={onClose}
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

        {/* ── Body (scrollable) ─────────────────────────────── */}
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>

          {/* Rating + Response time + Pricing strip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, marginBottom: 18,
            padding: "10px 14px", borderRadius: 10,
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Star style={{ width: 13, height: 13 }} className="fill-amber-400 text-amber-400" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{provider.rating}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>({provider.reviewCount} {t("reviews")})</span>
            </div>
            <div style={{ width: 1, height: 14, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{provider.responseTime}</span>
            </div>
            <div style={{ width: 1, height: 14, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Banknote style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>{provider.pricing}</span>
            </div>
            {provider.availableNow && (
              <>
                <div style={{ flex: 1 }} />
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                  background: "rgba(34,197,94,0.08)", color: "#15803D",
                }}>
                  {t("available")}
                </span>
              </>
            )}
          </div>

          {/* Services offered */}
          <div style={{ marginBottom: 18 }}>
            <h3 style={{
              fontSize: 10, fontWeight: 650, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--muted-foreground)",
              marginBottom: 8, margin: 0, marginBottom: 8,
            }}>
              {t("offeredServices")}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {provider.services.map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 8,
                  background: "rgba(69,85,58,0.05)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div style={{ marginBottom: 18 }}>
            <h3 style={{
              fontSize: 10, fontWeight: 650, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--muted-foreground)",
              margin: 0, marginBottom: 8,
            }}>
              {t("contactInfo")}
            </h3>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            }}>
              {/* Phone */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--background)",
                border: "1px solid var(--border)",
              }}>
                <Phone style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--foreground)" }}>{provider.phone}</span>
              </div>
              {/* Email */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--background)",
                border: "1px solid var(--border)",
              }}>
                <Mail style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{provider.email}</span>
              </div>
              {/* Address - full width */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--background)",
                border: "1px solid var(--border)",
                gridColumn: provider.website ? "1 / -1" : "1 / -1",
              }}>
                <MapPin style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--foreground)" }}>{provider.address}</span>
              </div>
              {/* Website */}
              {provider.website && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 8,
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  gridColumn: "1 / -1",
                }}>
                  <ExternalLink style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <a
                    href={`https://${provider.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "var(--primary)", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                  >
                    {provider.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Certifications */}
          {provider.certifications && provider.certifications.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <h3 style={{
                fontSize: 10, fontWeight: 650, textTransform: "uppercase",
                letterSpacing: "0.06em", color: "var(--muted-foreground)",
                margin: 0, marginBottom: 8,
              }}>
                {t("certifications")}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {provider.certifications.map((cert, i) => (
                  <span key={i} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, padding: "4px 10px", borderRadius: 8,
                    background: "rgba(34,197,94,0.06)", color: "#15803D",
                  }}>
                    <Award style={{ width: 11, height: 11 }} />
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer actions ────────────────────────────────── */}
        <div style={{
          padding: "14px 22px",
          borderTop: "1px solid var(--border)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 550,
              border: "1px solid var(--border)",
              background: "var(--card)", color: "var(--foreground)",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onClick={() => (window.location.href = `tel:${provider.phone}`)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
          >
            <Phone style={{ width: 13, height: 13 }} />
            {t("call")}
          </button>
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 550,
              border: "none",
              background: "var(--primary)", color: "var(--primary-foreground)",
              cursor: "pointer", transition: "opacity 0.15s",
            }}
            onClick={() =>
              (window.location.href = `mailto:${provider.email}?subject=Demande de devis`)
            }
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <Mail style={{ width: 13, height: 13 }} />
            {t("requestQuote")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3
        className="text-[11px] font-semibold uppercase mb-2.5"
        style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function ContactRow({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
      <span className="text-[12px]" style={{ color: "var(--foreground)" }}>
        {text}
      </span>
    </div>
  );
}
