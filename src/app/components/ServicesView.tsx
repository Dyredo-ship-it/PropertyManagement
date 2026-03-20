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
  Users,
  Shield,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  Search,
  Filter,
  Award,
  Clock,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

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
  responseTime: string; // e.g., "< 2h"
  pricing: "\u20AC" | "\u20AC\u20AC" | "\u20AC\u20AC\u20AC";
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

// Mock data - This would come from a database
const MOCK_PROVIDERS: ServiceProvider[] = [
  {
    id: "1",
    name: "SwissPlumb Pro",
    category: "plumbing",
    description: "Expert en plomberie depuis 1995. Interventions d'urgence 24/7.",
    rating: 4.8,
    reviewCount: 127,
    responseTime: "< 1h",
    pricing: "\u20AC\u20AC",
    verified: true,
    featured: true,
    services: [
      "R\u00E9paration fuites",
      "Installation sanitaire",
      "D\u00E9bouchage",
      "Urgences 24/7",
    ],
    phone: "+41 22 123 45 67",
    email: "contact@swissplumb.ch",
    address: "Rue de la Fontaine 12, 1200 Gen\u00E8ve",
    website: "www.swissplumb.ch",
    availableNow: true,
    certifications: ["ISO 9001", "Label Qualit\u00E9 CH"],
  },
  {
    id: "2",
    name: "ElectroTech Services",
    category: "electrical",
    description: "Installation et d\u00E9pannage \u00E9lectrique pour professionnels.",
    rating: 4.9,
    reviewCount: 203,
    responseTime: "< 2h",
    pricing: "\u20AC\u20AC\u20AC",
    verified: true,
    featured: true,
    services: [
      "Tableaux \u00E9lectriques",
      "Installation prises",
      "Mise aux normes",
      "D\u00E9pannage",
    ],
    phone: "+41 22 234 56 78",
    email: "info@electrotech.ch",
    address: "Avenue du L\u00E9man 45, 1005 Lausanne",
    website: "www.electrotech.ch",
    availableNow: true,
    certifications: ["Electricien certifi\u00E9 ESTI", "Formation continue"],
  },
  {
    id: "3",
    name: "Chauffage Plus",
    category: "heating",
    description: "Sp\u00E9cialiste chauffage et climatisation pour immeubles.",
    rating: 4.7,
    reviewCount: 89,
    responseTime: "< 3h",
    pricing: "\u20AC\u20AC",
    verified: true,
    featured: false,
    services: [
      "Entretien chaudi\u00E8res",
      "Installation pompes \u00E0 chaleur",
      "R\u00E9parations",
      "Contrats maintenance",
    ],
    phone: "+41 22 345 67 89",
    email: "contact@chauffageplus.ch",
    address: "Chemin des Acacias 8, 1227 Gen\u00E8ve",
    availableNow: false,
    certifications: ["Cecb Expert", "Swisstherm"],
  },
  {
    id: "4",
    name: "Peinture Pro SA",
    category: "painting",
    description: "Peinture int\u00E9rieure et ext\u00E9rieure pour tous types de b\u00E2timents.",
    rating: 4.6,
    reviewCount: 156,
    responseTime: "< 1 jour",
    pricing: "\u20AC",
    verified: true,
    featured: false,
    services: [
      "Peinture int\u00E9rieure",
      "Peinture ext\u00E9rieure",
      "Papier peint",
      "Rev\u00EAtements",
    ],
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
    pricing: "\u20AC",
    verified: true,
    featured: true,
    services: [
      "Nettoyage parties communes",
      "Nettoyage fin de chantier",
      "D\u00E9sinfection",
      "Contrats r\u00E9guliers",
    ],
    phone: "+41 22 567 89 01",
    email: "info@netpro.ch",
    address: "Rue du Commerce 56, 1204 Gen\u00E8ve",
    website: "www.netpro.ch",
    availableNow: true,
  },
  {
    id: "6",
    name: "SecureHome Systems",
    category: "security",
    description: "Installation et maintenance de syst\u00E8mes de s\u00E9curit\u00E9.",
    rating: 4.9,
    reviewCount: 178,
    responseTime: "< 2h",
    pricing: "\u20AC\u20AC\u20AC",
    verified: true,
    featured: true,
    services: [
      "Vid\u00E9osurveillance",
      "Contr\u00F4le d'acc\u00E8s",
      "Alarmes",
      "Interphones",
    ],
    phone: "+41 22 678 90 12",
    email: "contact@securehome.ch",
    address: "Boulevard Carl-Vogt 89, 1205 Gen\u00E8ve",
    website: "www.securehome.ch",
    availableNow: true,
    certifications: ["Certifi\u00E9 VdS", "EN 50131"],
  },
];

