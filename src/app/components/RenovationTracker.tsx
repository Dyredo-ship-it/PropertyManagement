import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Trash2, X, Wrench, Calendar, Banknote, Building2,
  ChevronDown, AlertTriangle, CheckCircle,
} from "lucide-react";
import {
  getRenovations, addRenovation, deleteRenovation,
  getBuildings, type Renovation, type Building,
  getAccountingSettings,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";

/* ─── Swiss FRI/ASLOCA Depreciation Table ─────────────────── */

const AMORTIZATION_TABLE: { category: string; items: { name: string; years: number }[] }[] = [
  {
    category: "1. Chauffage / ventilation / climatisation",
    items: [
      { name: "Chaudière", years: 20 },
      { name: "Brûleur", years: 20 },
      { name: "Commande", years: 20 },
      { name: "Pompe de circulation", years: 20 },
      { name: "Cheminée - Acier chromé", years: 20 },
      { name: "Cheminée - Vitrocéramique", years: 20 },
      { name: "Pompe à chaleur", years: 20 },
      { name: "Convertisseur chauffage à distance", years: 25 },
      { name: "Capteur solaire", years: 20 },
      { name: "Chauffage au sol", years: 30 },
      { name: "Radiateur", years: 50 },
      { name: "Radiateur porte-linges", years: 30 },
      { name: "Conduites cuivre/acier/fonte", years: 50 },
      { name: "Peinture en résine synthétique (chauffage)", years: 20 },
      { name: "Installation électrique de la chaufferie", years: 20 },
      { name: "Citerne à mazout - Intérieure", years: 30 },
      { name: "Citerne à mazout - Enterrée", years: 20 },
      { name: "Compteurs de chaleur", years: 15 },
      { name: "Répartiteur des frais de chauffage", years: 15 },
      { name: "Vannes thermostatiques radiateurs", years: 20 },
      { name: "Climatiseur individuel", years: 15 },
      { name: "Ventilation contrôlée du logement", years: 20 },
      { name: "Canaux de ventilation", years: 25 },
    ],
  },
  {
    category: "2. Production d'eau chaude",
    items: [
      { name: "Chaudière combinée", years: 20 },
      { name: "Pompe de circulation (eau chaude)", years: 20 },
      { name: "Installation électrique production eau chaude", years: 20 },
      { name: "Chauffe-eau combiné avec chauffage", years: 20 },
      { name: "Chauffe-eau électrique", years: 20 },
      { name: "Appareil à gaz", years: 20 },
    ],
  },
  {
    category: "3. Cheminée",
    items: [
      { name: "Cheminée, poêle", years: 25 },
      { name: "Revêtement en briques réfractaires", years: 15 },
      { name: "Foyer à air chaud", years: 25 },
      { name: "Ventilateur évacuation fumée", years: 20 },
    ],
  },
  {
    category: "4. Enveloppe du bâtiment",
    items: [
      { name: "Isolation - Polystyrène (sagex)", years: 25 },
      { name: "Isolation - Panneaux laine de verre", years: 30 },
      { name: "Revêtement en bois (façade)", years: 30 },
      { name: "Plaques (façade)", years: 30 },
      { name: "Revêtement bardeaux en éternit", years: 40 },
      { name: "Crépis minéral pour façade", years: 40 },
      { name: "Enduit synthétique sur maçonnerie", years: 25 },
      { name: "Fenêtres double vitrage bois", years: 25 },
      { name: "Fenêtres plastiques/bois isolation", years: 25 },
      { name: "Fenêtres métal isolation", years: 30 },
      { name: "Volets roulants - Plastique", years: 20 },
      { name: "Volets roulants - Bois", years: 25 },
      { name: "Volets roulants - Métal/aluminium", years: 30 },
      { name: "Stores à lamelles - Plastique", years: 15 },
      { name: "Stores à lamelles - Extérieurs métal", years: 25 },
      { name: "Joints élastiques extérieurs", years: 10 },
      { name: "Joints caoutchouc fenêtres", years: 10 },
      { name: "Sangles volets/stores", years: 8 },
      { name: "Volets - Bois", years: 30 },
      { name: "Volets - Métal/aluminium", years: 40 },
    ],
  },
  {
    category: "5. Plafonds / murs / portes / boiseries",
    items: [
      { name: "Tapisserie qualité moyenne", years: 10 },
      { name: "Tapisserie bonne qualité", years: 15 },
      { name: "Tapisserie fibre de verre peinte", years: 20 },
      { name: "Peinture dispersion (blanc-fix)", years: 8 },
      { name: "Peinture résine alkyde synthétique", years: 15 },
      { name: "Enduit matière plastique", years: 30 },
      { name: "Enduit brut rustique minéral", years: 25 },
      { name: "Enduit blanc", years: 20 },
      { name: "Lambris - Paroi brute revêtement", years: 30 },
      { name: "Lambris - Enduit lasure", years: 20 },
      { name: "Lambris - Peint", years: 30 },
      { name: "Plafond métal suspendu", years: 20 },
      { name: "Plafond en bois lambrissé", years: 40 },
      { name: "Portes - Bois massif", years: 30 },
      { name: "Portes - Bois aggloméré", years: 25 },
      { name: "Portes - Métal", years: 30 },
      { name: "Peinture portes et cadres", years: 20 },
      { name: "Garnitures serrures portes", years: 15 },
      { name: "Joints portes caoutchouc", years: 15 },
      { name: "Serrures - Porte palière", years: 30 },
      { name: "Serrures - Portes intérieures", years: 30 },
      { name: "Armoires murales - Aggloméré", years: 20 },
      { name: "Armoires murales - Bois massif", years: 35 },
      { name: "Cadres intérieurs bois", years: 30 },
      { name: "Cadres intérieurs métal/pierre", years: 40 },
      { name: "Installation fermeture automatique", years: 20 },
    ],
  },
  {
    category: "6. Revêtements de sols",
    items: [
      { name: "Sol PVC / Novilon", years: 20 },
      { name: "Sol Caoutchouc", years: 20 },
      { name: "Sol Linoléum", years: 20 },
      { name: "Revêtement liège vitrifié", years: 15 },
      { name: "Parquet laminé classe 31 (médiocre)", years: 10 },
      { name: "Parquet laminé classe 32 (moyen)", years: 15 },
      { name: "Parquet laminé classe 33 (supérieur)", years: 25 },
      { name: "Parquet collé bois massif (mosaïque)", years: 40 },
      { name: "Parquet massif lames bois dur", years: 40 },
      { name: "Parquet bois tendre couches multiples", years: 30 },
      { name: "Parquet plaqué bois lamellé", years: 12 },
      { name: "Vitrification/traitement parquet", years: 10 },
      { name: "Carrelage terre cuite", years: 30 },
      { name: "Carrelage pierre naturelle", years: 30 },
      { name: "Carrelage pierre dure (granit/quartz)", years: 40 },
      { name: "Carrelage céramique laqué", years: 40 },
      { name: "Carrelage grès/faïence mosaïque", years: 30 },
      { name: "Carrelage grès cérame coloré sans laque", years: 40 },
      { name: "Tapis fibres naturelles", years: 10 },
      { name: "Moquette qualité moyenne", years: 10 },
      { name: "Plinthes synthétiques", years: 15 },
      { name: "Plinthes hêtre/chêne", years: 25 },
      { name: "Joints (sols)", years: 10 },
    ],
  },
  {
    category: "7. Cuisine",
    items: [
      { name: "Réfrigérateur avec congélation intégré", years: 10 },
      { name: "Congélateur indépendant", years: 15 },
      { name: "Cuisinière à gaz encastrée", years: 15 },
      { name: "Cuisinière vitrocéram", years: 15 },
      { name: "Cuisinière à induction", years: 15 },
      { name: "Plaques électriques conventionnelles", years: 15 },
      { name: "Machine à laver la vaisselle", years: 15 },
      { name: "Hotte / ventilateur filtre métallique", years: 10 },
      { name: "Four à micro-ondes", years: 15 },
      { name: "Steamer / combisteamer", years: 10 },
      { name: "Agencement cuisine aggloméré/MDF", years: 15 },
      { name: "Agencement cuisine métal/thermolaqué", years: 20 },
      { name: "Agencement cuisine bois massif", years: 20 },
      { name: "Plan de travail acier/granit/verre", years: 25 },
      { name: "Plan de travail résine synthétique", years: 15 },
      { name: "Plan de travail bois/aggloméré", years: 20 },
      { name: "Robinetterie cuisine", years: 20 },
      { name: "Grille d'aération inférieure", years: 10 },
      { name: "Rénovation complète cuisine (inférieure)", years: 20 },
      { name: "Rénovation complète cuisine (supérieure)", years: 25 },
      { name: "Faïences cuisine céramique", years: 30 },
      { name: "Faïences cuisine grès/faïence", years: 30 },
      { name: "Faïences cuisine grès cérame sans laque", years: 40 },
      { name: "Étanchéité et joints cuisine", years: 10 },
    ],
  },
  {
    category: "8. Bain / douche / W.-C.",
    items: [
      { name: "Baignoire acrylique", years: 25 },
      { name: "Baignoire acier émaillé", years: 35 },
      { name: "Réémaillage baignoire", years: 20 },
      { name: "Lavabo / W.-C. / bidet céramique", years: 35 },
      { name: "Douche W.-C. clos-o-mat", years: 20 },
      { name: "Chasse d'eau encastrée", years: 40 },
      { name: "Chasse d'eau apparente plastique", years: 20 },
      { name: "Chasse d'eau apparente céramique", years: 30 },
      { name: "Machine à laver (locataire)", years: 15 },
      { name: "Sèche-linge (locataire)", years: 15 },
      { name: "Pharmacie plastique", years: 10 },
      { name: "Pharmacie aggloméré", years: 10 },
      { name: "Pharmacie métal laqué", years: 10 },
      { name: "Miroir", years: 25 },
      { name: "Mobilier salle de bains plastique", years: 10 },
      { name: "Mobilier salle de bains aggloméré", years: 10 },
      { name: "Mobilier salle de bains métal", years: 25 },
      { name: "Cabine de douche plastique", years: 15 },
      { name: "Cabine de douche verre", years: 25 },
      { name: "Robinetterie chromée salle de bains", years: 20 },
      { name: "Joints robinetterie", years: 6 },
      { name: "Faïences salle de bains céramique", years: 30 },
      { name: "Faïences grès/faïence/mosaïque", years: 30 },
      { name: "Faïences grès cérame sans laque", years: 40 },
      { name: "Joints salle de bains", years: 8 },
      { name: "Chauffe-eau individuel", years: 15 },
      { name: "Rénovation complète salle de bains", years: 30 },
      { name: "Accessoires chromés (porte-savon etc.)", years: 15 },
      { name: "Tringle de douche chromée", years: 10 },
    ],
  },
  {
    category: "9. Installations électriques",
    items: [
      { name: "Prise câble TV", years: 10 },
      { name: "Prise ISDN", years: 10 },
      { name: "Antenne TV / parabolique", years: 10 },
      { name: "Installation téléphonique", years: 25 },
      { name: "Centrale téléphonique", years: 15 },
      { name: "Interrupteur", years: 15 },
      { name: "Prise électrique", years: 15 },
      { name: "Douille", years: 15 },
      { name: "Compteurs électriques", years: 20 },
      { name: "Éclairage / plafonniers / appliques", years: 20 },
      { name: "Câbles électriques", years: 40 },
      { name: "Installation courant fort", years: 40 },
    ],
  },
  {
    category: "10. Balcons / toiles de tente / jardin d'hiver",
    items: [
      { name: "Balcon - Construction bois", years: 30 },
      { name: "Balcon - Construction métal", years: 40 },
      { name: "Balcon - Carreaux ciment", years: 40 },
      { name: "Balcon - Carreaux grès cérame", years: 25 },
      { name: "Balustrade bois peinte", years: 20 },
      { name: "Balustrade métal/tôle thermolaquée", years: 30 },
      { name: "Toile de tente tissu", years: 15 },
      { name: "Sangles toiles de tente", years: 8 },
      { name: "Jardin d'hiver bois/plastique", years: 20 },
      { name: "Jardin d'hiver acier/vitrages", years: 25 },
      { name: "Jardin d'hiver alu/thermolaqué", years: 30 },
    ],
  },
  {
    category: "11. Aménagement cave et grenier",
    items: [
      { name: "Utilisation habitation/travail", years: 40 },
      { name: "Utilisation dépôt", years: 40 },
      { name: "Aération abri", years: 40 },
    ],
  },
  {
    category: "12. Ascenseur",
    items: [
      { name: "Ascenseur", years: 30 },
      { name: "Installations électriques ascenseur", years: 30 },
    ],
  },
  {
    category: "13. Installations communes",
    items: [
      { name: "Machine à laver (commune)", years: 15 },
      { name: "Sèche-linge (commun)", years: 15 },
      { name: "Séchoir ventilateur air chaud", years: 15 },
      { name: "Adoucisseur d'eau", years: 20 },
      { name: "Dispositif combiné de fermeture", years: 20 },
      { name: "Portes automatiques", years: 20 },
      { name: "Interphone", years: 20 },
      { name: "Boîtes aux lettres", years: 20 },
      { name: "Clôtures métal/bois", years: 15 },
      { name: "Clôtures métal/treillis", years: 25 },
      { name: "Murs de jardin/garage/clôture", years: 40 },
      { name: "Dalles ciment chemin d'accès", years: 30 },
    ],
  },
];

/* ─── Style constants ─────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "9px 12px",
  borderRadius: 9,
  fontSize: 13,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 650,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color: "var(--muted-foreground)",
  marginBottom: 4,
  display: "block",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--card)",
  padding: 0,
  overflow: "hidden",
};

/* ─── Helpers ─────────────────────────────────────────────── */

function computeAmortization(dateCompleted: string, amortizationYears: number, cost: number) {
  const now = new Date();
  const completed = new Date(dateCompleted);
  const msElapsed = now.getTime() - completed.getTime();
  const yearsElapsed = Math.max(0, msElapsed / (365.25 * 24 * 60 * 60 * 1000));
  const percentAmortized = Math.min(100, (yearsElapsed / amortizationYears) * 100);
  const tenantShare = percentAmortized;
  const ownerShare = 100 - percentAmortized;
  const remainingValue = cost * (1 - percentAmortized / 100);
  const yearsRemaining = Math.max(0, amortizationYears - yearsElapsed);
  return {
    yearsElapsed: Math.round(yearsElapsed * 10) / 10,
    percentAmortized: Math.round(percentAmortized * 10) / 10,
    tenantShare: Math.round(tenantShare * 10) / 10,
    ownerShare: Math.round(ownerShare * 10) / 10,
    remainingValue: Math.round(remainingValue),
    yearsRemaining: Math.round(yearsRemaining * 10) / 10,
  };
}

function getAccentColor(percentAmortized: number): string {
  const remaining = 100 - percentAmortized;
  if (remaining > 50) return "#22c55e";
  if (remaining > 25) return "#f59e0b";
  return "#ef4444";
}

function getBarColor(percentAmortized: number): string {
  if (percentAmortized < 50) return "#22c55e";
  if (percentAmortized < 75) return "#f59e0b";
  return "#ef4444";
}

/* ─── Component ───────────────────────────────────────────── */

export function RenovationTracker({ buildingId }: { buildingId: string }) {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();

  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterUnit, setFilterUnit] = useState<string>("__all__");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Available units from accounting settings
  const units = useMemo(() => {
    const settings = getAccountingSettings(buildingId);
    return settings.units ?? [];
  }, [buildingId]);

  const loadRenovations = () => {
    setRenovations(getRenovations(buildingId));
  };

  useEffect(() => {
    loadRenovations();
  }, [buildingId]);

  // Filtered renovations
  const filtered = useMemo(() => {
    if (filterUnit === "__all__") return renovations;
    if (filterUnit === "__building__") return renovations.filter((r) => !r.unit);
    return renovations.filter((r) => r.unit === filterUnit);
  }, [renovations, filterUnit]);

  // Summary stats
  const summary = useMemo(() => {
    const totalInvested = renovations.reduce((s, r) => s + r.cost, 0);

    let weightedAmortSum = 0;
    let weightSum = 0;
    let nearEndOfLife = 0;

    for (const r of renovations) {
      const a = computeAmortization(r.dateCompleted, r.amortizationYears, r.cost);
      weightedAmortSum += a.percentAmortized * r.cost;
      weightSum += r.cost;
      if (a.yearsRemaining < 2 && a.percentAmortized < 100) nearEndOfLife++;
    }

    const avgAmort = weightSum > 0 ? Math.round((weightedAmortSum / weightSum) * 10) / 10 : 0;

    return { totalInvested, avgAmort, nearEndOfLife, count: renovations.length };
  }, [renovations]);

  const handleDelete = (id: string) => {
    deleteRenovation(id);
    setConfirmDeleteId(null);
    loadRenovations();
  };

  const handleAdd = (reno: Omit<Renovation, "id" | "createdAt">) => {
    addRenovation(reno);
    setShowAddModal(false);
    loadRenovations();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Wrench size={20} style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
            Suivi des rénovations
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
            background: "var(--background)", borderRadius: 8, padding: "2px 8px",
            border: "1px solid var(--border)",
          }}>
            {summary.count}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Filter by unit */}
          <div style={{ position: "relative" }}>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              style={{
                ...inputStyle,
                width: "auto",
                minWidth: 140,
                paddingRight: 28,
                appearance: "none" as const,
                cursor: "pointer",
              }}
            >
              <option value="__all__">Tous les objets</option>
              <option value="__building__">Immeuble (commun)</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                color: "var(--muted-foreground)", pointerEvents: "none",
              }}
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10,
              background: "var(--primary)", color: "var(--primary-foreground)",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ ...cardStyle, padding: "14px 18px" }}>
          <div style={labelStyle}>Total investi</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>
            {formatAmount(summary.totalInvested)}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: "14px 18px" }}>
          <div style={labelStyle}>Amortissement moyen</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>
            {summary.avgAmort}%
          </div>
        </div>
        <div style={{ ...cardStyle, padding: "14px 18px" }}>
          <div style={labelStyle}>À renouveler bientôt</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: summary.nearEndOfLife > 0 ? "#f59e0b" : "var(--foreground)" }}>
              {summary.nearEndOfLife}
            </span>
            {summary.nearEndOfLife > 0 && <AlertTriangle size={16} style={{ color: "#f59e0b" }} />}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            éléments à moins de 2 ans
          </div>
        </div>
      </div>

      {/* ── Renovation cards ── */}
      {filtered.length === 0 && (
        <div style={{
          ...cardStyle, padding: "40px 20px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <Wrench size={32} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
            Aucune rénovation enregistrée
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              marginTop: 8, padding: "8px 16px", borderRadius: 10,
              background: "var(--primary)", color: "var(--primary-foreground)",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Ajouter une rénovation
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((reno) => {
          const a = computeAmortization(reno.dateCompleted, reno.amortizationYears, reno.cost);
          const accent = getAccentColor(a.percentAmortized);
          const barColor = getBarColor(a.percentAmortized);
          const isHovered = hoveredId === reno.id;

          return (
            <div
              key={reno.id}
              className="group"
              onMouseEnter={() => setHoveredId(reno.id)}
              onMouseLeave={() => { setHoveredId(null); if (confirmDeleteId === reno.id) setConfirmDeleteId(null); }}
              style={{
                ...cardStyle,
                display: "flex",
                transition: "box-shadow 0.15s",
                boxShadow: isHovered ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {/* Left accent bar */}
              <div style={{
                width: 5, minHeight: "100%",
                background: accent,
                borderRadius: "14px 0 0 14px",
                flexShrink: 0,
              }} />

              <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Top zone: item name + badges + cost */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)" }}>
                      {reno.item}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 6, background: "var(--background)",
                        color: "var(--muted-foreground)", border: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}>
                        {reno.category}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 6,
                        background: reno.unit ? "var(--background)" : "rgba(99,102,241,0.1)",
                        color: reno.unit ? "var(--muted-foreground)" : "#6366f1",
                        border: reno.unit ? "1px solid var(--border)" : "1px solid rgba(99,102,241,0.25)",
                        whiteSpace: "nowrap",
                      }}>
                        <Building2 size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {reno.unit || "Immeuble"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                        {formatAmount(reno.cost)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        Valeur restante: {formatAmount(a.remainingValue)}
                      </div>
                    </div>

                    {/* Delete button */}
                    <div style={{ width: 32, display: "flex", justifyContent: "center" }}>
                      {isHovered && confirmDeleteId !== reno.id && (
                        <button
                          onClick={() => setConfirmDeleteId(reno.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--muted-foreground)", padding: 4, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "color 0.15s",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      {confirmDeleteId === reno.id && (
                        <button
                          onClick={() => handleDelete(reno.id)}
                          style={{
                            background: "#ef4444", border: "none", cursor: "pointer",
                            color: "#fff", padding: "2px 8px", borderRadius: 6,
                            fontSize: 10, fontWeight: 700,
                          }}
                        >
                          OK
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amortization gauge */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontSize: 11, color: "var(--muted-foreground)",
                  }}>
                    <span>{Math.floor(a.yearsElapsed)} ans / {reno.amortizationYears} ans</span>
                    <span style={{ fontWeight: 650 }}>{a.percentAmortized.toFixed(1)}% amorti</span>
                  </div>
                  <div style={{
                    width: "100%", height: 8, borderRadius: 4,
                    background: "var(--background)", overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${Math.min(100, a.percentAmortized)}%`,
                      background: barColor,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>

                {/* Tenant / Owner shares */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{
                    padding: "8px 12px", borderRadius: 9,
                    background: "var(--background)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ ...labelStyle, marginBottom: 2, fontSize: 9 }}>Charge locataire</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
                      {(100 - a.tenantShare).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      (valeur restante)
                    </div>
                  </div>
                  <div style={{
                    padding: "8px 12px", borderRadius: 9,
                    background: "var(--background)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ ...labelStyle, marginBottom: 2, fontSize: 9 }}>Charge propriétaire</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>
                      {a.tenantShare.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      (part amortie)
                    </div>
                  </div>
                </div>

                {/* Date + notes */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--muted-foreground)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} />
                    {new Date(reno.dateCompleted).toLocaleDateString("fr-CH")}
                  </span>
                  {reno.notes && (
                    <span style={{ fontStyle: "italic", opacity: 0.8, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {reno.notes}
                    </span>
                  )}
                  {a.percentAmortized >= 100 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#22c55e", fontWeight: 600 }}>
                      <CheckCircle size={12} />
                      Totalement amorti
                    </span>
                  )}
                  {a.yearsRemaining > 0 && a.yearsRemaining < 2 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#f59e0b", fontWeight: 600 }}>
                      <AlertTriangle size={12} />
                      À renouveler bientôt
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddRenovationModal
          buildingId={buildingId}
          units={units}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          formatAmount={formatAmount}
        />
      )}
    </div>
  );
}

/* ─── Add Renovation Modal ────────────────────────────────── */

function AddRenovationModal({
  buildingId,
  units,
  onClose,
  onAdd,
  formatAmount,
}: {
  buildingId: string;
  units: string[];
  onClose: () => void;
  onAdd: (reno: Omit<Renovation, "id" | "createdAt">) => void;
  formatAmount: (n: number) => string;
}) {
  const [unit, setUnit] = useState("");
  const [categoryIdx, setCategoryIdx] = useState<number>(-1);
  const [itemIdx, setItemIdx] = useState<number>(-1);
  const [customYears, setCustomYears] = useState<string>("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const selectedCategory = categoryIdx >= 0 ? AMORTIZATION_TABLE[categoryIdx] : null;
  const selectedItem = selectedCategory && itemIdx >= 0 ? selectedCategory.items[itemIdx] : null;

  // Auto-fill years when item changes
  useEffect(() => {
    if (selectedItem) {
      setCustomYears(String(selectedItem.years));
    }
  }, [selectedItem]);

  const canSubmit =
    categoryIdx >= 0 &&
    itemIdx >= 0 &&
    customYears !== "" &&
    Number(customYears) > 0 &&
    dateCompleted !== "" &&
    cost !== "" &&
    Number(cost) > 0;

  const handleSubmit = () => {
    if (!canSubmit || !selectedCategory || !selectedItem) return;
    onAdd({
      buildingId,
      unit: unit || undefined,
      category: selectedCategory.category,
      item: selectedItem.name,
      amortizationYears: Number(customYears),
      dateCompleted,
      cost: Number(cost),
      notes: notes.trim() || undefined,
    });
  };

  const getFocusStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    borderColor: focusedField === field ? "var(--primary)" : undefined,
  });

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={18} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
              Ajouter une rénovation
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted-foreground)", padding: 4, borderRadius: 8,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Unit */}
          <div>
            <label style={labelStyle}>Objet / Appartement</label>
            <div style={{ position: "relative" }}>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                onFocus={() => setFocusedField("unit")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...getFocusStyle("unit"),
                  appearance: "none" as const,
                  cursor: "pointer",
                  paddingRight: 28,
                }}
              >
                <option value="">Immeuble (commun)</option>
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--muted-foreground)", pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Catégorie FRI/ASLOCA</label>
            <div style={{ position: "relative" }}>
              <select
                value={categoryIdx}
                onChange={(e) => { setCategoryIdx(Number(e.target.value)); setItemIdx(-1); }}
                onFocus={() => setFocusedField("category")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...getFocusStyle("category"),
                  appearance: "none" as const,
                  cursor: "pointer",
                  paddingRight: 28,
                }}
              >
                <option value={-1}>-- Sélectionner une catégorie --</option>
                {AMORTIZATION_TABLE.map((cat, i) => (
                  <option key={i} value={i}>{cat.category}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--muted-foreground)", pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Item */}
          <div>
            <label style={labelStyle}>Élément</label>
            <div style={{ position: "relative" }}>
              <select
                value={itemIdx}
                onChange={(e) => setItemIdx(Number(e.target.value))}
                onFocus={() => setFocusedField("item")}
                onBlur={() => setFocusedField(null)}
                disabled={!selectedCategory}
                style={{
                  ...getFocusStyle("item"),
                  appearance: "none" as const,
                  cursor: selectedCategory ? "pointer" : "not-allowed",
                  paddingRight: 28,
                  opacity: selectedCategory ? 1 : 0.5,
                }}
              >
                <option value={-1}>-- Sélectionner un élément --</option>
                {selectedCategory?.items.map((it, i) => (
                  <option key={i} value={i}>{it.name} ({it.years} ans)</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--muted-foreground)", pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Years + Date row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Durée d'amortissement (ans)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={customYears}
                onChange={(e) => setCustomYears(e.target.value)}
                onFocus={() => setFocusedField("years")}
                onBlur={() => setFocusedField(null)}
                placeholder="ex: 25"
                style={getFocusStyle("years")}
              />
              {selectedItem && Number(customYears) !== selectedItem.years && customYears !== "" && (
                <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                  <AlertTriangle size={10} />
                  Standard: {selectedItem.years} ans
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Date des travaux</label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                onFocus={() => setFocusedField("date")}
                onBlur={() => setFocusedField(null)}
                style={getFocusStyle("date")}
              />
            </div>
          </div>

          {/* Cost */}
          <div>
            <label style={labelStyle}>Coût</label>
            <div style={{ position: "relative" }}>
              <Banknote
                size={15}
                style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--muted-foreground)",
                }}
              />
              <input
                type="number"
                min={0}
                step={100}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                onFocus={() => setFocusedField("cost")}
                onBlur={() => setFocusedField(null)}
                placeholder="ex: 5000"
                style={{ ...getFocusStyle("cost"), paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => setFocusedField("notes")}
              onBlur={() => setFocusedField(null)}
              placeholder="Détails, entreprise, garantie..."
              rows={3}
              style={{
                ...getFocusStyle("notes"),
                resize: "vertical" as const,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Preview if all filled */}
          {canSubmit && dateCompleted && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "var(--background)", border: "1px solid var(--border)",
            }}>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Aperçu amortissement</div>
              {(() => {
                const a = computeAmortization(dateCompleted, Number(customYears), Number(cost));
                const barColor = getBarColor(a.percentAmortized);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                      <span>{Math.floor(a.yearsElapsed)} ans / {customYears} ans</span>
                      <span style={{ fontWeight: 650 }}>{a.percentAmortized.toFixed(1)}% amorti</span>
                    </div>
                    <div style={{
                      width: "100%", height: 6, borderRadius: 3,
                      background: "var(--border)", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${Math.min(100, a.percentAmortized)}%`,
                        background: barColor,
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                      <span>Charge locataire: <b style={{ color: "#22c55e" }}>{(100 - a.tenantShare).toFixed(1)}%</b></span>
                      <span>Charge propriétaire: <b style={{ color: "#6366f1" }}>{a.tenantShare.toFixed(1)}%</b></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 22px", borderTop: "1px solid var(--border)",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: "var(--background)", color: "var(--foreground)",
              border: "1px solid var(--border)", cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: canSubmit ? "var(--primary)" : "var(--border)",
              color: canSubmit ? "var(--primary-foreground)" : "var(--muted-foreground)",
              border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.6,
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
