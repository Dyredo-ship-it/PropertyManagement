// Deno Edge Function — Palier AI assistant.
// Deploy: supabase functions deploy ai-assistant --no-verify-jwt
//
// Provider abstraction: the caller (or AI_PROVIDER env var) picks the
// backing LLM. Today we ship "claude" first; switching to Mistral is
// a one-line change (add its adapter below and set AI_PROVIDER=mistral).
//
// Required secrets:
//   ANTHROPIC_API_KEY  — when AI_PROVIDER=claude (default)
//   MISTRAL_API_KEY    — when AI_PROVIDER=mistral
//   SUPABASE_URL, SUPABASE_ANON_KEY — auto-injected

import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_TURNS = 8;

type ToolInput = Record<string, unknown>;
type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

/* ─── Tool definitions (Anthropic schema) ─────────────────── */

const TOOLS = [
  {
    name: "list_late_payments",
    description:
      "Liste les loyers impayés du mois courant (ou d'un mois spécifié) pour tous les immeubles de la régie. Utile pour répondre à 'qui n'a pas payé ?'.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Mois au format YYYY-MM. Défaut = mois courant." },
      },
    },
  },
  {
    name: "list_tenants",
    description:
      "Liste les locataires, optionnellement filtrés par nom d'immeuble et/ou statut (active, pending, ended).",
    input_schema: {
      type: "object",
      properties: {
        building: { type: "string", description: "Nom partiel de l'immeuble (optionnel)." },
        status: { type: "string", enum: ["active", "pending", "ended"] },
      },
    },
  },
  {
    name: "check_rent_status",
    description:
      "Pour un immeuble et un mois donnés, retourne la liste des locataires avec leur statut de paiement (payé / impayé).",
    input_schema: {
      type: "object",
      required: ["building", "month"],
      properties: {
        building: { type: "string", description: "Nom ou id de l'immeuble." },
        month: { type: "string", description: "Mois au format YYYY-MM (ex. 2026-02)." },
      },
    },
  },
  {
    name: "get_building",
    description: "Retourne les infos d'un immeuble (adresse, nombre d'unités, de locataires actifs, loyer total mensuel).",
    input_schema: {
      type: "object",
      required: ["name_or_id"],
      properties: { name_or_id: { type: "string" } },
    },
  },
  {
    name: "list_maintenance_requests",
    description:
      "Liste les demandes de maintenance ouvertes ou filtrées par statut.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "in-progress", "completed"] },
        building: { type: "string", description: "Nom partiel d'un immeuble (optionnel)." },
      },
    },
  },
  {
    name: "get_accounting_summary",
    description:
      "Résumé comptable: total des recettes, dépenses et solde pour une période donnée (mois ou année). Requiert l'accès Comptabilité.",
    input_schema: {
      type: "object",
      required: ["period"],
      properties: {
        building: { type: "string", description: "Nom partiel d'un immeuble (optionnel, sinon toute la régie)." },
        period: {
          type: "string",
          description: "YYYY-MM pour un mois, YYYY pour une année entière.",
        },
      },
    },
  },
  {
    name: "list_upcoming_lease_ends",
    description: "Liste les locataires dont le bail arrive à échéance dans les N mois à venir.",
    input_schema: {
      type: "object",
      properties: {
        within_months: { type: "number", description: "Nombre de mois (défaut 3)." },
      },
    },
  },
  {
    name: "search",
    description: "Recherche libre sur les immeubles et locataires par nom ou adresse.",
    input_schema: {
      type: "object",
      required: ["query"],
      properties: { query: { type: "string" } },
    },
  },
];

/* ─── Permission check helpers ────────────────────────────── */

interface CallerContext {
  userId: string;
  organizationId: string;
  isSuperAdmin: boolean;
  memberRole: string | null;
  permissions: Record<string, "none" | "read" | "write">;
}

