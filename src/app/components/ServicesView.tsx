import React, { useState, useMemo } from "react";
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
  DollarSign,
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

  const featuredProviders = useMemo(
    () => MOCK_PROVIDERS.filter((p) => p.featured).slice(0, 3),
    []
  );

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4" style={{ marginBottom: 24 }}>
        <div>
          <h1
            className="text-[22px] font-semibold leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {t("servicesTitle")}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            {t("servicesSub")}
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-[12px] font-medium shrink-0"
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            background: "rgba(69,85,58,0.06)",
            color: "var(--primary)",
          }}
        >
          <Award className="w-4 h-4" />
          {t("premiumPartners")}
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────── */}
      <div className="relative" style={{ marginBottom: 20 }}>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--muted-foreground)" }}
        />
        <input
          type="text"
          placeholder={t("searchServicePlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-[13px] outline-none transition-all"
          style={{
            padding: "11px 14px 11px 38px",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(69,85,58,0.06)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* ── Categories ────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-2"
        style={{ marginBottom: 24 }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex items-center gap-2 text-[12px] font-medium transition-colors"
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: active ? "rgba(69,85,58,0.07)" : "var(--card)",
                color: active ? "var(--primary)" : "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--background)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "var(--card)";
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Featured ──────────────────────────────────────────── */}
      {selectedCategory === "all" && !searchQuery && (
        <div style={{ marginBottom: 24 }}>
          <h2
            className="flex items-center gap-2 text-[13px] font-semibold uppercase mb-3"
            style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
          >
            <Award className="w-4 h-4" style={{ color: "var(--primary)" }} />
            {t("premiumPartners")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredProviders.map((p) => (
              <FeaturedCard key={p.id} provider={p} onClick={() => setSelectedProvider(p)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Provider list ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-[14px] font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {selectedCategory === "all"
            ? t("allServices")
            : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
        </h2>
        <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {filteredProviders.length}{" "}
          {filteredProviders.length > 1 ? t("results") : t("result")}
        </span>
      </div>

      <div className="space-y-3">
        {filteredProviders.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: "64px 24px",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <Search className="w-12 h-12 mb-4" style={{ color: "var(--border)" }} />
            <p className="text-[14px] font-medium" style={{ color: "var(--foreground)" }}>
              {t("noProviders")}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
              {t("tryOtherCriteria")}
            </p>
          </div>
        ) : (
          filteredProviders.map((p) => (
            <ProviderRow key={p.id} provider={p} onClick={() => setSelectedProvider(p)} />
          ))
        )}
      </div>

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

/* ─── Featured Card ───────────────────────────────────────────── */

function FeaturedCard({
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
      className="text-left transition-all"
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: "20px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(69,85,58,0.07)",
            color: "var(--primary)",
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {provider.verified && (
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.08)", color: "#15803D" }}
          >
            <CheckCircle className="w-3 h-3" />
            {t("verified")}
          </span>
        )}
      </div>

      <h3
        className="text-[14px] font-semibold leading-snug mb-1"
        style={{ color: "var(--foreground)" }}
      >
        {provider.name}
      </h3>

      <div className="flex items-center gap-1 mb-2.5">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-[12px] font-medium" style={{ color: "var(--foreground)" }}>
          {provider.rating}
        </span>
        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          ({provider.reviewCount})
        </span>
      </div>

      <p
        className="text-[12px] leading-relaxed line-clamp-2"
        style={{ color: "var(--muted-foreground)" }}
      >
        {provider.description}
      </p>
    </button>
  );
}

/* ─── Provider Row ────────────────────────────────────────────── */

function ProviderRow({
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
      className="w-full text-left transition-all"
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: "18px 20px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--background)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--card)";
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3
                  className="text-[14px] font-semibold truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {provider.name}
                </h3>
                {provider.featured && (
                  <Award className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                )}
              </div>
              <p
                className="text-[12px] line-clamp-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {provider.description}
              </p>
            </div>

            {/* Rating */}
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {provider.rating}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {provider.reviewCount} {t("reviews")}
              </p>
            </div>
          </div>

          {/* Service tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {provider.services.slice(0, 3).map((s, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-0.5 rounded-full"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                {s}
              </span>
            ))}
            {provider.services.length > 3 && (
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                +{provider.services.length - 3}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 flex-wrap">
            <span
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Clock className="w-3.5 h-3.5" />
              {t("responds")} {provider.responseTime}
            </span>
            <span
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <DollarSign className="w-3.5 h-3.5" />
              {provider.pricing}
            </span>
            {provider.verified && (
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "#15803D" }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {t("verified")}
              </span>
            )}
            {provider.availableNow && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.08)", color: "#15803D" }}
              >
                {t("available")}
              </span>
            )}
          </div>
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", padding: 16 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: 32,
          boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <h2
                className="text-[20px] font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {provider.name}
              </h2>
              {provider.featured && (
                <Award className="w-5 h-5" style={{ color: "var(--primary)" }} />
              )}
              {provider.verified && (
                <CheckCircle className="w-4 h-4" style={{ color: "#15803D" }} />
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span
                className="text-[15px] font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {provider.rating}
              </span>
              <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                ({provider.reviewCount} {t("reviews")})
              </span>
            </div>

            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {provider.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ml-4"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--background)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Services */}
        <Section title={t("offeredServices")}>
          <div className="flex flex-wrap gap-2">
            {provider.services.map((s, i) => (
              <span
                key={i}
                className="text-[12px] px-3 py-1.5 rounded-lg"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section title={t("contactInfo")}>
          <div className="space-y-3">
            <ContactRow icon={Phone} text={provider.phone} />
            <ContactRow icon={Mail} text={provider.email} />
            <ContactRow icon={MapPin} text={provider.address} />
            {provider.website && (
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                <a
                  href={`https://${provider.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {provider.website}
                </a>
              </div>
            )}
          </div>
        </Section>

        {/* Certifications */}
        {provider.certifications && provider.certifications.length > 0 && (
          <Section title={t("certifications")}>
            <div className="flex flex-wrap gap-2">
              {provider.certifications.map((cert, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(34,197,94,0.06)",
                    color: "#15803D",
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  {cert}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            className="flex items-center justify-center gap-2 text-[13px] font-medium transition-colors"
            style={{
              padding: "11px 0",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
            }}
            onClick={() => (window.location.href = `tel:${provider.phone}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--background)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card)";
            }}
          >
            <Phone className="w-4 h-4" />
            {t("call")}
          </button>
          <button
            className="flex items-center justify-center gap-2 text-[13px] font-medium transition-colors"
            style={{
              padding: "11px 0",
              borderRadius: 12,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={() =>
              (window.location.href = `mailto:${provider.email}?subject=Demande de devis`)
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Mail className="w-4 h-4" />
            {t("requestQuote")}
          </button>
        </div>
      </div>
    </div>
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
    <div style={{ marginBottom: 24 }}>
      <h3
        className="text-[12px] font-semibold uppercase mb-3"
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
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
      <span className="text-[13px]" style={{ color: "var(--foreground)" }}>
        {text}
      </span>
    </div>
  );
}
