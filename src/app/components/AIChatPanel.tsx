import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Wrench, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  text: string;
  // Tool invocations that happened during this assistant turn — rendered
  // as small status lines so the user sees what the agent did.
  toolEvents?: { name: string; ok?: boolean }[];
}

interface StreamEvent {
  type: "text_delta" | "tool_use" | "tool_result" | "done" | "error";
  delta?: string;
  message?: string;
  name?: string;
  input?: unknown;
  ok?: boolean;
  tool_use_id?: string;
}

const SUGGESTIONS = [
  "Quels locataires n'ont pas payé leur loyer ce mois-ci ?",
  "Résume la comptabilité du dernier mois.",
  "Quels baux expirent dans les 3 prochains mois ?",
  "Liste les demandes de maintenance ouvertes.",
];

export function AIChatPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Tenants and non-admins don't get the assistant for now.
  const visible = !!user && user.role !== "tenant";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setInput("");

    const history = [...messages, { role: "user" as const, text: trimmed }];
    setMessages([...history, { role: "assistant", text: "", toolEvents: [] }]);
    setBusy(true);

    // Build the request body — only the textual turns for the LLM.
    const body = {
      messages: history.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.text }],
      })),
    };

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
        setMessages((prev) => prev.slice(0, -1));
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
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEvent = (event: StreamEvent) => {
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
        // Mark the last in-flight tool for this turn as ok/failed.
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

  if (!visible) return null;

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Assistant Palier"
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
                  Lecture seule pour l'instant
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {messages.length === 0 && !busy && (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10 }}>
                  Posez-moi une question sur votre régie.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        textAlign: "left", padding: "9px 12px", borderRadius: 10,
                        border: "1px solid var(--border)", background: "var(--background)",
                        color: "var(--foreground)", fontSize: 12, cursor: "pointer",
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
              </div>
            ))}

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
          </div>
        </div>
      )}
    </>
  );
}