const ROLE_PRESETS: Record<string, Record<string, "none" | "read" | "write">> = {
  admin: {
    dashboard: "write", buildings: "write", tenants: "write", requests: "write",
    interventions: "write", services: "write", calendar: "write", accounting: "write",
    analytics: "write", settings: "write", team: "none", billing: "none",
  },
  manager: {
    dashboard: "write", buildings: "write", tenants: "write", requests: "write",
    interventions: "write", services: "write", calendar: "write", accounting: "none",
    analytics: "none", settings: "read", team: "none", billing: "none",
  },
  accountant: {
    dashboard: "read", buildings: "read", tenants: "read", requests: "read",
    interventions: "read", services: "read", calendar: "read", accounting: "write",
    analytics: "write", settings: "read", team: "none", billing: "none",
  },
  viewer: {
    dashboard: "read", buildings: "read", tenants: "read", requests: "read",
    interventions: "read", services: "read", calendar: "read", accounting: "read",
    analytics: "read", settings: "read", team: "none", billing: "none",
  },
};

function can(ctx: CallerContext, feature: string): boolean {
  if (ctx.isSuperAdmin) return true;
  const override = ctx.permissions[feature];
  if (override) return override !== "none";
  if (!ctx.memberRole || ctx.memberRole === "tenant") return false;
  const preset = ROLE_PRESETS[ctx.memberRole];
  if (!preset) return false;
  return preset[feature] !== "none";
}

/* ─── Tool executors ──────────────────────────────────────── */

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function findBuilding(supabase: SupabaseClient, nameOrId: string) {
  // Try UUID first
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nameOrId)) {
    const { data } = await supabase.from("buildings").select("*").eq("id", nameOrId).maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase.from("buildings").select("*").ilike("name", `%${nameOrId}%`).limit(1);
  return (data && data[0]) || null;
}

