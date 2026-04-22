import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Wrench,
  Loader2,
  CheckCircle,
  AlertTriangle,
  History,
  Plus as PlusIcon,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { usePlanLimits } from "../lib/billing";
import {
  getNotifications,
  getMaintenanceRequests,
  getTenants,
  getBuildings,
} from "../utils/storage";
import {
  describeWriteAction,
  executeWriteAction,
  type WriteActionResult,
} from "../lib/aiWriteActions";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  text: string;
  // Tool invocations that happened during this assistant turn — rendered
  // as small status lines so the user sees what the agent did.
  toolEvents?: { name: string; ok?: boolean }[];
  // Terminal status for an assistant message that executed a write tool.
  writeOutcome?: { ok: boolean; summary: string };
}

interface StreamEvent {
  type:
    | "text_delta"
    | "tool_use"
    | "tool_result"
    | "pending_write_action"
    | "done"
    | "error";
  delta?: string;
  message?: string;
  name?: string;
  input?: Record<string, unknown>;
  ok?: boolean;
  tool_use_id?: string;
  continuation_state?: unknown;
}

interface PendingAction {
  toolUseId: string;
  name: string;
  input: Record<string, any>;
  continuationState: unknown;
}

const DEFAULT_SUGGESTIONS = [
  "Quels locataires n'ont pas payé leur loyer ce mois-ci ?",
  "Résume la comptabilité du dernier mois.",
  "Quels baux expirent dans les 3 prochains mois ?",
  "Liste les demandes de maintenance ouvertes.",
];

/**
 * Computes smart suggestions based on the hydrated cache so the empty
 * state of a new conversation surfaces the most urgent topics: late
 * payments, stale maintenance requests, leases ending soon, etc. Falls
 * back to generic prompts when nothing notable is found.
 */
function computeProactiveSuggestions(): { emoji: string; text: string; prompt: string }[] {
  const out: { emoji: string; text: string; prompt: string }[] = [];
  const today = new Date();

  try {
    // Late payment signal — unread "payment" notifications.
    const lateNotifs = getNotifications().filter(
      (n) => n.category === "payment" && !n.read,
    );
    if (lateNotifs.length > 0) {
      out.push({
        emoji: "🔴",
        text: `${lateNotifs.length} retard${lateNotifs.length > 1 ? "s" : ""} de paiement détecté${lateNotifs.length > 1 ? "s" : ""}`,
        prompt: "Quels locataires sont en retard de paiement ce mois-ci ? Propose d'envoyer les rappels.",
      });
    }

    // Stale maintenance requests — pending for 7+ days.
    const stale = getMaintenanceRequests().filter((r) => {
      if (r.status !== "pending") return false;
      const age = today.getTime() - new Date(r.createdAt).getTime();
      return age > 7 * 24 * 60 * 60 * 1000;
    });
    if (stale.length > 0) {
      out.push({
        emoji: "🛠️",
        text: `${stale.length} demande${stale.length > 1 ? "s" : ""} ouverte${stale.length > 1 ? "s" : ""} depuis +7 jours`,
        prompt: "Liste les demandes de maintenance en attente depuis plus d'une semaine.",
      });
    }

    // Leases ending within 3 months.
    const threeMonths = new Date(today);
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const endingSoon = getTenants().filter((t) => {
      if (t.status !== "active" || !t.leaseEnd) return false;
      const end = new Date(t.leaseEnd);
      return end >= today && end <= threeMonths;
    });
    if (endingSoon.length > 0) {
      out.push({
        emoji: "📅",
        text: `${endingSoon.length} bail${endingSoon.length > 1 ? "s" : ""} expire${endingSoon.length > 1 ? "nt" : ""} dans 3 mois`,
        prompt: "Liste les locataires dont le bail expire dans les 3 prochains mois et suggère un plan d'action.",
      });
    }

    // Portfolio context note.
    const buildingCount = getBuildings().length;
    const tenantCount = getTenants().filter((t) => t.status === "active").length;
    if (buildingCount > 0 && out.length < 2) {
      out.push({
        emoji: "📊",
        text: `Résumé de ${buildingCount} immeuble${buildingCount > 1 ? "s" : ""} · ${tenantCount} locataire${tenantCount > 1 ? "s" : ""}`,
        prompt: "Donne-moi un résumé rapide de ma régie : nombre d'immeubles, locataires actifs, état global.",
      });
    }
  } catch {
    /* fall through to defaults */
  }

  return out;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  last_message_at: string;
}

