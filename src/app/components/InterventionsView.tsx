import React, { useState, useEffect } from "react";
import { getBuildings, getTenants } from "../utils/storage";
import {
  Plus,
  X,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Wrench,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Status helpers ──────────────────────────────────────────── */

const STATUS_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
  present:  { bg: "rgba(34,197,94,0.08)",  fg: "#15803D", dot: "#22C55E" },
  absent:   { bg: "rgba(239,68,68,0.08)",  fg: "#B91C1C", dot: "#EF4444" },
  pending:  { bg: "rgba(245,158,11,0.08)", fg: "#92400E", dot: "#F59E0B" },
};

/* ─── Component ───────────────────────────────────────────────── */

export function InterventionsView() {
  const { t } = useLanguage();
  const [interventions, setInterventions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  // Form
  const [buildingId, setBuildingId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [presenceRequired, setPresenceRequired] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  useEffect(() => {
    setBuildings(getBuildings());
    setTenants(getTenants());
    const stored = localStorage.getItem("interventions");
    if (stored) setInterventions(JSON.parse(stored));
  }, []);

  const handleCreate = () => {
    if (!buildingId || !date || !description) return;

    const newIntervention = {
      id: `int-${Date.now()}`,
      buildingId,
      date,
      time,
      description,
      presenceRequired,
      tenantResponses: selectedTenants.map((id) => ({
        tenantId: id,
        status: "pending",
      })),
      createdAt: new Date().toISOString(),
    };

    const updated = [newIntervention, ...interventions];
    setInterventions(updated);
    localStorage.setItem("interventions", JSON.stringify(updated));
    setShowModal(false);

    setBuildingId("");
    setDate("");
    setTime("");
    setDescription("");
    setPresenceRequired(true);
    setSelectedTenants([]);
  };

  const getBuildingName = (id: string) =>
    buildings.find((b) => b.id === id)?.name || "N/A";
  const getTenantName = (id: string) =>
    tenants.find((tn) => tn.id === id)?.name || "Inconnu";

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-4"
        style={{ marginBottom: 28 }}
      >
        <div>
          <h1
            className="text-[22px] font-semibold leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {t("interventionsTitle")}
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("interventionsSub")}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-[13px] font-medium transition-colors"
          style={{
            padding: "10px 20px",
            borderRadius: 14,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Plus className="w-4 h-4" />
          {t("newIntervention")}
        </button>
      </div>

      {/* ── List ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {interventions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: "64px 24px",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--sidebar-accent)" }}
            >
              <Wrench
                className="w-6 h-6"
                style={{ color: "var(--muted-foreground)" }}
              />
            </div>
            <p
              className="text-[14px] font-medium mt-4"
              style={{ color: "var(--foreground)" }}
            >
              {t("noInterventions")}
            </p>
            <p
              className="text-[12px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Planifiez une intervention pour commencer.
            </p>
          </div>
        ) : (
          interventions.map((int) => (
            <div
              key={int.id}
              style={{
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "var(--card)",
                padding: "20px 24px",
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: "rgba(59,130,246,0.08)",
                      color: "#2563EB",
                    }}
                  >
                    <Wrench className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-[15px] font-semibold leading-snug"
                      style={{ color: "var(--foreground)" }}
                    >
                      {int.description}
                    </h3>
                    <div
                      className="flex items-center gap-4 mt-1.5 flex-wrap"
                    >
                      <span
                        className="flex items-center gap-1.5 text-[12px]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {getBuildingName(int.buildingId)}
                      </span>
                      <span
                        className="flex items-center gap-1.5 text-[12px]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(int.date).toLocaleDateString("fr-CH")}{" "}
                        {int.time && `· ${int.time}`}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className="shrink-0 text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{
                    background: int.presenceRequired
                      ? "rgba(245,158,11,0.08)"
                      : "rgba(59,130,246,0.08)",
                    color: int.presenceRequired ? "#92400E" : "#1D4ED8",
                  }}
                >
                  {int.presenceRequired
                    ? t("tenantPresenceRequired")
                    : t("infoOnly")}
                </span>
              </div>

              {/* Tenant responses */}
              {int.presenceRequired && int.tenantResponses.length > 0 && (
                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <h4
                    className="text-[12px] font-semibold uppercase mb-3"
                    style={{
                      color: "var(--muted-foreground)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {t("tenantResponses")}
                  </h4>
                  <div className="space-y-2">
                    {int.tenantResponses.map((r: any) => {
                      const st = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                      return (
                        <div
                          key={r.tenantId}
                          className="flex items-center justify-between"
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "var(--background)",
                          }}
                        >
                          <span
                            className="text-[13px]"
                            style={{ color: "var(--foreground)" }}
                          >
                            {getTenantName(r.tenantId)}
                          </span>
                          <span
                            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                            style={{ background: st.bg, color: st.fg }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: st.dot }}
                            />
                            {r.status === "present"
                              ? t("present")
                              : r.status === "absent"
                              ? t("absent")
                              : t("pending")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Create Modal ──────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", padding: 16 }}
        >
          <div
            className="w-full max-w-lg"
            style={{
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--card)",
              padding: 28,
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-[17px] font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {t("planIntervention")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
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

            {/* Form */}
            <div className="space-y-5">
              <FieldGroup label={t("building")}>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full text-[13px] outline-none"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="">{t("selectABuilding")}</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              {buildingId && (
                <FieldGroup label={t("concernedTenants")}>
                  <div
                    className="max-h-32 overflow-y-auto"
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      padding: 6,
                    }}
                  >
                    {tenants
                      .filter((tn) => tn.buildingId === buildingId)
                      .map((tn) => (
                        <label
                          key={tn.id}
                          className="flex items-center gap-2.5 cursor-pointer transition-colors"
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "var(--sidebar-accent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTenants.includes(tn.id)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedTenants([...selectedTenants, tn.id]);
                              else
                                setSelectedTenants(
                                  selectedTenants.filter((id) => id !== tn.id)
                                );
                            }}
                            style={{ accentColor: "var(--primary)" }}
                          />
                          <span
                            className="text-[13px]"
                            style={{ color: "var(--foreground)" }}
                          >
                            {tn.name} ({t("units")} {tn.unit})
                          </span>
                        </label>
                      ))}
                  </div>
                </FieldGroup>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label={t("date")}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-[13px] outline-none"
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                </FieldGroup>
                <FieldGroup label={t("time")}>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-[13px] outline-none"
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label={t("description")}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-[13px] outline-none resize-none"
                  rows={3}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                  }}
                />
              </FieldGroup>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={presenceRequired}
                  onChange={(e) => setPresenceRequired(e.target.checked)}
                  style={{ accentColor: "var(--primary)" }}
                />
                <span
                  className="text-[13px]"
                  style={{ color: "var(--foreground)" }}
                >
                  {t("presenceRequired")}
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-7">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 text-[13px] font-medium transition-colors"
                style={{
                  padding: "10px 0",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--background)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--card)";
                }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 text-[13px] font-medium transition-colors"
                style={{
                  padding: "10px 0",
                  borderRadius: 12,
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[12px] font-medium mb-1.5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