async function executeTool(
  supabase: SupabaseClient,
  ctx: CallerContext,
  name: string,
  input: ToolInput,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "list_late_payments": {
        if (!can(ctx, "tenants")) return { ok: false, error: "Permission tenants manquante." };
        const month = (input.month as string) || currentMonth();
        const { data: tenants } = await supabase.from("tenants").select("*").eq("status", "active");
        const { data: txs } = await supabase
          .from("accounting_transactions")
          .select("description, date_payment, month, account_number, credit")
          .eq("account_number", 101)
          .eq("month", month);

        const paidLastNames = new Set<string>(
          (txs ?? [])
            .filter((t) => (t.credit ?? 0) > 0)
            .map((t) => (t.description ?? "").toLowerCase())
            .flatMap((d) => d.split(/\s+/)),
        );
        const late = (tenants ?? []).filter((t) => {
          const lastName = (t.name ?? "").toLowerCase().split(/\s+/).pop() ?? "";
          return lastName && !paidLastNames.has(lastName);
        });
        return {
          ok: true,
          data: {
            month,
            count: late.length,
            tenants: late.map((t) => ({
              id: t.id,
              name: t.name,
              email: t.email,
              building_id: t.building_id,
              unit: t.unit,
              rent_net: t.rent_net,
              charges: t.charges,
            })),
          },
        };
      }

      case "list_tenants": {
        if (!can(ctx, "tenants")) return { ok: false, error: "Permission tenants manquante." };
        let q = supabase.from("tenants").select("id, name, email, phone, unit, status, building_id");
        if (input.status) q = q.eq("status", input.status);
        if (input.building) {
          const b = await findBuilding(supabase, input.building as string);
          if (!b) return { ok: false, error: `Immeuble "${input.building}" introuvable.` };
          q = q.eq("building_id", b.id);
        }
        const { data, error } = await q.order("name");
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: { count: data?.length ?? 0, tenants: data ?? [] } };
      }

      case "check_rent_status": {
        if (!can(ctx, "tenants")) return { ok: false, error: "Permission tenants manquante." };
        const b = await findBuilding(supabase, input.building as string);
        if (!b) return { ok: false, error: `Immeuble "${input.building}" introuvable.` };
        const month = input.month as string;
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, name, unit, rent_net, charges, status")
          .eq("building_id", b.id)
          .eq("status", "active");
        const { data: txs } = await supabase
          .from("accounting_transactions")
          .select("description, credit, month, account_number")
          .eq("building_id", b.id)
          .eq("account_number", 101)
          .eq("month", month);

        const status = (tenants ?? []).map((t) => {
          const lastName = (t.name ?? "").toLowerCase().split(/\s+/).pop() ?? "";
          const paid = (txs ?? []).some(
            (tx) => (tx.credit ?? 0) > 0 && (tx.description ?? "").toLowerCase().includes(lastName),
          );
          return { name: t.name, unit: t.unit, rent: (t.rent_net ?? 0) + (t.charges ?? 0), paid };
        });
        return { ok: true, data: { building: b.name, month, tenants: status } };
      }

      case "get_building": {
        if (!can(ctx, "buildings")) return { ok: false, error: "Permission buildings manquante." };
        const b = await findBuilding(supabase, input.name_or_id as string);
        if (!b) return { ok: false, error: "Immeuble introuvable." };
        const { data: activeTenants } = await supabase
          .from("tenants")
          .select("id, rent_net, charges")
          .eq("building_id", b.id)
          .eq("status", "active");
        const totalRent = (activeTenants ?? []).reduce(
          (s, t) => s + (t.rent_net ?? 0) + (t.charges ?? 0),
          0,
        );
        return {
          ok: true,
          data: {
            id: b.id,
            name: b.name,
            address: b.address,
            currency: b.currency ?? "CHF",
            total_units: b.total_units ?? null,
            active_tenants: activeTenants?.length ?? 0,
            monthly_rent_chf: totalRent,
          },
        };
      }

      case "list_maintenance_requests": {
        if (!can(ctx, "requests")) return { ok: false, error: "Permission requests manquante." };
        let q = supabase.from("maintenance_requests").select(
          "id, title, description, status, priority, building_id, building_name, unit, tenant_name, created_at",
        );
        if (input.status) q = q.eq("status", input.status);
        if (input.building) {
          const b = await findBuilding(supabase, input.building as string);
          if (b) q = q.eq("building_id", b.id);
        }
        const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: { count: data?.length ?? 0, requests: data ?? [] } };
      }

      case "get_accounting_summary": {
        if (!can(ctx, "accounting")) return { ok: false, error: "Permission accounting manquante." };
        const period = input.period as string;
        let q = supabase.from("accounting_transactions").select("account_number, debit, credit, month");
        if (input.building) {
          const b = await findBuilding(supabase, input.building as string);
          if (b) q = q.eq("building_id", b.id);
        }
        if (period.length === 4) q = q.like("month", `${period}-%`); // year
        else q = q.eq("month", period); // month
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };

        let revenues = 0, expenses = 0, investments = 0, ownerPayments = 0;
        for (const tx of data ?? []) {
          const num = tx.account_number as number;
          const netCredit = (tx.credit ?? 0) - (tx.debit ?? 0);
          const netDebit = (tx.debit ?? 0) - (tx.credit ?? 0);
          if (num >= 101 && num < 200) revenues += netCredit;
          else if (num >= 201 && num < 300) expenses += netDebit;
          else if (num >= 301 && num < 400) investments += netDebit;
          else if (num >= 401 && num < 500) ownerPayments += netDebit;
        }
        return {
          ok: true,
          data: {
            period,
            currency: "CHF",
            revenues: Math.round(revenues * 100) / 100,
            expenses: Math.round(expenses * 100) / 100,
            investments: Math.round(investments * 100) / 100,
            owner_payments: Math.round(ownerPayments * 100) / 100,
            net: Math.round((revenues - expenses - investments) * 100) / 100,
          },
        };
      }

      case "list_upcoming_lease_ends": {
        if (!can(ctx, "tenants")) return { ok: false, error: "Permission tenants manquante." };
        const within = Number(input.within_months ?? 3);
        const now = new Date();
        const limit = new Date(now);
        limit.setMonth(limit.getMonth() + within);
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, email, unit, building_id, lease_end")
          .eq("status", "active")
          .gte("lease_end", now.toISOString().slice(0, 10))
          .lte("lease_end", limit.toISOString().slice(0, 10))
          .order("lease_end");
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: { count: data?.length ?? 0, tenants: data ?? [] } };
      }

      case "search": {
        const query = (input.query as string).trim();
        if (!query) return { ok: true, data: { buildings: [], tenants: [] } };
        const [bRes, tRes] = await Promise.all([
          can(ctx, "buildings")
            ? supabase.from("buildings").select("id, name, address").or(
                `name.ilike.%${query}%,address.ilike.%${query}%`,
              ).limit(10)
            : Promise.resolve({ data: [] as unknown[] }),
          can(ctx, "tenants")
            ? supabase.from("tenants").select("id, name, email, unit, building_id").or(
                `name.ilike.%${query}%,email.ilike.%${query}%,unit.ilike.%${query}%`,
              ).limit(10)
            : Promise.resolve({ data: [] as unknown[] }),
        ]);
        return { ok: true, data: { buildings: (bRes as any).data ?? [], tenants: (tRes as any).data ?? [] } };
      }

      default:
        return { ok: false, error: `Outil inconnu: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/* ─── Provider abstraction ────────────────────────────────── */

function buildSystemPrompt(ctx: CallerContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const accessDesc = ctx.isSuperAdmin
    ? "accès complet à toutes les données"
    : `rôle "${ctx.memberRole ?? "inconnu"}" avec accès limité selon ses permissions`;
  return `Tu es Palier AI, l'assistant intelligent d'une plateforme suisse de gestion immobilière.

L'utilisateur est un gestionnaire de régie avec ${accessDesc}. Son organisation a l'id ${ctx.organizationId}.
Date du jour: ${today}.

Règles:
- Réponds toujours en français, de manière concise et professionnelle.
- Utilise les outils à disposition pour trouver des informations réelles; ne devine jamais.
- Si un outil renvoie "permission manquante", explique-le gentiment à l'utilisateur.
- Quand tu listes des locataires ou transactions, présente les données lisiblement (listes courtes, tableaux compacts).
- Pour les montants, utilise toujours le format CHF (ex. "CHF 2'450.00").
- Si l'utilisateur demande une action d'écriture (envoyer un email, créer une demande, etc.), explique que tu ne peux que consulter des données pour l'instant, et que les actions seront disponibles prochainement.
- Limite-toi à ${MAX_TURNS} tours d'outils par réponse.`;
}