export function AIChatPanel() {
  const { user } = useAuth();
  const planState = usePlanLimits();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [usageThisMonth, setUsageThisMonth] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const aiQuota = planState.limits.aiQuestionsPerMonth;
  const quotaReached = aiQuota !== null && usageThisMonth >= aiQuota;
  const aiDisabled = aiQuota === 0;

  // Tenants and non-admins don't get the assistant for now.
  const visible = !!user && user.role !== "tenant";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Allow the mobile bottom nav (or any other UI) to open the assistant
  // by dispatching a `palier:open-ai` window event. Keeps the coupling
  // loose without lifting this component's state into App.tsx.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("palier:open-ai", handler);
    return () => window.removeEventListener("palier:open-ai", handler);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-persist the conversation after each completed turn (not busy,
  // no pending action, at least one user→assistant pair).
  useEffect(() => {
    if (busy || pending || !user || messages.length < 2) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.text) return;
    void saveConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, busy, pending]);

  const loadUsage = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc("current_ai_usage");
      setUsageThisMonth(typeof data === "number" ? data : 0);
    } catch {
      /* ignore — counter stays stale */
    }
  }, [user]);

  useEffect(() => {
    if (!open) return;
    void loadUsage();
  }, [open, loadUsage, messages.length]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, last_message_at")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false })
      .limit(20);
    setConversations((data as ConversationSummary[]) ?? []);
  }, [user]);

  const saveConversation = async () => {
    if (!user) return;
    let id = conversationId;
    const firstUser = messages.find((m) => m.role === "user");
    const title = firstUser?.text.slice(0, 60) ?? "Conversation";

    if (!id) {
      const { data, error: e } = await supabase
        .from("ai_conversations")
        .insert({
          organization_id: user.organizationId!,
          user_id: user.id,
          title,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (e || !data) return;
      id = data.id;
      setConversationId(id);
      // Insert every message on first save.
      await supabase.from("ai_messages").insert(
        messages.map((m) => ({
          conversation_id: id,
          role: m.role,
          text: m.text,
          tool_events: m.toolEvents ?? [],
          write_outcome: m.writeOutcome ?? null,
        })),
      );
    } else {
      // Only append the messages that aren't yet in the DB. Simplest
      // reliable approach: count existing rows, insert the delta.
      const { count } = await supabase
        .from("ai_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", id);
      const existing = count ?? 0;
      if (messages.length > existing) {
        const delta = messages.slice(existing).map((m) => ({
          conversation_id: id,
          role: m.role,
          text: m.text,
          tool_events: m.toolEvents ?? [],
          write_outcome: m.writeOutcome ?? null,
        }));
        if (delta.length > 0) {
          await supabase.from("ai_messages").insert(delta);
        }
      }
      await supabase.from("ai_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", id);
    }
  };

  const openConversation = async (id: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("role, text, tool_events, write_outcome, created_at")
      .eq("conversation_id", id)
      .order("created_at");
    const loaded: ChatMessage[] = (data ?? []).map((r: any) => ({
      role: r.role,
      text: r.text,
      toolEvents: Array.isArray(r.tool_events) ? r.tool_events : [],
      writeOutcome: r.write_outcome ?? undefined,
    }));
    setMessages(loaded);
    setConversationId(id);
    setHistoryOpen(false);
    setPending(null);
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
    setPending(null);
    setError(null);
    setHistoryOpen(false);
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await supabase.from("ai_conversations").delete().eq("id", id);
    if (conversationId === id) newConversation();
    await loadConversations();
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (aiDisabled) {
      setError("Votre plan actuel n'inclut pas l'assistant IA. Passez au plan Pro ou Business pour l'activer.");
      return;
    }
    if (quotaReached) {
      setError(`Quota mensuel atteint (${aiQuota} questions). Passez au plan Business pour un accès illimité, ou attendez le début du mois prochain.`);
      return;
    }
    setInput("");
    const history = [...messages, { role: "user" as const, text: trimmed }];
    setMessages([...history, { role: "assistant", text: "", toolEvents: [] }]);
    const body = {
      messages: history.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.text }],
      })),
    };
    await runStream(body);
    // Refresh usage count after the call.
    void loadUsage();
  };

  const runStream = async (body: Record<string, unknown>, rollbackOnError = true) => {
    setError(null);
    setBusy(true);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setError("Session expirée, veuillez vous reconnecter.");
      setBusy(false);
      return;
    }

    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    const url = `${supabaseUrl}/functions/v1/ai-assistant`;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": anonKey,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        let msg = "Erreur côté serveur.";
        try {
          const j = await resp.json();
          msg = j.error || msg;
        } catch {}
        setError(msg);
        if (rollbackOnError) setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          let event: StreamEvent;
          try { event = JSON.parse(payload); } catch { continue; }
          handleEvent(event);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
        if (rollbackOnError) setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEvent = (event: StreamEvent) => {
    if (event.type === "pending_write_action" && event.tool_use_id && event.name) {
      setPending({
        toolUseId: event.tool_use_id,
        name: event.name,
        input: (event.input as Record<string, any>) ?? {},
        continuationState: event.continuation_state,
      });
      return;
    }
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last || last.role !== "assistant") return prev;
      if (event.type === "text_delta" && event.delta) {
        last.text += event.delta;
      } else if (event.type === "tool_use" && event.name) {
        last.toolEvents = [...(last.toolEvents ?? []), { name: event.name }];
      } else if (event.type === "tool_result") {
        const ev = last.toolEvents?.slice() ?? [];
        for (let i = ev.length - 1; i >= 0; i--) {
          if (ev[i].ok === undefined) {
            ev[i] = { ...ev[i], ok: !!event.ok };
            break;
          }
        }
        last.toolEvents = ev;
      } else if (event.type === "error" && event.message) {
        last.text = last.text
          ? `${last.text}\n\n[erreur: ${event.message}]`
          : `[erreur: ${event.message}]`;
      }
      return next;
    });
  };

  const handleConfirmAction = async () => {
    if (!pending || busy) return;
    const action = pending;
    setPending(null);

    const result = await executeWriteAction(action.name, action.input);
    // Surface the outcome in the current assistant bubble so the user
    // sees it even before the LLM's continuation arrives.
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        last.writeOutcome = { ok: result.ok, summary: result.ok ? result.summary : result.error };
      }
      return next;
    });

    await runStream(
      {
        resume: {
          continuation_state: action.continuationState,
          tool_use_id: action.toolUseId,
          result,
        },
      },
      false,
    );
  };

  const handleCancelAction = async () => {
    if (!pending || busy) return;
    const action = pending;
    setPending(null);
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        last.writeOutcome = { ok: false, summary: "Action annulée" };
      }
      return next;
    });
    await runStream(
      {
        resume: {
          continuation_state: action.continuationState,
          tool_use_id: action.toolUseId,
          result: { ok: false, error: "cancelled by user" },
        },
      },
      false,
    );
  };

  if (!visible) return null;

  return (
    <>
      {/* Floating trigger — hidden on mobile (the bottom nav hosts an
          AI button instead, which dispatches palier:open-ai). Desktop
          keeps the floating bubble. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Assistant Palier"
          className="ai-fab"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            boxShadow: "0 12px 28px rgba(69,85,58,0.35)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9500,
          }}
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="ai-fab-panel"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            width: "min(96vw, 420px)",
            height: "min(82vh, 640px)",
            background: "var(--card)",
            color: "var(--foreground)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            zIndex: 9500,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              background: "linear-gradient(180deg, rgba(69,85,58,0.08), transparent)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--primary)", color: "var(--primary-foreground)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Assistant Palier</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  Confirmation requise pour chaque action.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={newConversation}
                title="Nouvelle conversation"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 6 }}
              >
                <PlusIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const next = !historyOpen;
                  setHistoryOpen(next);
                  if (next) void loadConversations();
                }}
                title="Historique"
                style={{
                  background: historyOpen ? "var(--background)" : "none",
                  borderRadius: 8, border: "none",
                  cursor: "pointer", color: "var(--muted-foreground)", padding: 6,
                }}
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 6 }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {historyOpen && (
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                padding: "10px 16px", maxHeight: 220, overflowY: "auto",
                background: "var(--background)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Conversations récentes
              </div>
              {conversations.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Aucune conversation enregistrée.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 8px", borderRadius: 8,
                        background: c.id === conversationId ? "var(--primary)" : "var(--card)",
                        color: c.id === conversationId ? "var(--primary-foreground)" : "var(--foreground)",
                      }}
                    >
                      <button
                        onClick={() => openConversation(c.id)}
                        style={{
                          flex: 1, minWidth: 0, textAlign: "left",
                          background: "none", border: "none", cursor: "pointer",
                          color: "inherit", padding: 0,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.title ?? "Conversation"}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>
                          {new Date(c.last_message_at).toLocaleString("fr-CH")}
                        </div>
                      </button>
                      <button
                        onClick={() => deleteConversation(c.id)}
                        title="Supprimer"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: c.id === conversationId ? "var(--primary-foreground)" : "#DC2626",
                          padding: 4,
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {messages.length === 0 && !busy && (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10 }}>
                  Posez-moi une question sur votre régie.
                </p>
                {(() => {
                  const proactive = computeProactiveSuggestions();
                  if (proactive.length > 0) {
                    return (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          À votre attention
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                          {proactive.map((s) => (
                            <button
                              key={s.prompt}
                              onClick={() => send(s.prompt)}
                              disabled={aiDisabled || quotaReached}
                              style={{
                                textAlign: "left", padding: "10px 12px", borderRadius: 10,
                                border: "1px solid var(--border)",
                                background: "var(--card)",
                                color: "var(--foreground)", fontSize: 12,
                                cursor: aiDisabled || quotaReached ? "not-allowed" : "pointer",
                                opacity: aiDisabled || quotaReached ? 0.6 : 1,
                                display: "flex", alignItems: "center", gap: 8,
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{s.emoji}</span>
                              <span>{s.text}</span>
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Ou essayez
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {DEFAULT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={aiDisabled || quotaReached}
                      style={{
                        textAlign: "left", padding: "9px 12px", borderRadius: 10,
                        border: "1px solid var(--border)", background: "var(--background)",
                        color: "var(--foreground)", fontSize: 12,
                        cursor: aiDisabled || quotaReached ? "not-allowed" : "pointer",
                        opacity: aiDisabled || quotaReached ? 0.6 : 1,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "9px 12px", borderRadius: 12, maxWidth: "92%",
                    background: m.role === "user" ? "var(--primary)" : "var(--background)",
                    color: m.role === "user" ? "var(--primary-foreground)" : "var(--foreground)",
                    fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
                    ...(m.role === "user" ? { marginLeft: "auto", display: "block" } : {}),
                  }}
                >
                  {m.text || (m.role === "assistant" && busy ? "…" : "")}
                </div>
                {m.toolEvents && m.toolEvents.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                    {m.toolEvents.map((ev, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 11, color: "var(--muted-foreground)",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {ev.ok === undefined ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wrench className="w-3 h-3" style={{ color: ev.ok ? "#16a34a" : "#DC2626" }} />
                        )}
                        <span>Outil: {ev.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {m.writeOutcome && (
                  <div
                    style={{
                      marginTop: 6, padding: "6px 10px", borderRadius: 8,
                      display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                      background: m.writeOutcome.ok
                        ? "rgba(22,163,74,0.10)"
                        : "rgba(239,68,68,0.10)",
                      color: m.writeOutcome.ok ? "#166534" : "#991B1B",
                    }}
                  >
                    {m.writeOutcome.ok ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    <span>{m.writeOutcome.summary}</span>
                  </div>
                )}
              </div>
            ))}

            {pending && (
              <div
                style={{
                  marginTop: 4, padding: 14, borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(245,158,11,0.08)", color: "var(--foreground)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: "#B45309" }} />
                  <strong style={{ fontSize: 13 }}>Action à confirmer</strong>
                </div>
                {(() => {
                  const d = describeWriteAction(pending.name, pending.input);
                  return (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{d.title}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                        {d.bullets.map((b) => (
                          <div key={b.label} style={{ display: "flex", gap: 6 }}>
                            <span style={{ color: "var(--muted-foreground)", minWidth: 80 }}>{b.label}:</span>
                            <span style={{ color: "var(--foreground)" }}>{b.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                  <button
                    onClick={handleCancelAction}
                    disabled={busy}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: "1px solid var(--border)", background: "var(--card)",
                      color: "var(--foreground)", cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={busy}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: "none", background: "var(--primary)", color: "var(--primary-foreground)",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.10)",
                color: "#DC2626", fontSize: 12, marginTop: 8,
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", padding: 10 }}>
            {aiDisabled ? (
              <div
                style={{
                  padding: 12, borderRadius: 10,
                  background: "rgba(99,102,241,0.08)", color: "#4338CA",
                  fontSize: 12, textAlign: "center",
                }}
              >
                L'assistant IA n'est pas inclus dans votre plan Starter.{" "}
                <strong>Passez au plan Pro ou Business</strong> pour l'activer.
              </div>
            ) : quotaReached ? (
              <div
                style={{
                  padding: 12, borderRadius: 10,
                  background: "rgba(245,158,11,0.10)", color: "#B45309",
                  fontSize: 12, textAlign: "center",
                }}
              >
                Quota mensuel atteint ({usageThisMonth} / {aiQuota}).{" "}
                Passez au plan <strong>Business</strong> pour un accès illimité.
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Votre question…"
                  rows={1}
                  style={{
                    flex: 1, resize: "none", maxHeight: 120,
                    padding: "9px 12px", borderRadius: 10,
                    border: "1px solid var(--border)", background: "var(--background)",
                    color: "var(--foreground)", fontSize: 13, outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: "none",
                    background: busy || !input.trim() ? "var(--border)" : "var(--primary)",
                    color: busy || !input.trim() ? "var(--muted-foreground)" : "var(--primary-foreground)",
                    cursor: busy || !input.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
            {!aiDisabled && aiQuota !== null && (
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "right", marginTop: 6 }}>
                {usageThisMonth} / {aiQuota} questions ce mois
              </div>
            )}
            {!aiDisabled && aiQuota === null && (
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "right", marginTop: 6 }}>
                Plan Business — questions illimitées
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
