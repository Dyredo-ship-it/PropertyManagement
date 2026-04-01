import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, DollarSign, Users, Building2, Calendar,
  CheckCircle, AlertCircle, X, Plus, Trash2, Mail, Download,
  ChevronDown, Filter, Search, Banknote, TrendingUp, TrendingDown,
  Edit, ArrowUpDown, Save, Pencil,
} from "lucide-react";
import {
  getBuildings, getTenants,
  getAccountingTransactions, addAccountingTransactions, saveAccountingTransactions,
  getManualAdjustments, addManualAdjustment, deleteManualAdjustment,
  getNotifications, saveNotifications,
  type AccountingTransaction, type ManualAdjustment, type Building, type Notification,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";

/* ─── Account chart ────────────────────────────────────────── */

const REVENUE_ACCOUNTS = [
  { num: 101, label: "Encaissements loyers" },
  { num: 102, label: "Encaissements loyers - Places de parc et garages" },
  { num: 103, label: "Acomptes de charges" },
  { num: 104, label: "Subventions reçues pour travaux d'isolation" },
  { num: 105, label: "Pertes de loyers" },
  { num: 106, label: "Recettes buanderie" },
];
const EXPENSE_ACCOUNTS = [
  { num: 201, label: "Assurances" },
  { num: 202, label: "Entretien appartements" },
  { num: 203, label: "Entretien bâtiment" },
  { num: 204, label: "Entretien des espaces verts" },
  { num: 205, label: "Entretien machines immeubles" },
  { num: 206, label: "Frais d'exploitation et d'entretien du chauffage" },
  { num: 207, label: "Frais postaux" },
  { num: 208, label: "Annonces locatives / Publicité" },
  { num: 209, label: "Frais de gestion locative" },
  { num: 210, label: "Frais de conciergerie" },
  { num: 211, label: "Débiteurs locataires ouverts" },
  { num: 212, label: "Frais divers" },
  { num: 213, label: "Électricité" },
  { num: 214, label: "Honoraires de gestion" },
  { num: 215, label: "Dédommagements locataires pour travaux" },
  { num: 216, label: "Frais de buanderie" },
  { num: 217, label: "Gaz" },
  { num: 218, label: "Eau" },
];
const INVESTMENT_ACCOUNTS = [
  { num: 301, label: "Améliorations et rénovations" },
  { num: 302, label: "Isolation (travaux d'enveloppe)" },
];
const OWNER_ACCOUNTS = [
  { num: 401, label: "Versement au propriétaire" },
];

const ALL_ACCOUNTS = [...REVENUE_ACCOUNTS, ...EXPENSE_ACCOUNTS, ...INVESTMENT_ACCOUNTS, ...OWNER_ACCOUNTS];

const IMPORT_FIELDS = [
  { key: "dateInvoice", label: "Date facture" },
  { key: "datePayment", label: "Date paiement" },
  { key: "unit", label: "Appartement / Objet" },
  { key: "description", label: "Description" },
  { key: "category", label: "Catégorie" },
  { key: "subCategory", label: "Sous-catégorie" },
  { key: "accountNumber", label: "N° Compte" },
  { key: "debit", label: "Débit (CHF)" },
  { key: "credit", label: "Crédit (CHF)" },
  { key: "status", label: "Statut" },
];

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const CHARGE_EXPENSE_ACCOUNTS = [201, 203, 204, 205, 206, 210, 211, 212, 213, 214, 216, 217, 218];

/* ─── Style constants ──────────────────────────────────────── */

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
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  marginBottom: 4,
  display: "block",
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left" as const,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted-foreground)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  borderBottom: "1px solid var(--border)",
  background: "var(--background)",
  position: "sticky" as const,
  top: 0,
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--foreground)",
  borderBottom: "1px solid var(--border)",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--card)",
  overflow: "hidden",
};

const tabBtnBase: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  transition: "all 0.15s",
  display: "flex",
  alignItems: "center",
  gap: 7,
};

/* ─── Helpers ──────────────────────────────────────────────── */

function extractTenantName(description: string): string {
  // Parse "Loyer de Janvier 2026 - Thiébaud PIERRETTE" → "Thiébaud PIERRETTE"
  const dashIdx = description.lastIndexOf(" - ");
  if (dashIdx > 0) return description.substring(dashIdx + 3).trim();
  return "";
}

function extractMonth(description: string): string {
  // Parse "Loyer de janvier 2026" → "2026-01"
  const lower = description.toLowerCase();
  const monthsFR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  for (let i = 0; i < monthsFR.length; i++) {
    if (lower.includes(monthsFR[i])) {
      const yearMatch = lower.match(/(\d{4})/);
      if (yearMatch) {
        return `${yearMatch[1]}-${String(i + 1).padStart(2, "0")}`;
      }
    }
  }
  return "";
}

/* ─── Main Component ───────────────────────────────────────── */

