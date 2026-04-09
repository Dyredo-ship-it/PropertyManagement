// app/components/DashboardView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Building as BuildingIcon,
  Users,
  Banknote,
  Wrench,
  TrendingUp,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  MapPin,
  Home,
  Plus,
  Circle,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Trash2,
  ListTodo,
  CreditCard,
} from "lucide-react";

import {
  getBuildings,
  getTenants,
  getMaintenanceRequests,
  saveMaintenanceRequests,
  getBuildingActions,
  addBuildingAction,
  updateBuildingAction,
  deleteBuildingAction,
  getNotifications,
  saveNotifications,
  type Building,
  type Tenant,
  type MaintenanceRequest,
  type BuildingAction,
  type Notification,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { BuildingDetailsView } from "./BuildingDetailsView";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Helpers ───────────────────────────────────────────────── */

const BUILDING_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=900&q=80",
];

// formatCHF removed — use formatAmount from CurrencyContext

const PRIORITY_STYLES: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  urgent:  { bg: "rgba(239,68,68,0.08)",  fg: "#DC2626", dot: "#EF4444", label: "Critical" },
  high:    { bg: "rgba(245,158,11,0.08)", fg: "#B45309", dot: "#F59E0B", label: "High" },
  medium:  { bg: "rgba(59,130,246,0.08)", fg: "#1D4ED8", dot: "#3B82F6", label: "Medium" },
  low:     { bg: "rgba(107,114,128,0.08)", fg: "#4B5563", dot: "#6B7280", label: "Low" },
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — Kanban style
═══════════════════════════════════════════════════════════════ */

