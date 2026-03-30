import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  ExternalLink,
  Eye,
  ClipboardCheck,
  PenTool,
  Users,
  MoreHorizontal,
  Clock,
  MapPin,
} from "lucide-react";
import {
  getCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
  getBuildings,
  type CalendarEvent,
  type CalendarEventType,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Event type config ──────────────────────────────────────── */

const EVENT_TYPES: Record<CalendarEventType, { color: string; icon: React.ElementType }> = {
  visit:      { color: "#2563EB", icon: Eye },
  inspection: { color: "#B45309", icon: ClipboardCheck },
  signing:    { color: "#7C3AED", icon: PenTool },
  meeting:    { color: "#15803D", icon: Users },
  other:      { color: "#6B7280", icon: MoreHorizontal },
};

/* ─── Google Calendar URL helper ─────────────────────────────── */

function buildGoogleCalendarUrl(event: CalendarEvent, buildingName?: string) {
  const startDate = event.date.replace(/-/g, "");
  const startTime = (event.startTime || "09:00").replace(":", "") + "00";
  const endTime = (event.endTime || (() => {
    const [h, m] = (event.startTime || "09:00").split(":").map(Number);
    return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  })()).replace(":", "") + "00";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${startDate}T${startTime}/${startDate}T${endTime}`,
    details: event.notes || "",
    location: buildingName || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ─── Calendar helpers ───────────────────────────────────────── */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DAY_NAMES = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

/* ─── Main Component ─────────────────────────────────────────── */

export function CalendarView() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    type: "visit" as CalendarEventType,
    buildingId: "",
    notes: "",
  });

  useEffect(() => {
    setEvents(getCalendarEvents());
    setBuildings(getBuildings());
  }, []);

  const reload = () => setEvents(getCalendarEvents());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toISOString().slice(0, 10);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent = addCalendarEvent({
      title: formData.title.trim(),
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime || undefined,
      type: formData.type,
      buildingId: formData.buildingId || undefined,
      notes: formData.notes.trim() || undefined,
    });

    // Open Google Calendar link
    const building = formData.buildingId ? buildings.find((b) => b.id === formData.buildingId) : null;
    const gcalUrl = buildGoogleCalendarUrl(newEvent, building?.name);
    window.open(gcalUrl, "_blank");

    setShowCreate(false);
    setFormData({ title: "", date: "", startTime: "09:00", endTime: "10:00", type: "visit", buildingId: "", notes: "" });
    reload();
  };

  const handleDelete = (id: string) => {
    deleteCalendarEvent(id);
    reload();
  };

  const openCreateForDay = (dateStr: string) => {
    setFormData((prev) => ({ ...prev, date: dateStr }));
    setShowCreate(true);
  };

  const getBuildingName = (id?: string) => id ? buildings.find((b) => b.id === id)?.name : undefined;

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Selected day events
  const selectedDayEvents = selectedDay ? (eventsByDate.get(selectedDay) || []) : [];

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 22 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 650, margin: 0, lineHeight: 1.2,
            color: "var(--foreground)",
            borderLeft: "4px solid var(--primary)",
            paddingLeft: 14,
          }}>
            {t("calendarTitle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 4, paddingLeft: 18 }}>
            {t("calendarSub")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 550,
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--foreground)", textDecoration: "none", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--background)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--card)"; }}
          >
            <ExternalLink style={{ width: 13, height: 13 }} />
            {t("calendarConnectGoogle")}
          </a>
          <button
            onClick={() => { setFormData((p) => ({ ...p, date: todayStr })); setShowCreate(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "var(--primary)", color: "var(--primary-foreground)",
              border: "none", cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            {t("calendarAddEvent")}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* ── Calendar grid ─────────────────────────────────── */}
        <div style={{
          borderRadius: 14, border: "1px solid var(--border)",
          background: "var(--card)", overflow: "hidden",
        }}>
          {/* Month nav */}
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={prevMonth} style={navBtnStyle}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", minWidth: 160, textAlign: "center" }}>
                {MONTH_NAMES_FR[month]} {year}
              </span>
              <button onClick={nextMonth} style={navBtnStyle}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <button
              onClick={goToday}
              style={{
                padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                border: "1px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            >
              {t("calendarToday")}
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{
                padding: "8px 0", textAlign: "center",
                fontSize: 10, fontWeight: 650, textTransform: "uppercase",
                letterSpacing: "0.05em", color: "var(--muted-foreground)",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - firstDay + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = isCurrentMonth
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                : "";
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              const dayEvents = dateStr ? (eventsByDate.get(dateStr) || []) : [];

              return (
                <button
                  key={i}
                  onClick={() => { if (isCurrentMonth) setSelectedDay(isSelected ? null : dateStr); }}
                  onDoubleClick={() => { if (isCurrentMonth) openCreateForDay(dateStr); }}
                  style={{
                    padding: "6px 4px 10px", minHeight: 72,
                    border: "none", borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                    borderBottom: i < totalCells - 7 ? "1px solid var(--border)" : "none",
                    background: isSelected ? "rgba(69,85,58,0.04)" : "transparent",
                    cursor: isCurrentMonth ? "pointer" : "default",
                    opacity: isCurrentMonth ? 1 : 0.3,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: 99,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: isToday ? 700 : 500,
                    background: isToday ? "var(--primary)" : "transparent",
                    color: isToday ? "var(--primary-foreground)" : "var(--foreground)",
                  }}>
                    {isCurrentMonth ? dayNum : ""}
                  </span>
                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span key={ev.id} style={{
                          width: 6, height: 6, borderRadius: 99,
                          background: EVENT_TYPES[ev.type]?.color || "#6B7280",
                        }} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: 8, color: "var(--muted-foreground)", fontWeight: 600 }}>
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right sidebar: day events ─────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Legend */}
          <div style={{
            borderRadius: 12, border: "1px solid var(--border)",
            background: "var(--card)", padding: "12px 14px",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {(Object.entries(EVENT_TYPES) as [CalendarEventType, typeof EVENT_TYPES[CalendarEventType]][]).map(([key, { color }]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                    {t(`calendarType${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected day events */}
          <div style={{
            borderRadius: 12, border: "1px solid var(--border)",
            background: "var(--card)", flex: 1, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "12px 14px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 13, fontWeight: 650, color: "var(--foreground)" }}>
                {selectedDay
                  ? new Date(selectedDay + "T00:00").toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" })
                  : t("calendarNoEvents")}
              </span>
              {selectedDay && (
                <button
                  onClick={() => openCreateForDay(selectedDay)}
                  style={{
                    width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)",
                    background: "var(--card)", color: "var(--muted-foreground)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                >
                  <Plus style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 12px" }}>
                  <Calendar style={{ width: 28, height: 28, color: "var(--border)", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                    {selectedDay ? t("calendarNoEvents") : "Sélectionnez un jour"}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedDayEvents
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((ev) => {
                      const meta = EVENT_TYPES[ev.type] || EVENT_TYPES.other;
                      const Icon = meta.icon;
                      const bName = getBuildingName(ev.buildingId);
                      return (
                        <div key={ev.id} className="group" style={{
                          borderRadius: 10, overflow: "hidden",
                          border: "1px solid var(--border)",
                          borderLeft: `3px solid ${meta.color}`,
                          transition: "box-shadow 0.15s",
                        }}>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                  <Icon style={{ width: 12, height: 12, color: meta.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                                    {ev.title}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--muted-foreground)" }}>
                                    <Clock style={{ width: 9, height: 9 }} />
                                    {ev.startTime}{ev.endTime && ` – ${ev.endTime}`}
                                  </span>
                                  {bName && (
                                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--muted-foreground)" }}>
                                      <MapPin style={{ width: 9, height: 9 }} />
                                      {bName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                <a
                                  href={buildGoogleCalendarUrl(ev, bName)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t("calendarAddToGoogle")}
                                  style={{
                                    width: 24, height: 24, borderRadius: 6,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: "none", background: "transparent",
                                    color: "var(--muted-foreground)", cursor: "pointer",
                                    transition: "all 0.15s", textDecoration: "none",
                                  }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(69,85,58,0.08)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                                >
                                  <ExternalLink style={{ width: 11, height: 11 }} />
                                </a>
                                <button
                                  onClick={() => handleDelete(ev.id)}
                                  className="opacity-0 group-hover:opacity-100"
                                  style={{
                                    width: 24, height: 24, borderRadius: 6, border: "none",
                                    background: "transparent", color: "var(--muted-foreground)",
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#DC2626"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                                >
                                  <Trash2 style={{ width: 11, height: 11 }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming events */}
          <div style={{
            borderRadius: 12, border: "1px solid var(--border)",
            background: "var(--card)", padding: "12px 14px",
          }}>
            <h4 style={{ fontSize: 11, fontWeight: 650, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Prochains événements
            </h4>
            {events
              .filter((e) => e.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
              .slice(0, 5)
              .map((ev) => {
                const meta = EVENT_TYPES[ev.type] || EVENT_TYPES.other;
                return (
                  <div key={ev.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: meta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>
                      {new Date(ev.date + "T00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short" })} · {ev.startTime}
                    </span>
                    <a
                      href={buildGoogleCalendarUrl(ev, getBuildingName(ev.buildingId))}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("calendarAddToGoogle")}
                      style={{ color: "var(--muted-foreground)", transition: "color 0.15s", flexShrink: 0 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                    >
                      <ExternalLink style={{ width: 10, height: 10 }} />
                    </a>
                  </div>
                );
              })}
            {events.filter((e) => e.date >= todayStr).length === 0 && (
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, textAlign: "center", padding: "8px 0" }}>
                {t("calendarNoEvents")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Create event modal ──────────────────────────────── */}
      {showCreate && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.35)", padding: 16,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480,
              borderRadius: 16, overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--card)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
              display: "flex", flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "16px 22px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: "rgba(69,85,58,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderLeft: "3px solid var(--primary)",
              }}>
                <Calendar style={{ width: 16, height: 16, color: "var(--primary)" }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", flex: 1 }}>
                {t("calendarAddEvent")}
              </span>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none",
                  color: "var(--muted-foreground)", cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Title */}
                <div>
                  <label style={labelStyle}>{t("calendarEventTitle")}</label>
                  <input
                    type="text" required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Visite appartement 3B"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                </div>

                {/* Date + Start + End */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t("calendarEventDate")}</label>
                    <input
                      type="date" required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Début</label>
                    <input
                      type="time" required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Fin</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                </div>

                {/* Type + Building */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t("calendarEventType")}</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEventType })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <option value="visit">{t("calendarTypeVisit")}</option>
                      <option value="inspection">{t("calendarTypeInspection")}</option>
                      <option value="signing">{t("calendarTypeSigning")}</option>
                      <option value="meeting">{t("calendarTypeMeeting")}</option>
                      <option value="other">{t("calendarTypeOther")}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("calendarEventBuilding")}</label>
                    <select
                      value={formData.buildingId}
                      onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <option value="">—</option>
                      {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={labelStyle}>{t("calendarEventNotes")}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Détails supplémentaires..."
                    style={{ ...inputStyle, resize: "none" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: "14px 22px", borderTop: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <p style={{ flex: 1, fontSize: 10, color: "var(--muted-foreground)", margin: 0 }}>
                  <ExternalLink style={{ width: 9, height: 9, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  {t("calendarSyncInfo")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{
                    padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 550,
                    border: "1px solid var(--border)", background: "var(--card)",
                    color: "var(--foreground)", cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Calendar style={{ width: 13, height: 13 }} />
                  {t("calendarAddToGoogle")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── Shared styles ──────────────────────────────────────────── */

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)",
  background: "var(--card)", color: "var(--muted-foreground)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background 0.15s",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 10px", borderRadius: 8, fontSize: 12,
  border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
  outline: "none", transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 650,
  color: "var(--muted-foreground)", marginBottom: 4,
  textTransform: "uppercase", letterSpacing: "0.04em",
};