export function AccountingView() {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<"transactions" | "rent" | "income" | "charges">("transactions");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [adjustments, setAdjustments] = useState<ManualAdjustment[]>([]);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<any[][]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<"upload" | "map" | "preview">("upload");
  const [importBuildingId, setImportBuildingId] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Adjustment modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjAccountNum, setAdjAccountNum] = useState<number>(101);
  const [adjLabel, setAdjLabel] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjType, setAdjType] = useState<"debit" | "credit">("debit");

  // Year filter
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  // Sort
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Add transaction modal
  const [showAddTx, setShowAddTx] = useState(false);
  const [newTx, setNewTx] = useState({
    dateInvoice: new Date().toISOString().split("T")[0],
    datePayment: "",
    unit: "",
    description: "",
    category: "",
    subCategory: "",
    accountNumber: 101,
    debit: 0,
    credit: 0,
    status: "",
    buildingId: "",
  });

  // Editing transaction inline
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Format CHF fallback
  const fmtCHF = useCallback(
    (n: number) => {
      try {
        return formatAmount(n);
      } catch {
        return `CHF ${new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 2 }).format(n)}`;
      }
    },
    [formatAmount],
  );

  // Load data
  useEffect(() => {
    reload();
  }, []);

  const reload = useCallback(() => {
    const b = getBuildings();
    setBuildings(b);
    setTenants(getTenants());
    setTransactions(getAccountingTransactions());
    setAdjustments(getManualAdjustments());
    if (!selectedBuildingId && b.length > 0) {
      setSelectedBuildingId(b[0].id);
    }
  }, [selectedBuildingId]);

  // Filter transactions by building + search + year
  const filteredTx = useMemo(() => {
    let result = selectedBuildingId
      ? transactions.filter((tx) => tx.buildingId === selectedBuildingId)
      : transactions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(q) ||
          tx.category?.toLowerCase().includes(q) ||
          tx.unit?.toLowerCase().includes(q) ||
          String(tx.accountNumber).includes(q),
      );
    }
    if (selectedYear) {
      result = result.filter((tx) => tx.dateInvoice?.startsWith(selectedYear));
    }
    result.sort((a, b) => {
      const da = a.dateInvoice || "";
      const db = b.dateInvoice || "";
      return sortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return result;
  }, [transactions, selectedBuildingId, searchQuery, selectedYear, sortDir]);

  // Filtered adjustments by building
  const filteredAdj = useMemo(
    () =>
      selectedBuildingId
        ? adjustments.filter((a) => a.buildingId === selectedBuildingId)
        : adjustments,
    [adjustments, selectedBuildingId],
  );

  // ─── Building tenants ───
  const buildingTenants = useMemo(
    () => tenants.filter((t) => t.buildingId === selectedBuildingId),
    [tenants, selectedBuildingId],
  );

  // ─── Available years from transactions ───
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.dateInvoice) years.add(tx.dateInvoice.substring(0, 4));
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort().reverse();
  }, [transactions]);

  /* ─── Import handlers ─────────────────────────────────────── */

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length > 1) {
          setImportHeaders(json[0].map(String));
          setImportData(json.slice(1));
          setImportStep("map");
          // Auto-map columns by header matching
          const autoMap: Record<string, string> = {};
          json[0].forEach((h: any, idx: number) => {
            const headerLower = String(h).toLowerCase();
            IMPORT_FIELDS.forEach((f) => {
              if (headerLower.includes(f.label.toLowerCase().split(" ")[0])) {
                if (!Object.values(autoMap).includes(String(idx))) {
                  autoMap[f.key] = String(idx);
                }
              }
            });
          });
          setColumnMap(autoMap);
        }
      } catch (err) {
        console.error("Import parse error:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead],
  );

  const handleImportConfirm = useCallback(() => {
    if (!importBuildingId) return;
    const newTxs: Omit<AccountingTransaction, "id">[] = importData.map((row) => {
      const getValue = (key: string) => {
        const colIdx = columnMap[key];
        if (colIdx === undefined || colIdx === "") return "";
        return row[Number(colIdx)] ?? "";
      };
      const description = String(getValue("description"));
      const tenantName = extractTenantName(description);
      const month = extractMonth(description);
      return {
        buildingId: importBuildingId,
        dateInvoice: String(getValue("dateInvoice")),
        datePayment: String(getValue("datePayment")) || undefined,
        unit: String(getValue("unit")) || undefined,
        description,
        category: String(getValue("category")),
        subCategory: String(getValue("subCategory")) || undefined,
        accountNumber: Number(getValue("accountNumber")) || 0,
        debit: Number(String(getValue("debit")).replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0,
        credit: Number(String(getValue("credit")).replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0,
        status: String(getValue("status")) || undefined,
        tenantName: tenantName || undefined,
        month: month || undefined,
      };
    });
    addAccountingTransactions(newTxs);
    // Check rent payments after import
    checkRentPayments(importBuildingId, newTxs as AccountingTransaction[]);
    setShowImport(false);
    setImportStep("upload");
    setImportData([]);
    setImportHeaders([]);
    setColumnMap({});
    setImportBuildingId("");
    reload();
  }, [importData, columnMap, importBuildingId, reload]);

  /* ─── Rent payment check ──────────────────────────────────── */

  const checkRentPayments = useCallback(
    (buildingId: string, newTxs: AccountingTransaction[]) => {
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      if (today.getDate() < 5) return;

      const bTenants = tenants.filter((t) => t.buildingId === buildingId);
      const allTx = [...transactions, ...newTxs];
      const monthTx = allTx.filter(
        (tx) => tx.month === currentMonth && tx.accountNumber === 101 && tx.buildingId === buildingId,
      );

      const notifications = getNotifications();
      let changed = false;

      bTenants.forEach((tenant) => {
        const lastName = tenant.name.toLowerCase().split(" ").pop() || "";
        const hasPaid = monthTx.some((tx) =>
          tx.description?.toLowerCase().includes(lastName),
        );
        if (!hasPaid) {
          const alreadyNotified = notifications.some(
            (n) =>
              n.recipientId === tenant.id &&
              n.category === "payment" &&
              n.date?.startsWith(currentMonth),
          );
          if (!alreadyNotified) {
            notifications.push({
              id: `notif-rent-${Date.now()}-${tenant.id}`,
              title: `Loyer impayé - ${tenant.name}`,
              message: `Le loyer de ${MONTHS_FR[today.getMonth()]} ${today.getFullYear()} n'a pas encore été reçu pour ${tenant.name} (unité ${tenant.unit}).`,
              date: new Date().toISOString(),
              read: false,
              buildingId,
              recipientId: tenant.id,
              category: "payment",
            });
            changed = true;
          }
        }
      });
      if (changed) saveNotifications(notifications);
    },
    [tenants, transactions],
  );

  /* ─── Manual adjustment handlers ──────────────────────────── */

  const handleAddAdjustment = useCallback(() => {
    if (!selectedBuildingId || !adjLabel.trim() || !adjAmount) return;
    addManualAdjustment({
      buildingId: selectedBuildingId,
      accountNumber: adjAccountNum,
      label: adjLabel.trim(),
      amount: Math.abs(Number(adjAmount)),
      type: adjType,
    });
    setShowAdjModal(false);
    setAdjLabel("");
    setAdjAmount("");
    reload();
  }, [selectedBuildingId, adjAccountNum, adjLabel, adjAmount, adjType, reload]);

  const handleDeleteAdjustment = useCallback(
    (id: string) => {
      deleteManualAdjustment(id);
      reload();
    },
    [reload],
  );

  /* ─── Computed totals for accounts ────────────────────────── */

  const accountTotals = useMemo(() => {
    const totals: Record<number, { debit: number; credit: number }> = {};
    ALL_ACCOUNTS.forEach((a) => {
      totals[a.num] = { debit: 0, credit: 0 };
    });
    filteredTx.forEach((tx) => {
      if (totals[tx.accountNumber]) {
        totals[tx.accountNumber].debit += tx.debit || 0;
        totals[tx.accountNumber].credit += tx.credit || 0;
      }
    });
    // Add manual adjustments
    filteredAdj.forEach((adj) => {
      if (totals[adj.accountNumber]) {
        if (adj.type === "debit") totals[adj.accountNumber].debit += adj.amount;
        else totals[adj.accountNumber].credit += adj.amount;
      }
    });
    return totals;
  }, [filteredTx, filteredAdj]);

  /* ─── Export CSV ──────────────────────────────────────────── */

  const handleExportCSV = useCallback(() => {
    if (filteredTx.length === 0) return;
    const headers = ["Date facture", "Date paiement", "Objet", "Description", "Catégorie", "N° Compte", "Débit", "Crédit", "Statut"];
    const rows = filteredTx.map((tx) => [
      tx.dateInvoice,
      tx.datePayment || "",
      tx.unit || "",
      tx.description,
      tx.category,
      tx.accountNumber,
      tx.debit || "",
      tx.credit || "",
      tx.status || "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite_${selectedBuildingId}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTx, selectedBuildingId, selectedYear]);

  /* ─── Add transaction manually ───────────────────────────── */

  const handleAddTransaction = () => {
    if (!newTx.description.trim() || !newTx.buildingId) return;
    const tenantName = extractTenantName(newTx.description);
    const month = extractMonth(newTx.description);
    addAccountingTransactions([{
      buildingId: newTx.buildingId,
      dateInvoice: newTx.dateInvoice,
      datePayment: newTx.datePayment || undefined,
      unit: newTx.unit || undefined,
      description: newTx.description.trim(),
      category: newTx.category || (ALL_ACCOUNTS.find(a => a.num === newTx.accountNumber)?.label || ""),
      subCategory: newTx.subCategory || undefined,
      accountNumber: newTx.accountNumber,
      debit: newTx.debit || 0,
      credit: newTx.credit || 0,
      status: newTx.status || undefined,
      tenantName: tenantName || undefined,
      month: month || undefined,
    }]);
    reload();
    setShowAddTx(false);
    setNewTx({
      dateInvoice: new Date().toISOString().split("T")[0],
      datePayment: "", unit: "", description: "", category: "",
      subCategory: "", accountNumber: 101, debit: 0, credit: 0,
      status: "", buildingId: selectedBuildingId,
    });
  };

  /* ─── Edit transaction inline ────────────────────────────── */

  const handleUpdateTx = (txId: string, field: string, value: any) => {
    const all = getAccountingTransactions();
    const updated = all.map((tx) => {
      if (tx.id !== txId) return tx;
      const newTx = { ...tx, [field]: value };
      // Re-extract metadata if description changed
      if (field === "description") {
        newTx.tenantName = extractTenantName(value) || tx.tenantName;
        newTx.month = extractMonth(value) || tx.month;
      }
      return newTx;
    });
    saveAccountingTransactions(updated);
    setTransactions(updated);
    setEditingTxId(null);
  };

  const handleDeleteTx = (txId: string) => {
    const all = getAccountingTransactions();
    saveAccountingTransactions(all.filter((tx) => tx.id !== txId));
    reload();
  };

  /* ─── Rent grid data ─────────────────────────────────────── */

  const rentGrid = useMemo(() => {
    const year = Number(selectedYear);
    return buildingTenants.map((tenant) => {
      const months: Record<string, "paid" | "unpaid" | "late"> = {};
      for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${String(m).padStart(2, "0")}`;
        const rentTxs = filteredTx.filter(
          (tx) =>
            tx.accountNumber === 101 &&
            tx.month === monthKey &&
            tx.description?.toLowerCase().includes(
              (tenant.name.toLowerCase().split(" ").pop() || ""),
            ),
        );
        if (rentTxs.length > 0) {
          // Check if late (payment date after 5th)
          const isLate = rentTxs.some((tx) => {
            if (tx.datePayment) {
              const day = Number(tx.datePayment.split("-")[2]);
              return day > 5;
            }
            return false;
          });
          months[monthKey] = isLate ? "late" : "paid";
        } else {
          // Only mark unpaid if the month is in the past or current
          const today = new Date();
          const monthDate = new Date(year, m - 1, 1);
          if (monthDate <= today) {
            months[monthKey] = "unpaid";
          } else {
            months[monthKey] = "unpaid"; // future: still show as unpaid/pending
          }
        }
      }
      return { tenant, months };
    });
  }, [buildingTenants, filteredTx, selectedYear]);

  // Rent summary for current month
  const rentSummary = useMemo(() => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    let paid = 0;
    let unpaid = 0;
    rentGrid.forEach((row) => {
      if (row.months[currentMonth] === "paid" || row.months[currentMonth] === "late") paid++;
      else unpaid++;
    });
    return { paid, unpaid };
  }, [rentGrid]);

  /* ─── Send reminder ──────────────────────────────────────── */

  const handleSendReminder = useCallback(
    (tenant: any, monthKey: string) => {
      const [y, m] = monthKey.split("-");
      const monthName = MONTHS_FR[Number(m) - 1];

      // Create notification
      const notifications = getNotifications();
      notifications.push({
        id: `notif-reminder-${Date.now()}`,
        title: `Rappel loyer - ${tenant.name}`,
        message: `Rappel envoyé pour le loyer de ${monthName} ${y}. Unité ${tenant.unit}.`,
        date: new Date().toISOString(),
        read: false,
        buildingId: selectedBuildingId,
        recipientId: tenant.id,
        category: "payment",
      });
      saveNotifications(notifications);

      // Open mailto
      const subject = encodeURIComponent(`Rappel de paiement - Loyer ${monthName} ${y}`);
      const body = encodeURIComponent(
        `Bonjour ${tenant.name},\n\nNous n'avons pas encore reçu votre loyer pour le mois de ${monthName} ${y}.\n\nMerci de procéder au paiement dans les meilleurs délais.\n\nCordialement,\nLa gérance`,
      );
      window.open(`mailto:${tenant.email}?subject=${subject}&body=${body}`, "_blank");
    },
    [selectedBuildingId],
  );

  /* ─── Income statement computed values ───────────────────── */

  const incomeStatement = useMemo(() => {
    const revenueTotal = REVENUE_ACCOUNTS.reduce((sum, a) => sum + (accountTotals[a.num]?.credit || 0), 0);
    const expenseTotal = EXPENSE_ACCOUNTS.reduce((sum, a) => sum + (accountTotals[a.num]?.debit || 0), 0);
    const investTotal = INVESTMENT_ACCOUNTS.reduce((sum, a) => sum + (accountTotals[a.num]?.debit || 0), 0);
    const totalExpenses = expenseTotal + investTotal;
    const solde = revenueTotal - totalExpenses;
    const ownerPayment = OWNER_ACCOUNTS.reduce((sum, a) => sum + (accountTotals[a.num]?.debit || 0), 0);
    const soldeApres = solde - ownerPayment;

    // Verification
    const totalDebit = filteredTx.reduce((s, tx) => s + (tx.debit || 0), 0) +
      filteredAdj.filter((a) => a.type === "debit").reduce((s, a) => s + a.amount, 0);
    const totalCredit = filteredTx.reduce((s, tx) => s + (tx.credit || 0), 0) +
      filteredAdj.filter((a) => a.type === "credit").reduce((s, a) => s + a.amount, 0);

    return { revenueTotal, expenseTotal, investTotal, totalExpenses, solde, ownerPayment, soldeApres, totalDebit, totalCredit };
  }, [accountTotals, filteredTx, filteredAdj]);

  /* ─── Charges statement ──────────────────────────────────── */

  const chargesStatement = useMemo(() => {
    const acomptesTotal = accountTotals[103]?.credit || 0;
    const chargeExpenses = CHARGE_EXPENSE_ACCOUNTS.reduce(
      (sum, num) => sum + (accountTotals[num]?.debit || 0),
      0,
    );
    const solde = acomptesTotal - chargeExpenses;

    // Per-apartment breakdown
    const totalM2 = buildingTenants.reduce((s, t) => s + (Number(t.unit?.match(/\d+/)?.[0]) || 50), 0) || 1;
    const breakdown = buildingTenants.map((tenant) => {
      const m2 = Number(tenant.unit?.match(/\d+/)?.[0]) || 50;
      const pct = m2 / totalM2;
      const acomptesPaid = filteredTx
        .filter(
          (tx) =>
            tx.accountNumber === 103 &&
            tx.description?.toLowerCase().includes(
              (tenant.name.toLowerCase().split(" ").pop() || ""),
            ),
        )
        .reduce((s, tx) => s + (tx.credit || 0), 0);
      const amountDue = chargeExpenses * pct;
      const difference = acomptesPaid - amountDue;
      return { tenant, m2, pct, acomptesPaid, amountDue, difference };
    });

    return { acomptesTotal, chargeExpenses, solde, breakdown };
  }, [accountTotals, buildingTenants, filteredTx]);

  /* ─── Input focus handler ────────────────────────────────── */

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "var(--primary)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "var(--border)";
  };

  /* ─── Render helpers ─────────────────────────────────────── */

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  const renderAccountLine = (
    account: { num: number; label: string },
    showDebit: boolean,
    showCredit: boolean,
  ) => {
    const totals = accountTotals[account.num] || { debit: 0, credit: 0 };
    const acctAdj = filteredAdj.filter((a) => a.accountNumber === account.num);
    const value = showCredit ? totals.credit : totals.debit;
    if (value === 0 && acctAdj.length === 0) {
      return (
        <tr key={account.num}>
          <td style={{ ...tdStyle, width: 70, color: "var(--muted-foreground)", fontSize: 12 }}>{account.num}</td>
          <td style={tdStyle}>{account.label}</td>
          <td style={{ ...tdStyle, textAlign: "right", color: "var(--muted-foreground)" }}>-</td>
        </tr>
      );
    }
    return (
      <React.Fragment key={account.num}>
        <tr>
          <td style={{ ...tdStyle, width: 70, color: "var(--muted-foreground)", fontSize: 12 }}>{account.num}</td>
          <td style={tdStyle}>{account.label}</td>
          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {fmtCHF(value)}
          </td>
        </tr>
        {acctAdj.map((adj) => (
          <tr key={adj.id} style={{ background: "var(--background)" }}>
            <td style={{ ...tdStyle, width: 70 }}></td>
            <td style={{ ...tdStyle, fontSize: 12, fontStyle: "italic", color: "var(--muted-foreground)" }}>
              {adj.label}
              <button
                onClick={() => handleDeleteAdjustment(adj.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  marginLeft: 8,
                  padding: 2,
                }}
              >
                <Trash2 size={12} />
              </button>
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontSize: 12,
                fontStyle: "italic",
                color: adj.type === "credit" ? "#16a34a" : "#ef4444",
              }}
            >
              {adj.type === "credit" ? "+" : "-"}{fmtCHF(adj.amount)}
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  };

  /* ─── TAB: Transactions ──────────────────────────────────── */

  const renderTransactions = () => {
    const totalDebit = filteredTx.reduce((s, tx) => s + (tx.debit || 0), 0);
    const totalCredit = filteredTx.reduce((s, tx) => s + (tx.credit || 0), 0);
    const isEditing = (id: string) => editingTxId === id;

    return (
      <div>
        {/* Toolbar: Search + Sort + Year + Add + Export */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 340 }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              style={{ ...inputStyle, paddingLeft: 32 }}
              placeholder={t("searchPlaceholder") || "Rechercher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <button
            onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            title={sortDir === "desc" ? "Plus anciennes d'abord" : "Plus récentes d'abord"}
            style={{
              ...tabBtnBase, background: "var(--background)", color: "var(--foreground)",
              border: "1px solid var(--border)", fontSize: 12, padding: "8px 12px",
            }}
          >
            <ArrowUpDown size={14} />
            {sortDir === "desc" ? "Récent" : "Ancien"}
          </button>
          <select
            style={{ ...inputStyle, width: "auto", minWidth: 100 }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            onFocus={handleFocus as any}
            onBlur={handleBlur as any}
          >
            {availableYears.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setNewTx((p) => ({ ...p, buildingId: selectedBuildingId })); setShowAddTx(true); }}
            style={{
              ...tabBtnBase, background: "var(--primary)", color: "var(--primary-foreground)",
              fontSize: 12, padding: "8px 16px",
            }}
          >
            <Plus size={14} />
            {t("addAdjustment") || "Ajouter"}
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              ...tabBtnBase, background: "var(--background)", color: "var(--foreground)",
              border: "1px solid var(--border)", fontSize: 12, padding: "8px 12px",
            }}
          >
            <Download size={14} />
            CSV
          </button>
        </div>

        {filteredTx.length === 0 ? (
          <div style={{ ...cardStyle, padding: "64px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "var(--muted-foreground)" }}>
            <Upload size={48} strokeWidth={1.2} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>{t("noTransactions")}</div>
            <div style={{ fontSize: 13 }}>Importez ou ajoutez manuellement vos transactions.</div>
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: "auto", maxHeight: "calc(100vh - 360px)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("transactionDate")}</th>
                  <th style={thStyle}>{t("unitObject")}</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>{t("descriptionCol")}</th>
                  <th style={thStyle}>{t("categoryCol")}</th>
                  <th style={thStyle}>{t("accountNumberCol")}</th>
                  <th style={thStyle}>Immeuble</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{t("debitCol")}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{t("creditCol")}</th>
                  <th style={thStyle}>{t("statusCol")}</th>
                  <th style={{ ...thStyle, width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((tx, i) => {
                  const editing = isEditing(tx.id);
                  const bName = buildings.find((b) => b.id === tx.buildingId)?.name || "-";
                  return (
                    <tr
                      key={tx.id || i}
                      className="group"
                      style={{ transition: "background 0.1s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--background)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: 12 }}>{tx.dateInvoice}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "var(--muted-foreground)" }}>{tx.unit || "-"}</td>
                      <td style={{ ...tdStyle, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{tx.category}</td>
                      {/* Editable: Account Number */}
                      <td style={tdStyle}>
                        {editing ? (
                          <select
                            defaultValue={tx.accountNumber}
                            onChange={(e) => handleUpdateTx(tx.id, "accountNumber", Number(e.target.value))}
                            style={{ ...inputStyle, width: 80, padding: "4px 6px", fontSize: 11 }}
                            autoFocus
                          >
                            {ALL_ACCOUNTS.map((a) => (<option key={a.num} value={a.num}>{a.num}</option>))}
                          </select>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{tx.accountNumber}</span>
                        )}
                      </td>
                      {/* Editable: Building */}
                      <td style={tdStyle}>
                        {editing ? (
                          <select
                            defaultValue={tx.buildingId}
                            onChange={(e) => handleUpdateTx(tx.id, "buildingId", e.target.value)}
                            style={{ ...inputStyle, width: 120, padding: "4px 6px", fontSize: 11 }}
                          >
                            {buildings.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{bName}</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: tx.debit > 0 ? "#ef4444" : "var(--muted-foreground)", fontWeight: tx.debit > 0 ? 600 : 400 }}>
                        {tx.debit > 0 ? fmtCHF(tx.debit) : "-"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: tx.credit > 0 ? "#16a34a" : "var(--muted-foreground)", fontWeight: tx.credit > 0 ? 600 : 400 }}>
                        {tx.credit > 0 ? fmtCHF(tx.credit) : "-"}
                      </td>
                      <td style={tdStyle}>
                        {tx.status ? (
                          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 600, background: tx.status === "Payé" ? "#dcfce7" : "#fef3c7", color: tx.status === "Payé" ? "#166534" : "#92400e" }}>
                            {tx.status}
                          </span>
                        ) : <span style={{ color: "var(--muted-foreground)" }}>-</span>}
                      </td>
                      {/* Actions: edit / delete */}
                      <td style={{ ...tdStyle, display: "flex", gap: 4, alignItems: "center" }}>
                        <button
                          onClick={() => setEditingTxId(editing ? null : tx.id)}
                          title={editing ? "Fermer" : "Modifier"}
                          style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: editing ? "var(--primary)" : "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                          onMouseLeave={(e) => { if (!editing) (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          title="Supprimer"
                          className="opacity-0 group-hover:opacity-100"
                          style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--background)" }}>
                  <td colSpan={6} style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                    Totaux ({filteredTx.length} transactions)
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#ef4444", borderTop: "2px solid var(--border)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtCHF(totalDebit)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#16a34a", borderTop: "2px solid var(--border)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtCHF(totalCredit)}
                  </td>
                  <td colSpan={2} style={{ ...tdStyle, borderTop: "2px solid var(--border)" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Add Transaction Modal ── */}
        {showAddTx && createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", padding: 16 }}
            onClick={() => setShowAddTx(false)}
          >
            <div
              style={{ width: "100%", maxWidth: 540, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", background: "var(--card)", boxShadow: "0 16px 48px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "rgba(69,85,58,0.07)", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "3px solid var(--primary)" }}>
                  <Plus style={{ width: 16, height: 16, color: "var(--primary)" }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", flex: 1 }}>Nouvelle transaction</span>
                <button onClick={() => setShowAddTx(false)} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              </div>
              {/* Body */}
              <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "65vh", overflowY: "auto" }}>
                {/* Building */}
                <div>
                  <label style={labelStyle}>Immeuble *</label>
                  <select value={newTx.buildingId} onChange={(e) => setNewTx({ ...newTx, buildingId: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }} onFocus={handleFocus as any} onBlur={handleBlur as any}>
                    <option value="">— Sélectionner —</option>
                    {buildings.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
                {/* Date + Payment date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t("transactionDate")} *</label>
                    <input type="date" value={newTx.dateInvoice} onChange={(e) => setNewTx({ ...newTx, dateInvoice: e.target.value })} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("paymentDate")}</label>
                    <input type="date" value={newTx.datePayment} onChange={(e) => setNewTx({ ...newTx, datePayment: e.target.value })} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </div>
                {/* Unit + Account */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t("unitObject")}</label>
                    <input type="text" value={newTx.unit} onChange={(e) => setNewTx({ ...newTx, unit: e.target.value })} placeholder="Ex: 2ème / 4.5p" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("accountNumberCol")} *</label>
                    <select value={newTx.accountNumber} onChange={(e) => setNewTx({ ...newTx, accountNumber: Number(e.target.value) })} style={{ ...inputStyle, cursor: "pointer" }} onFocus={handleFocus as any} onBlur={handleBlur as any}>
                      {ALL_ACCOUNTS.map((a) => (<option key={a.num} value={a.num}>{a.num} — {a.label}</option>))}
                    </select>
                  </div>
                </div>
                {/* Description */}
                <div>
                  <label style={labelStyle}>{t("descriptionCol")} *</label>
                  <input type="text" value={newTx.description} onChange={(e) => setNewTx({ ...newTx, description: e.target.value })} placeholder="Ex: Loyer de Mars 2026 - Dupont Jean" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                {/* Category + Sub-category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t("categoryCol")}</label>
                    <input type="text" value={newTx.category} onChange={(e) => setNewTx({ ...newTx, category: e.target.value })} placeholder="Auto si vide" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("subCategoryCol")}</label>
                    <input type="text" value={newTx.subCategory} onChange={(e) => setNewTx({ ...newTx, subCategory: e.target.value })} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </div>
                {/* Debit + Credit + Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t("debitCol")}</label>
                    <input type="number" step="0.01" value={newTx.debit || ""} onChange={(e) => setNewTx({ ...newTx, debit: parseFloat(e.target.value) || 0 })} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("creditCol")}</label>
                    <input type="number" step="0.01" value={newTx.credit || ""} onChange={(e) => setNewTx({ ...newTx, credit: parseFloat(e.target.value) || 0 })} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("statusCol")}</label>
                    <select value={newTx.status} onChange={(e) => setNewTx({ ...newTx, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }} onFocus={handleFocus as any} onBlur={handleBlur as any}>
                      <option value="">—</option>
                      <option value="Payé">{t("paid")}</option>
                      <option value="En attente">{t("unpaid")}</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!newTx.description.trim()) { alert("Description requise"); return; }
                    if (!newTx.buildingId) { alert("Sélectionnez un immeuble"); return; }
                    handleAddTransaction();
                  }}
                  style={{ padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: "var(--primary)", color: "var(--primary-foreground)", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAddTx(false)}
                  style={{ padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 550, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  /* ─── TAB: Rent Tracking ─────────────────────────────────── */

  const renderRentTracking = () => {
    if (!selectedBuildingId) {
      return (
        <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Building2 size={40} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sélectionnez un immeuble</div>
        </div>
      );
    }

    if (buildingTenants.length === 0) {
      return (
        <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Users size={40} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucun locataire dans cet immeuble</div>
        </div>
      );
    }

    return (
      <div>
        {/* Summary bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div
            style={{
              ...cardStyle,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: "1 1 180px",
            }}
          >
            <CheckCircle size={20} color="#16a34a" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{rentSummary.paid}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Payé ce mois</div>
            </div>
          </div>
          <div
            style={{
              ...cardStyle,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: "1 1 180px",
            }}
          >
            <AlertCircle size={20} color="#ef4444" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{rentSummary.unpaid}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Impayé ce mois</div>
            </div>
          </div>
        </div>

        {/* Year selector */}
        <div style={{ marginBottom: 14 }}>
          <select
            style={{ ...inputStyle, width: "auto", minWidth: 110 }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            onFocus={handleFocus as any}
            onBlur={handleBlur as any}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div style={{ ...cardStyle, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 160 }}>Locataire</th>
                <th style={{ ...thStyle, minWidth: 60 }}>Unité</th>
                {MONTHS_FR.map((m, i) => (
                  <th key={i} style={{ ...thStyle, textAlign: "center", minWidth: 44, fontSize: 10 }}>
                    {m.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentGrid.map(({ tenant, months }) => (
                <tr key={tenant.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, fontSize: 12 }}>{tenant.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--muted-foreground)" }}>{tenant.unit}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                    const status = months[monthKey];
                    return (
                      <td key={i} style={{ ...tdStyle, textAlign: "center", padding: "6px 4px" }}>
                        {status === "paid" ? (
                          <CheckCircle size={16} color="#16a34a" />
                        ) : status === "late" ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Calendar size={14} color="#f59e0b" />
                            <span style={{ fontSize: 9, color: "#f59e0b" }}>Tard</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <X size={16} color="#ef4444" />
                            <button
                              onClick={() => handleSendReminder(tenant, monthKey)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                color: "#2563eb",
                                fontSize: 9,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                              title="Envoyer un rappel"
                            >
                              <Mail size={10} />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─── TAB: Income Statement ──────────────────────────────── */

  const renderIncomeStatement = () => {
    if (!selectedBuildingId) {
      return (
        <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Building2 size={40} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sélectionnez un immeuble</div>
        </div>
      );
    }

    return (
      <div>
        {/* Add adjustment button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button
            onClick={() => setShowAdjModal(true)}
            style={{
              ...tabBtnBase,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: 12,
            }}
          >
            <Plus size={14} />
            Ajustement manuel
          </button>
        </div>

        <div style={{ ...cardStyle, padding: "24px 0" }}>
          {/* Title */}
          <div style={{ padding: "0 24px 18px", borderBottom: "2px solid var(--border)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
              Compte de gérance {selectedYear}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              {selectedBuilding?.name} - {selectedBuilding?.address}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* RECETTES */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#16a34a",
                    paddingTop: 20,
                    paddingLeft: 24,
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={16} />
                    RECETTES
                  </div>
                </td>
              </tr>
              {REVENUE_ACCOUNTS.map((a) => renderAccountLine(a, false, true))}
              <tr style={{ background: "var(--background)" }}>
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total recettes</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#16a34a",
                    fontSize: 14,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(incomeStatement.revenueTotal)}
                </td>
              </tr>

              {/* DEPENSES GESTION COURANTE */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#ef4444",
                    paddingTop: 20,
                    paddingLeft: 24,
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingDown size={16} />
                    DÉPENSES - GESTION COURANTE
                  </div>
                </td>
              </tr>
              {EXPENSE_ACCOUNTS.map((a) => renderAccountLine(a, true, false))}
              <tr style={{ background: "var(--background)" }}>
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total dépenses courantes</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(incomeStatement.expenseTotal)}
                </td>
              </tr>

              {/* TRAVAUX & INVESTISSEMENTS */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#b45309",
                    paddingTop: 20,
                    paddingLeft: 24,
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingDown size={16} />
                    DÉPENSES - TRAVAUX & INVESTISSEMENTS
                  </div>
                </td>
              </tr>
              {INVESTMENT_ACCOUNTS.map((a) => renderAccountLine(a, true, false))}
              <tr style={{ background: "var(--background)" }}>
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total travaux & investissements</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#b45309",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(incomeStatement.investTotal)}
                </td>
              </tr>

              {/* SOLDE */}
              <tr>
                <td colSpan={3} style={{ padding: 0, height: 8 }}></td>
              </tr>
              <tr style={{ background: "var(--background)" }}>
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700, fontSize: 14 }}>Total dépenses</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(incomeStatement.totalExpenses)}
                </td>
              </tr>
              <tr
                style={{
                  background: incomeStatement.solde >= 0 ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700, fontSize: 15 }}>
                  SOLDE (Recettes - Dépenses)
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 15,
                    color: incomeStatement.solde >= 0 ? "#16a34a" : "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(incomeStatement.solde)}
                </td>
              </tr>

              {/* VERSEMENT PROPRIETAIRE */}
              <tr>
                <td colSpan={3} style={{ padding: 0, height: 8 }}></td>
              </tr>
              {OWNER_ACCOUNTS.map((a) => renderAccountLine(a, true, false))}
              <tr
                style={{
                  background: incomeStatement.soldeApres >= 0 ? "#f0fdf4" : "#fef2f2",
                  borderTop: "2px solid var(--border)",
                }}
              >
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700, fontSize: 15 }}>
                  SOLDE APRÈS VERSEMENTS
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 15,
                    color: incomeStatement.soldeApres >= 0 ? "#16a34a" : "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(incomeStatement.soldeApres)}
                </td>
              </tr>

              {/* VERIFICATION */}
              <tr>
                <td colSpan={3} style={{ padding: 0, height: 12 }}></td>
              </tr>
              <tr style={{ background: "var(--background)" }}>
                <td colSpan={3} style={{ ...tdStyle, paddingLeft: 24 }}>
                  <div style={{ display: "flex", gap: 32, fontSize: 12, color: "var(--muted-foreground)" }}>
                    <span>
                      Vérification : Total débits = <strong style={{ color: "var(--foreground)" }}>{fmtCHF(incomeStatement.totalDebit)}</strong>
                    </span>
                    <span>
                      Total crédits = <strong style={{ color: "var(--foreground)" }}>{fmtCHF(incomeStatement.totalCredit)}</strong>
                    </span>
                    <span>
                      Écart ={" "}
                      <strong
                        style={{
                          color:
                            Math.abs(incomeStatement.totalDebit - incomeStatement.totalCredit) < 0.01
                              ? "#16a34a"
                              : "#ef4444",
                        }}
                      >
                        {fmtCHF(Math.abs(incomeStatement.totalDebit - incomeStatement.totalCredit))}
                      </strong>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─── TAB: Charges Statement ─────────────────────────────── */

  const renderChargesStatement = () => {
    if (!selectedBuildingId) {
      return (
        <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Building2 size={40} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sélectionnez un immeuble</div>
        </div>
      );
    }

    const chargeExpenseAccounts = EXPENSE_ACCOUNTS.filter((a) => CHARGE_EXPENSE_ACCOUNTS.includes(a.num));

    return (
      <div>
        <div style={{ ...cardStyle, padding: "24px 0", marginBottom: 24 }}>
          {/* Title */}
          <div style={{ padding: "0 24px 18px", borderBottom: "2px solid var(--border)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
              Décompte de charges {selectedYear}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              {selectedBuilding?.name} - {selectedBuilding?.address}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* ACOMPTES DE CHARGES */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#16a34a",
                    paddingTop: 20,
                    paddingLeft: 24,
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={16} />
                    ACOMPTES DE CHARGES ENCAISSÉS
                  </div>
                </td>
              </tr>
              {renderAccountLine({ num: 103, label: "Acomptes de charges" }, false, true)}
              <tr style={{ background: "var(--background)" }}>
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total acomptes</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#16a34a",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(chargesStatement.acomptesTotal)}
                </td>
              </tr>

              {/* CHARGES EFFECTIVES */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#ef4444",
                    paddingTop: 20,
                    paddingLeft: 24,
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingDown size={16} />
                    CHARGES EFFECTIVES
                  </div>
                </td>
              </tr>
              {chargeExpenseAccounts.map((a) => renderAccountLine(a, true, false))}
              <tr style={{ background: "var(--background)" }}>
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total charges effectives</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(chargesStatement.chargeExpenses)}
                </td>
              </tr>

              {/* SOLDE */}
              <tr>
                <td colSpan={3} style={{ padding: 0, height: 8 }}></td>
              </tr>
              <tr
                style={{
                  background: chargesStatement.solde >= 0 ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <td style={{ ...tdStyle, paddingLeft: 24 }}></td>
                <td style={{ ...tdStyle, fontWeight: 700, fontSize: 15 }}>
                  SOLDE (Acomptes - Charges)
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 15,
                    color: chargesStatement.solde >= 0 ? "#16a34a" : "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtCHF(chargesStatement.solde)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Per-apartment breakdown */}
        {buildingTenants.length > 0 && (
          <div style={cardStyle}>
            <div
              style={{
                padding: "16px 24px",
                fontWeight: 700,
                fontSize: 14,
                borderBottom: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              Répartition par appartement
            </div>
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Locataire</th>
                    <th style={thStyle}>Unité</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>m²</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>%</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Acomptes payés</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Charges dues</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Différence</th>
                  </tr>
                </thead>
                <tbody>
                  {chargesStatement.breakdown.map(({ tenant, m2, pct, acomptesPaid, amountDue, difference }) => (
                    <tr key={tenant.id}>
                      <td style={{ ...tdStyle, fontWeight: 600, fontSize: 13 }}>{tenant.name}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "var(--muted-foreground)" }}>{tenant.unit}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{m2}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--muted-foreground)" }}>
                        {(pct * 100).toFixed(1)}%
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#16a34a", fontWeight: 600 }}>
                        {fmtCHF(acomptesPaid)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#ef4444", fontWeight: 600 }}>
                        {fmtCHF(amountDue)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                          color: difference >= 0 ? "#16a34a" : "#ef4444",
                        }}
                      >
                        {difference >= 0 ? "+" : ""}{fmtCHF(difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── Import Modal ───────────────────────────────────────── */

  const renderImportModal = () => {
    if (!showImport) return null;

    const previewRows = importData.slice(0, 10);

    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowImport(false);
            setImportStep("upload");
            setImportData([]);
            setImportHeaders([]);
            setColumnMap({});
            setImportBuildingId("");
          }
        }}
      >
        <div
          style={{
            background: "var(--card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            width: "90vw",
            maxWidth: importStep === "preview" ? 1100 : 640,
            maxHeight: "85vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Modal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileSpreadsheet size={20} color="var(--primary)" />
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                Importer des transactions
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "var(--background)",
                  color: "var(--muted-foreground)",
                  fontWeight: 600,
                }}
              >
                Étape {importStep === "upload" ? "1/3" : importStep === "map" ? "2/3" : "3/3"}
              </span>
            </div>
            <button
              onClick={() => {
                setShowImport(false);
                setImportStep("upload");
                setImportData([]);
                setImportHeaders([]);
                setColumnMap({});
                setImportBuildingId("");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted-foreground)",
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal body */}
          <div style={{ padding: "24px", overflow: "auto", flex: 1 }}>
            {/* STEP 1: Upload */}
            {importStep === "upload" && (
              <div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 14,
                    padding: "56px 32px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: dragOver ? "rgba(37,99,235,0.04)" : "var(--background)",
                  }}
                  onClick={() => document.getElementById("import-file-input")?.click()}
                >
                  <Upload
                    size={44}
                    strokeWidth={1.3}
                    style={{ margin: "0 auto 16px", color: dragOver ? "var(--primary)" : "var(--muted-foreground)" }}
                  />
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
                    Glissez-déposez un fichier ici
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                    ou cliquez pour sélectionner — CSV, XLSX, XLS
                  </div>
                </div>
                <input
                  id="import-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={handleFileInput}
                />
              </div>
            )}

            {/* STEP 2: Map columns */}
            {importStep === "map" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Immeuble de destination</label>
                  <select
                    style={{ ...inputStyle, width: "100%" }}
                    value={importBuildingId}
                    onChange={(e) => setImportBuildingId(e.target.value)}
                    onFocus={handleFocus as any}
                    onBlur={handleBlur as any}
                  >
                    <option value="">-- Sélectionner --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 12 }}>
                  Colonnes détectées ({importHeaders.length}) — Associez chaque champ :
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px 20px",
                  }}
                >
                  {IMPORT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}</label>
                      <select
                        style={inputStyle}
                        value={columnMap[field.key] || ""}
                        onChange={(e) =>
                          setColumnMap((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        onFocus={handleFocus as any}
                        onBlur={handleBlur as any}
                      >
                        <option value="">-- Ignorer --</option>
                        {importHeaders.map((h, i) => (
                          <option key={i} value={String(i)}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                  <button
                    onClick={() => {
                      setImportStep("upload");
                      setImportData([]);
                      setImportHeaders([]);
                      setColumnMap({});
                    }}
                    style={{
                      ...tabBtnBase,
                      background: "var(--background)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => setImportStep("preview")}
                    disabled={!importBuildingId}
                    style={{
                      ...tabBtnBase,
                      background: importBuildingId ? "var(--primary)" : "var(--border)",
                      color: importBuildingId ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      cursor: importBuildingId ? "pointer" : "not-allowed",
                    }}
                  >
                    Aperçu
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Preview */}
            {importStep === "preview" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>
                  Aperçu des {Math.min(10, importData.length)} premières lignes sur {importData.length} total
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
                  Immeuble : {buildings.find((b) => b.id === importBuildingId)?.name}
                </div>

                <div style={{ overflow: "auto", maxHeight: 380, ...cardStyle }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {IMPORT_FIELDS.filter((f) => columnMap[f.key] !== undefined && columnMap[f.key] !== "").map(
                          (f) => (
                            <th key={f.key} style={{ ...thStyle, fontSize: 10 }}>
                              {f.label}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri}>
                          {IMPORT_FIELDS.filter(
                            (f) => columnMap[f.key] !== undefined && columnMap[f.key] !== "",
                          ).map((f) => (
                            <td key={f.key} style={{ ...tdStyle, fontSize: 12 }}>
                              {row[Number(columnMap[f.key])] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                  <button
                    onClick={() => setImportStep("map")}
                    style={{
                      ...tabBtnBase,
                      background: "var(--background)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    style={{
                      ...tabBtnBase,
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    <CheckCircle size={15} />
                    Importer {importData.length} transactions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  /* ─── Adjustment Modal ───────────────────────────────────── */

  const renderAdjustmentModal = () => {
    if (!showAdjModal) return null;

    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowAdjModal(false);
        }}
      >
        <div
          style={{
            background: "var(--card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            width: "90vw",
            maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
              Ajustement manuel
            </span>
            <button
              onClick={() => setShowAdjModal(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Compte</label>
              <select
                style={inputStyle}
                value={adjAccountNum}
                onChange={(e) => setAdjAccountNum(Number(e.target.value))}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              >
                {ALL_ACCOUNTS.map((a) => (
                  <option key={a.num} value={a.num}>
                    {a.num} - {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Libellé</label>
              <input
                style={inputStyle}
                value={adjLabel}
                onChange={(e) => setAdjLabel(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Ex: Correction assurance"
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Montant (CHF)</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Type</label>
                <select
                  style={inputStyle}
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as "debit" | "credit")}
                  onFocus={handleFocus as any}
                  onBlur={handleBlur as any}
                >
                  <option value="debit">Débit</option>
                  <option value="credit">Crédit</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setShowAdjModal(false)}
                style={{
                  ...tabBtnBase,
                  background: "var(--background)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAddAdjustment}
                disabled={!adjLabel.trim() || !adjAmount}
                style={{
                  ...tabBtnBase,
                  background: adjLabel.trim() && adjAmount ? "var(--primary)" : "var(--border)",
                  color: adjLabel.trim() && adjAmount ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  cursor: adjLabel.trim() && adjAmount ? "pointer" : "not-allowed",
                }}
              >
                <Plus size={14} />
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  /* ─── Main render ────────────────────────────────────────── */

  const tabs = [
    { key: "transactions" as const, label: "Transactions", icon: FileSpreadsheet },
    { key: "rent" as const, label: "Suivi des loyers", icon: Banknote },
    { key: "income" as const, label: "Compte de gérance", icon: TrendingUp },
    { key: "charges" as const, label: "Décompte de charges", icon: DollarSign },
  ];

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 14 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--foreground)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Comptabilité
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Gestion financière de vos immeubles
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Building selector */}
          <div style={{ position: "relative" }}>
            <Building2
              size={15}
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
                pointerEvents: "none",
              }}
            />
            <select
              style={{ ...inputStyle, width: "auto", minWidth: 200, paddingLeft: 32 }}
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              onFocus={handleFocus as any}
              onBlur={handleBlur as any}
            >
              <option value="">Tous les immeubles</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Import button */}
          <button
            onClick={() => setShowImport(true)}
            style={{
              ...tabBtnBase,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Upload size={15} />
            Importer
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 24,
          padding: 4,
          borderRadius: 12,
          background: "var(--background)",
          border: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...tabBtnBase,
                background: isActive ? "var(--card)" : "transparent",
                color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "transactions" && renderTransactions()}
      {activeTab === "rent" && renderRentTracking()}
      {activeTab === "income" && renderIncomeStatement()}
      {activeTab === "charges" && renderChargesStatement()}

      {/* Modals */}
      {renderImportModal()}
      {renderAdjustmentModal()}
    </div>
  );
}

export default AccountingView;