async function runClaude(
  messages: Array<{ role: "user" | "assistant"; content: unknown }>,
  ctx: CallerContext,
  supabase: SupabaseClient,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    send(controller, { type: "error", message: "ANTHROPIC_API_KEY manquant côté serveur." });
    return;
  }

  const client = new Anthropic({ apiKey });
  const workingMessages = [...messages];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: buildSystemPrompt(ctx),
      tools: TOOLS as any,
      messages: workingMessages as any,
    });

    // Emit any text blocks before tool use, then handle tools.
    const assistantContent: unknown[] = [];
    for (const block of response.content as any[]) {
      if (block.type === "text") {
        send(controller, { type: "text_delta", delta: block.text });
        assistantContent.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        send(controller, { type: "tool_use", name: block.name, input: block.input });
        assistantContent.push(block);
      }
    }

    workingMessages.push({ role: "assistant", content: assistantContent });

    if (response.stop_reason !== "tool_use") {
      break;
    }

    // Execute each tool call and append results.
    const toolResults: unknown[] = [];
    for (const block of response.content as any[]) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(supabase, ctx, block.name, block.input ?? {});
      send(controller, { type: "tool_result", tool_use_id: block.id, ok: result.ok });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    workingMessages.push({ role: "user", content: toolResults });
  }
}

function send(controller: ReadableStreamDefaultController<Uint8Array>, event: unknown) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(line));
}

/* ─── Handler ─────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, is_super_admin, member_role, permissions, role")
      .eq("id", userResp.user.id)
      .maybeSingle();

    if (!profile?.organization_id || profile.role === "tenant") {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: CallerContext = {
      userId: userResp.user.id,
      organizationId: profile.organization_id,
      isSuperAdmin: !!profile.is_super_admin,
      memberRole: profile.member_role ?? null,
      permissions: (profile.permissions ?? {}) as Record<string, "none" | "read" | "write">,
    };

    const body = await req.json();
    const messages = (body.messages ?? []) as Array<{ role: "user" | "assistant"; content: unknown }>;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const provider = (body.provider ?? Deno.env.get("AI_PROVIDER") ?? "claude").toLowerCase();
          if (provider === "claude") {
            await runClaude(messages, ctx, supabase, controller);
          } else {
            send(controller, { type: "error", message: `Provider "${provider}" non supporté pour l'instant.` });
          }
          send(controller, { type: "done" });
        } catch (err) {
          send(controller, { type: "error", message: (err as Error).message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