function AdminDashboard({
  buildings,
  tenants,
  requests,
  onSelectBuilding,
  onStatusChange,
}: {
  buildings: Building[];
  tenants: Tenant[];
  requests: MaintenanceRequest[];
  onSelectBuilding: (id: string) => void;
  onStatusChange: (id: string, status: MaintenanceRequest["status"]) => void;
}) {
  const { t } = useLanguage();
  const { formatAmount, convertToBase, getBuildingCurrency } = useCurrency();
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");

  /* ─── To-Do state ─── */
  const [todos, setTodos] = useState<BuildingAction[]>([]);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoBuildingId, setNewTodoBuildingId] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");

  useEffect(() => {
    setTodos(getBuildingActions());
    // Check for due tasks and create notifications
    checkDueTasks();
  }, []);

  const checkDueTasks = () => {
    const actions = getBuildingActions();
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const existingNotifs = getNotifications();
    const newNotifs: Notification[] = [];

    actions.forEach((action) => {
      if (action.status === "done" || !action.dueDate) return;
      const dueDateDay = action.dueDate.slice(0, 10);
      if (dueDateDay > today) return; // not due yet
      // Check if we already generated a notification for this task today
      const alreadyNotified = existingNotifs.some(
        (n) => n.title?.includes(action.title) && n.date?.slice(0, 10) === today && (n as any).todoId === action.id
      );
      if (alreadyNotified) return;

      const buildingName = action.buildingId
        ? getBuildings().find((b) => b.id === action.buildingId)?.name
        : undefined;

      newNotifs.push({
        id: `todo-notif-${action.id}-${today}`,
        title: `⏰ Tâche à effectuer : ${action.title}`,
        message: `Cette tâche était prévue pour le ${new Date(action.dueDate).toLocaleDateString("fr-CH")}${buildingName ? ` — ${buildingName}` : ""}. Priorité : ${action.priority}.`,
        date: new Date().toISOString(),
        read: false,
        buildingId: action.buildingId || undefined,
        category: action.priority === "high" ? "urgent" : "maintenance",
        ...(({ todoId: action.id }) as any),
      });
    });

    if (newNotifs.length > 0) {
      saveNotifications([...existingNotifs, ...newNotifs]);
    }
  };

  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) return;
    addBuildingAction({
      buildingId: newTodoBuildingId || "",
      title: newTodoTitle.trim(),
      priority: newTodoPriority,
      status: "open",
      dueDate: newTodoDueDate || undefined,
    });
    setTodos(getBuildingActions());
    setNewTodoTitle("");
    setNewTodoBuildingId("");
    setNewTodoPriority("medium");
    setNewTodoDueDate("");
    setShowAddTodo(false);
  };

  const handleToggleTodo = (todo: BuildingAction) => {
    updateBuildingAction({ ...todo, status: todo.status === "open" ? "done" : "open", updatedAt: new Date().toISOString() });
    setTodos(getBuildingActions());
  };

  const handleDeleteTodo = (id: string) => {
    deleteBuildingAction(id);
    setTodos(getBuildingActions());
  };

  /* ─── Late payment tenants ─── */
  const latePaymentTenants = useMemo(() => {
    return (tenants as any[]).filter((tn) =>
      tn.status === "active" && (tn.paymentStatus === "late" || tn.paymentStatus === "very-late")
    ).sort((a: any, b: any) => (b.latePaymentMonths ?? 1) - (a.latePaymentMonths ?? 1));
  }, [tenants]);

  const totalUnits = buildings.reduce((s, b) => s + (b.units ?? 0), 0);
  const occupied = buildings.reduce((s, b) => s + (b.occupiedUnits ?? 0), 0);
  const revenue = buildings.reduce((s, b) => s + convertToBase(b.monthlyRevenue ?? 0, getBuildingCurrency(b)), 0);
  const occPct = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const cols = useMemo(() => {
    const pending = filteredRequests.filter((r) => r.status === "pending");
    const inProgress = filteredRequests.filter((r) => r.status === "in-progress");
    const completed = filteredRequests.filter((r) => r.status === "completed");
    return { pending, inProgress, completed };
  }, [filteredRequests]);


  const filters = [
    { key: "all" as const, label: t("all") || "All" },
    { key: "pending" as const, label: t("pending") },
    { key: "in-progress" as const, label: t("inProgress") },
    { key: "completed" as const, label: t("completed") },
  ];

  /* Recent requests (last 5) */
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 5);
  }, [requests]);

  /* Building summaries */
  const buildingSummaries = useMemo(() => {
    return buildings.map((b) => {
      const bRequests = requests.filter((r) => r.buildingId === b.id);
      const pendingReqs = bRequests.filter((r) => r.status === "pending" || r.status === "in-progress").length;
      const occRate = b.units > 0 ? Math.round((b.occupiedUnits / b.units) * 100) : 0;
      return { ...b, pendingReqs, occRate };
    });
  }, [buildings, requests]);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* ── Page Header ───────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: "var(--foreground)", margin: 0 }}>
          {t("dashboardTitle")}
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 4 }}>
          {t("dashboardSubtitle")}
        </p>
      </div>

      {/* ── Compact KPI Strip ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          marginBottom: 28,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
        }}
      >
        {[
          { icon: BuildingIcon, label: t("totalBuildings"), value: String(buildings.length), sub: `${totalUnits} ${t("totalUnits")}` },
          { icon: Users, label: t("occupancyRate"), value: `${occPct.toFixed(1)}%`, sub: `${occupied} / ${totalUnits}` },
          { icon: Banknote, label: t("monthlyRevenue"), value: formatAmount(revenue), sub: t("combinedTotal") },
          { icon: Wrench, label: t("pendingRequests"), value: String(cols.pending.length), sub: `${requests.length} total` },
        ].map((kpi, i, arr) => {
          const Icon = kpi.icon;
          return (
            <React.Fragment key={kpi.label}>
              <div style={{ flex: 1, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  flexShrink: 0,
                }}>
                  <Icon style={{ width: 16, height: 16, color: "var(--primary)" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: 0 }}>
                    {kpi.label}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0, marginTop: 1, lineHeight: 1.2 }}>
                    {kpi.value}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, marginTop: 1 }}>
                    {kpi.sub}
                  </p>
                </div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1, background: "var(--border)", flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Main content: two-column layout ───────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

        {/* ── Left: Kanban Board ── */}
        <div>
          {/* Filter pills + section title */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
              {t("pendingRequests")}
            </h2>
            <div style={{ display: "flex", gap: 6 }}>
              {filters.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: active ? "1px solid var(--foreground)" : "1px solid var(--border)",
                      background: active ? "var(--foreground)" : "transparent",
                      color: active ? "var(--card)" : "var(--muted-foreground)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--foreground)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kanban columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <KanbanColumn icon={Circle} title={t("pending")} count={cols.pending.length} color="#F59E0B" requests={cols.pending} status="pending" onStatusChange={onStatusChange} />
            <KanbanColumn icon={Clock} title={t("inProgress")} count={cols.inProgress.length} color="var(--primary)" requests={cols.inProgress} status="in-progress" onStatusChange={onStatusChange} />
            <KanbanColumn icon={CheckCircle2} title={t("completed")} count={cols.completed.length} color="#22C55E" requests={cols.completed} status="completed" onStatusChange={onStatusChange} />
          </div>
        </div>

        {/* ── Right sidebar: Late Payments + To-Do + Buildings ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ═══ LATE PAYMENTS ═══ */}
          <div style={{
            borderRadius: 14, border: "1px solid var(--border)",
            background: "var(--card)", padding: "18px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <CreditCard style={{ width: 15, height: 15, color: "#DC2626" }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                {t("latePayments")}
              </h3>
              {latePaymentTenants.length > 0 && (
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  background: "rgba(239,68,68,0.10)", color: "#DC2626",
                  fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 6px", marginLeft: "auto",
                }}>
                  {latePaymentTenants.length}
                </span>
              )}
            </div>

            {latePaymentTenants.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <CheckCircle2 style={{ width: 20, height: 20, color: "#22C55E", margin: "0 auto 6px", opacity: 0.6 }} />
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                  {t("allPaymentsUpToDate")}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {latePaymentTenants.slice(0, 5).map((tn: any) => {
                  const isVeryLate = tn.paymentStatus === "very-late";
                  const months = tn.latePaymentMonths ?? 1;
                  const total = (Number(tn.rentNet ?? 0) || 0) + (Number(tn.charges ?? 0) || 0);
                  return (
                    <div
                      key={tn.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 10,
                        background: isVeryLate ? "rgba(239,68,68,0.04)" : "var(--background)",
                        border: isVeryLate ? "1px solid rgba(239,68,68,0.15)" : "1px solid transparent",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isVeryLate ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)",
                        color: isVeryLate ? "#DC2626" : "#B45309",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {months}m
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tn.name}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, marginTop: 1 }}>
                          {tn.buildingName} · {t("unit")} {tn.unit}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 600, flexShrink: 0,
                        color: isVeryLate ? "#DC2626" : "#B45309",
                      }}>
                        {formatAmount(total * months)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ TO-DO LIST ═══ */}
          <div style={{
            borderRadius: 14, border: "1px solid var(--border)",
            background: "var(--card)", padding: "18px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <ListTodo style={{ width: 15, height: 15, color: "var(--primary)" }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0, flex: 1 }}>
                {t("todoList")}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTodo(!showAddTodo)}
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--background)",
                  color: "var(--muted-foreground)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; e.currentTarget.style.color = "var(--primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                {showAddTodo ? <X style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
              </button>
            </div>

            {/* Add todo form */}
            {showAddTodo && (
              <div style={{
                padding: 12, borderRadius: 10, marginBottom: 12,
                background: "var(--background)", border: "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                {/* Task input with inline add button */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    placeholder={t("todoPlaceholder")}
                    onKeyDown={(e) => { if (e.key === "Enter" && newTodoTitle.trim()) handleAddTodo(); }}
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12,
                      border: "1px solid var(--border)", background: "var(--card)",
                      color: "var(--foreground)", outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddTodo}
                    disabled={!newTodoTitle.trim()}
                    style={{
                      padding: "0 16px", borderRadius: 8, border: "none", flexShrink: 0,
                      background: newTodoTitle.trim() ? "var(--primary)" : "var(--border)",
                      color: newTodoTitle.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      fontSize: 11, fontWeight: 600, cursor: newTodoTitle.trim() ? "pointer" : "default",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { if (newTodoTitle.trim()) e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                {/* Date + Building + Priority row */}
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Calendar style={{
                      position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                      width: 11, height: 11, color: "var(--muted-foreground)", pointerEvents: "none",
                    }} />
                    <input
                      type="datetime-local"
                      value={newTodoDueDate}
                      onChange={(e) => setNewTodoDueDate(e.target.value)}
                      style={{
                        width: "100%", padding: "6px 8px 6px 24px", borderRadius: 7, fontSize: 11,
                        border: "1px solid var(--border)", background: "var(--card)",
                        color: newTodoDueDate ? "var(--foreground)" : "var(--muted-foreground)",
                        outline: "none", boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                  <select
                    value={newTodoBuildingId}
                    onChange={(e) => setNewTodoBuildingId(e.target.value)}
                    style={{
                      flex: 1, padding: "6px 8px", borderRadius: 7, fontSize: 11,
                      border: "1px solid var(--border)", background: "var(--card)",
                      color: newTodoBuildingId ? "var(--foreground)" : "var(--muted-foreground)",
                      outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <option value="">{t("allBuildings")}</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value as any)}
                    style={{
                      width: 90, padding: "6px 8px", borderRadius: 7, fontSize: 11,
                      border: "1px solid var(--border)", background: "var(--card)",
                      color: "var(--foreground)", outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <option value="low">{t("low")}</option>
                    <option value="medium">{t("medium")}</option>
                    <option value="high">{t("high")}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Todo items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {todos.filter((td) => td.status === "open").length === 0 && !showAddTodo ? (
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "16px 0" }}>
                  {t("noTasks")}
                </p>
              ) : (
                [...todos]
                  .sort((a, b) => {
                    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
                    const prio = { high: 0, medium: 1, low: 2 };
                    return (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1);
                  })
                  .slice(0, 10)
                  .map((todo) => {
                    const isDone = todo.status === "done";
                    const bName = buildings.find((b) => b.id === todo.buildingId)?.name;
                    const prioColor = { high: "#DC2626", medium: "#F59E0B", low: "#6B7280" }[todo.priority];
                    const isOverdue = todo.dueDate && !isDone && todo.dueDate.slice(0, 10) <= new Date().toISOString().slice(0, 10);
                    return (
                      <div
                        key={todo.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 8,
                          opacity: isDone ? 0.5 : 1,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(todo)}
                          style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: isDone ? "none" : "2px solid var(--border)",
                            background: isDone ? "var(--primary)" : "transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          {isDone && <CheckCircle2 style={{ width: 13, height: 13, color: "var(--primary-foreground)" }} />}
                        </button>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 12, fontWeight: 500, margin: 0,
                            color: isDone ? "var(--muted-foreground)" : "var(--foreground)",
                            textDecoration: isDone ? "line-through" : "none",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {todo.title}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            {bName && (
                              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                                {bName}
                              </span>
                            )}
                            {todo.dueDate && (
                              <>
                                {bName && <span style={{ fontSize: 10, color: "var(--border)" }}>·</span>}
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 3,
                                  fontSize: 10,
                                  color: isOverdue ? "#DC2626" : "var(--muted-foreground)",
                                  fontWeight: isOverdue ? 600 : 400,
                                }}>
                                  <Calendar style={{ width: 9, height: 9 }} />
                                  {new Date(todo.dueDate).toLocaleDateString("fr-CH")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Priority dot */}
                        <span style={{
                          width: 6, height: 6, borderRadius: 3,
                          background: prioColor, flexShrink: 0,
                        }} />

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTodo(todo.id)}
                          style={{
                            width: 22, height: 22, borderRadius: 6, border: "none",
                            background: "transparent", color: "var(--muted-foreground)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: 0, transition: "opacity 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#DC2626"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* ═══ BUILDINGS OVERVIEW ═══ */}
          <div style={{
            borderRadius: 14, border: "1px solid var(--border)",
            background: "var(--card)", padding: "18px 20px",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0, marginBottom: 14 }}>
              {t("navBuildings")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {buildingSummaries.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10,
                    background: "var(--background)",
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 5%, var(--background))"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                  onClick={() => onSelectBuilding(b.id)}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <BuildingIcon style={{ width: 15, height: 15, color: "var(--primary)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.name}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, marginTop: 1 }}>
                      {b.occupiedUnits}/{b.units} &middot; {b.occRate}%
                    </p>
                  </div>
                  {b.pendingReqs > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 10,
                      background: "rgba(245,158,11,0.12)", color: "#B45309",
                      fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 6px", flexShrink: 0,
                    }}>
                      {b.pendingReqs}
                    </span>
                  )}
                  <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Kanban Column ───────────────────────────────────────────── */

function KanbanColumn({
  icon: Icon,
  title,
  count,
  color,
  requests,
  status,
  onStatusChange,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
  requests: MaintenanceRequest[];
  status: string;
  onStatusChange: (id: string, status: MaintenanceRequest["status"]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const reqId = e.dataTransfer.getData("text/plain");
    if (reqId) onStatusChange(reqId, status as MaintenanceRequest["status"]);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderRadius: 14, padding: 4,
        border: dragOver ? `2px dashed ${color}` : "2px dashed transparent",
        background: dragOver ? `${color}08` : "transparent",
        transition: "all 0.15s",
      }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon style={{ width: 16, height: 16, color, flexShrink: 0 }} />
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            {title}
          </h3>
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)" }}>
          {count}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {requests.length === 0 ? (
          <div style={{
            padding: "40px 16px", borderRadius: 14,
            border: "1px dashed var(--border)", background: "var(--card)",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Aucune demande</p>
          </div>
        ) : (
          requests.map((req) => (
            <TaskCard key={req.id} request={req} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Task Card (kanban card) ─────────────────────────────────── */

const STATUS_OPTIONS: { key: MaintenanceRequest["status"]; label: string; color: string }[] = [
  { key: "pending", label: "En attente", color: "#F59E0B" },
  { key: "in-progress", label: "En cours", color: "var(--primary)" },
  { key: "completed", label: "Terminé", color: "#22C55E" },
];

function TaskCard({
  request,
  onStatusChange,
}: {
  request: MaintenanceRequest;
  onStatusChange: (id: string, status: MaintenanceRequest["status"]) => void;
}) {
  const priority = PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.medium;
  const dateStr = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString("fr-CH", { month: "short", day: "numeric" })
    : "";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", request.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group"
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
        cursor: "grab",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "rgba(69,85,58,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Title */}
      <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0, lineHeight: 1.3 }}>
        {request.title}
      </h4>

      {/* Description */}
      <p style={{
        fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0", lineHeight: 1.4,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {request.description || `${request.buildingName} · Apt ${request.unit}`}
      </p>

      {/* Meta row: date + priority */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground)" }}>
          <Calendar style={{ width: 12, height: 12 }} />
          {dateStr}
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500,
          padding: "2px 8px", borderRadius: 99, background: priority.bg, color: priority.fg,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: priority.dot }} />
          {priority.label}
        </span>
      </div>

      {/* Status change buttons — visible on hover */}
      <div
        className="opacity-0 group-hover:opacity-100"
        style={{ display: "flex", gap: 4, marginTop: 10, transition: "opacity 0.15s" }}
      >
        {STATUS_OPTIONS
          .filter((s) => s.key !== request.status)
          .map((s) => (
            <button
              key={s.key}
              onClick={() => onStatusChange(request.id, s.key)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 7,
                fontSize: 10, fontWeight: 600,
                border: "none", cursor: "pointer",
                background: `${s.color}12`, color: s.color,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {s.label}
            </button>
          ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TENANT DASHBOARD
═══════════════════════════════════════════════════════════════ */

function TenantDashboard({
  buildings,
  tenants,
  requests,
  userEmail,
  userId,
  userName,
}: {
  buildings: Building[];
  tenants: Tenant[];
  requests: MaintenanceRequest[];
  userEmail: string;
  userId: string;
  userName: string;
}) {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();
  const myTenant = tenants.find((te) => te.email === userEmail);
  const myBuilding = buildings.find((b) => b.id === myTenant?.buildingId);
  const myRequests = requests.filter((r) => r.tenantId === userId);
  const pendingCount = myRequests.filter((r) => r.status === "pending").length;
  const inProgressCount = myRequests.filter((r) => r.status === "in-progress").length;
  const heroPhoto = myBuilding?.imageUrl || BUILDING_PHOTOS[0];

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* Hero */}
      <div
        className="overflow-hidden flex flex-col lg:flex-row"
        style={{
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--card)",
          marginBottom: 24,
        }}
      >
        <div className="relative lg:w-[50%] min-h-[220px] lg:min-h-[280px]">
          <img
            src={heroPhoto}
            alt={myBuilding?.name ?? ""}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="lg:w-[50%] p-7 flex flex-col justify-center">
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            {t("hello")},
          </p>
          <h2
            className="text-[22px] font-bold mt-1"
            style={{ color: "var(--foreground)" }}
          >
            {userName}
          </h2>
          {myBuilding && (
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
              <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                {myBuilding.name} — {myBuilding.address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        {[
          { icon: Home, label: t("myBuilding"), value: myBuilding?.name ?? "—", sub: myTenant?.unit ? `Apt ${myTenant.unit}` : undefined },
          { icon: Banknote, label: t("monthlyRent"), value: myTenant ? formatAmount(myTenant.rent) : "—", sub: t("currentAmount") },
          { icon: Wrench, label: t("waiting"), value: pendingCount, sub: t("requests") },
          { icon: AlertCircle, label: t("ongoing"), value: inProgressCount, sub: t("requests") },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              style={{
                padding: 20,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: "var(--sidebar-accent)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
              </div>
              <p
                className="text-[11px] font-medium uppercase"
                style={{ color: "var(--muted-foreground)", letterSpacing: "0.05em" }}
              >
                {kpi.label}
              </p>
              <p className="text-[20px] font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
                {kpi.value}
              </p>
              {kpi.sub && (
                <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {kpi.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Lease */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3
          className="text-[15px] font-semibold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          {t("leaseInfo")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("unit"), value: myTenant?.unit ?? "—" },
            { label: t("address"), value: myBuilding?.address ?? "—" },
            { label: t("leaseStart"), value: myTenant?.leaseStart ? new Date(myTenant.leaseStart).toLocaleDateString("fr-CH") : "—" },
            { label: t("leaseEnd"), value: myTenant?.leaseEnd ? new Date(myTenant.leaseEnd).toLocaleDateString("fr-CH") : "—" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl"
              style={{ padding: "12px 14px", background: "var(--background)", border: "1px solid var(--border)" }}
            >
              <p
                className="text-[10px] font-medium uppercase mb-1"
                style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
              >
                {item.label}
              </p>
              <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      {myRequests.length > 0 && (
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: 24,
          }}
        >
          <h3
            className="text-[15px] font-semibold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            {t("recentRequests")}
          </h3>
          <div className="space-y-2">
            {myRequests.slice(0, 4).map((req) => {
              const priority = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.medium;
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-4 rounded-xl transition-colors"
                  style={{
                    padding: "12px 14px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(69,85,58,0.07)" }}
                  >
                    <Wrench className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {req.title}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {req.buildingName} · Apt {req.unit}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: priority.bg, color: priority.fg }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: priority.dot }}
                    />
                    {priority.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */

export function DashboardView({ onSelectBuilding }: { onSelectBuilding?: (id: string) => void }) {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  useEffect(() => {
    setBuildings(getBuildings());
    setTenants(getTenants());
    setRequests(getMaintenanceRequests());
  }, []);

  if (user?.role === "tenant") {
    return (
      <TenantDashboard
        buildings={buildings}
        tenants={tenants}
        requests={requests}
        userEmail={user.email}
        userId={user.id}
        userName={user.name}
      />
    );
  }

  const handleRequestStatusChange = (id: string, newStatus: MaintenanceRequest["status"]) => {
    const all = getMaintenanceRequests();
    const updated = all.map((r) => r.id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r);
    saveMaintenanceRequests(updated);
    setRequests(updated);
  };

  return (
    <AdminDashboard
      buildings={buildings}
      tenants={tenants}
      requests={requests}
      onSelectBuilding={onSelectBuilding || (() => {})}
      onStatusChange={handleRequestStatusChange}
    />
  );
}