export function ServicesView() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.services.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Featured providers first
    return filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });
  }, [selectedCategory, searchQuery]);

  const featuredProviders = useMemo(() => {
    return MOCK_PROVIDERS.filter((p) => p.featured).slice(0, 3);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF5F2]">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-[#E8E5DB] p-8 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171414]">
                {t("servicesTitle")}
              </h1>
              <p className="mt-2 text-[#6B6560]">
                {t("servicesSub")}
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-[#45553A]/30 bg-[#45553A]/10">
              <Award className="w-5 h-5 text-[#45553A]" />
              <span className="text-sm font-medium text-[#45553A]">
                {t("premiumPartners")}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6560]" />
            <input
              type="text"
              placeholder={t("searchServicePlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#E8E5DB] text-base bg-[#FAF5F2] text-[#171414]"
            />
          </div>
        </div>

        {/* Featured Providers */}
        {selectedCategory === "all" && !searchQuery && (
          <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-5 h-5 text-[#45553A]" />
              <h2 className="text-xl font-semibold text-[#171414]">
                {t("premiumPartners")}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredProviders.map((provider) => (
                <FeaturedProviderCard
                  key={provider.id}
                  provider={provider}
                  onClick={() => setSelectedProvider(provider)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-[#171414]">
            {t("categories")}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left",
                    isActive
                      ? "border-[#45553A] bg-[#45553A]/10"
                      : "border-[#E8E5DB] bg-[#FAF5F2] hover:bg-[#E8E5DB]/50",
                  ].join(" ")}
                >
                  <Icon className="w-5 h-5 shrink-0 text-[#6B6560]" />
                  <span className="text-sm font-medium truncate text-[#171414]">
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Providers List */}
        <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-[#171414]">
              {selectedCategory === "all"
                ? t("allServices")
                : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <span className="text-sm text-[#6B6560]">
              {filteredProviders.length} {filteredProviders.length > 1 ? t("results") : t("result")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredProviders.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-16 h-16 mx-auto mb-4 text-[#E8E5DB]" />
                <p className="text-base font-medium text-[#6B6560]">
                  {t("noProviders")}
                </p>
                <p className="text-sm mt-1 text-[#6B6560]">
                  {t("tryOtherCriteria")}
                </p>
              </div>
            ) : (
              filteredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onClick={() => setSelectedProvider(provider)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Provider Detail Modal */}
      {selectedProvider && (
        <ProviderDetailModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}

// Featured Provider Card
function FeaturedProviderCard({
  provider,
  onClick,
}: {
  provider: ServiceProvider;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const getCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case "plumbing":
        return Droplet;
      case "electrical":
        return Zap;
      case "heating":
      case "hvac":
        return Wind;
      case "painting":
        return Paintbrush;
      case "locksmith":
        return Lock;
      case "cleaning":
        return Trash2;
      case "security":
        return Shield;
      default:
        return Wrench;
    }
  };

  const Icon = getCategoryIcon(provider.category);

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-[#45553A]/30 p-5 transition-all hover:scale-105 bg-[#45553A]/5"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl border border-[#45553A]/30 bg-[#45553A]/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-[#45553A]" />
        </div>

        {provider.verified && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-600">
              {t("verified")}
            </span>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-base mb-1 text-[#171414]">
        {provider.name}
      </h3>

      <div className="flex items-center gap-1 mb-3">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-medium text-[#171414]">
          {provider.rating}
        </span>
        <span className="text-xs text-[#6B6560]">
          ({provider.reviewCount} {t("reviews")})
        </span>
      </div>

      <p className="text-sm line-clamp-2 text-[#6B6560]">
        {provider.description}
      </p>
    </button>
  );
}

// Provider Card
function ProviderCard({
  provider,
  onClick,
}: {
  provider: ServiceProvider;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const getCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case "plumbing":
        return Droplet;
      case "electrical":
        return Zap;
      case "heating":
      case "hvac":
        return Wind;
      case "painting":
        return Paintbrush;
      case "locksmith":
        return Lock;
      case "cleaning":
        return Trash2;
      case "security":
        return Shield;
      default:
        return Wrench;
    }
  };

  const Icon = getCategoryIcon(provider.category);

  return (
    <button
      onClick={onClick}
      className={[
        "text-left rounded-2xl border p-6 transition-all hover:bg-[#FAF5F2]",
        provider.featured
          ? "border-[#45553A]/20"
          : "border-[#E8E5DB]",
        "bg-white",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] flex items-center justify-center shrink-0">
          <Icon className="w-7 h-7 text-[#6B6560]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate text-[#171414]">
                  {provider.name}
                </h3>
                {provider.featured && (
                  <Award className="w-4 h-4 shrink-0 text-[#45553A]" />
                )}
              </div>

              <p className="text-sm line-clamp-1 text-[#6B6560]">
                {provider.description}
              </p>
            </div>

            {/* Rating */}
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-base font-semibold text-[#171414]">
                  {provider.rating}
                </span>
              </div>
              <p className="text-xs text-[#6B6560]">
                {provider.reviewCount} {t("reviews")}
              </p>
            </div>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-2 mb-3">
            {provider.services.slice(0, 3).map((service, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full text-xs bg-[#FAF5F2] text-[#6B6560] border border-[#E8E5DB]"
              >
                {service}
              </span>
            ))}
            {provider.services.length > 3 && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-[#FAF5F2] text-[#6B6560] border border-[#E8E5DB]">
                +{provider.services.length - 3}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#6B6560]" />
              <span className="text-xs text-[#6B6560]">
                {t("responds")} {provider.responseTime}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#6B6560]" />
              <span className="text-xs text-[#6B6560]">
                {provider.pricing}
              </span>
            </div>

            {provider.verified && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">
                  {t("verified")}
                </span>
              </div>
            )}

            {provider.availableNow && (
              <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {t("available")}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Provider Detail Modal
function ProviderDetailModal({
  provider,
  onClose,
}: {
  provider: ServiceProvider;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-[#E8E5DB] p-8 max-h-[90vh] overflow-y-auto bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-semibold text-[#171414]">
                {provider.name}
              </h2>
              {provider.featured && (
                <Award className="w-6 h-6 text-[#45553A]" />
              )}
              {provider.verified && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-semibold text-[#171414]">
                {provider.rating}
              </span>
              <span className="text-sm text-[#6B6560]">
                ({provider.reviewCount} {t("reviews")})
              </span>
            </div>

            <p className="text-base text-[#6B6560]">
              {provider.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-[#E8E5DB]/50 text-[#6B6560]"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>

        {/* Services */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-[#171414]">
            {t("offeredServices")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {provider.services.map((service, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl text-sm bg-[#FAF5F2] text-[#6B6560] border border-[#E8E5DB]"
              >
                {service}
              </span>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-[#171414]">
            {t("contactInfo")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#6B6560]" />
              <span className="text-[#171414]">
                {provider.phone}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#6B6560]" />
              <span className="text-[#171414]">
                {provider.email}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#6B6560]" />
              <span className="text-[#171414]">
                {provider.address}
              </span>
            </div>
            {provider.website && (
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-[#6B6560]" />
                <a
                  href={`https://${provider.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[#45553A]"
                >
                  {provider.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Certifications */}
        {provider.certifications && provider.certifications.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-[#171414]">
              {t("certifications")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {provider.certifications.map((cert, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm bg-green-100 text-green-700"
                >
                  <Award className="w-4 h-4" />
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-[#E8E5DB] font-medium transition-colors hover:bg-[#E8E5DB]/50 text-[#171414] bg-[#FAF5F2]"
            onClick={() => window.location.href = `tel:${provider.phone}`}
          >
            <Phone className="w-5 h-5" />
            {t("call")}
          </button>

          <button
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-medium transition-all hover:bg-[#3a4930] bg-[#45553A] text-white"
            onClick={() => window.location.href = `mailto:${provider.email}?subject=Demande de devis`}
          >
            <Mail className="w-5 h-5" />
            {t("requestQuote")}
          </button>
        </div>
      </div>
    </div>
  );
}
