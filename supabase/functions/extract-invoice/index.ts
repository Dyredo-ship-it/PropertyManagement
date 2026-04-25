// Deno Edge Function — Palier invoice extractor.
// Deploy: supabase functions deploy extract-invoice --no-verify-jwt
//
// Takes a single image (PDF or JPEG/PNG, base64-encoded) and asks
// Claude Vision to extract Swiss-invoice fields into a structured
// JSON payload. The client then pre-fills its accounting form with
// the result and runs duplicate detection locally before saving.
//
// Required secret: ANTHROPIC_API_KEY

import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are an expert Swiss invoice analyst. Extract the
following fields from the supplied invoice image / PDF and return a single
JSON object. Use null for any field you cannot read confidently.

Schema:
{
  "vendorName": string | null,
  "vendorAddress": string | null,
  "vendorVatNumber": string | null,
  "invoiceNumber": string | null,
  "invoiceDate": string | null,        // ISO YYYY-MM-DD
  "dueDate": string | null,            // ISO YYYY-MM-DD
  "currency": "CHF" | "EUR" | "USD" | null,
  "totalAmount": number | null,        // gross total, in the currency above
  "vatAmount": number | null,
  "vatRate": number | null,            // percentage (e.g. 8.1 for 8.1%)
  "iban": string | null,               // QR-bill IBAN if present
  "qrReference": string | null,        // Swiss QR reference / scan line
  "description": string | null,        // 1 short line for the accounting entry
  "suggestedAccount": number | null,   // best Swiss real-estate accounting account from the chart below
  "confidence": number,                 // 0-100, your confidence in the extraction
  "notes": string | null                // anything the user should double-check
}

Swiss real-estate accounting chart (use these account numbers ONLY):
- 201: Assurances
- 202: Entretien appartements
- 203: Entretien bâtiment
- 204: Entretien des espaces verts
- 205: Entretien machines immeubles
- 206: Frais d'exploitation et d'entretien du chauffage
- 207: Frais postaux
- 208: Annonces locatives / Publicité
- 209: Frais de gestion locative
- 210: Frais de conciergerie
- 211: Débiteurs locataires ouverts
- 212: Frais divers
- 213: Électricité
- 214: Honoraires de gestion
- 215: Dédommagements locataires pour travaux
- 216: Frais de buanderie
- 217: Gaz
- 218: Eau
- 219: Autres charges
- 301: Améliorations et rénovations (investissement)
- 302: Isolation (travaux d'enveloppe)

Output ONLY the JSON object — no commentary, no markdown fence.`;

interface RequestBody {
  imageDataUrl?: string;
  mimeType?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { imageDataUrl, mimeType: mimeOverride } = (await req.json()) as RequestBody;
    if (!imageDataUrl) {
      return jsonError("imageDataUrl is required", 400);
    }

    // Strip the "data:...;base64," prefix.
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return jsonError("imageDataUrl must be a base64 data URL", 400);
    }
    const mimeType = mimeOverride ?? match[1];
    const base64 = match[2];

    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"].includes(mimeType)) {
      return jsonError(`unsupported mimeType: ${mimeType}`, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return jsonError("ANTHROPIC_API_KEY not configured", 500);

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: mimeType === "application/pdf" ? "document" : "image",
            source: { type: "base64", media_type: mimeType, data: base64 },
          } as any,
          { type: "text", text: "Extract the invoice fields. Return JSON only." },
        ],
      }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    // Be liberal in what we accept — sometimes Claude wraps in fences despite the prompt.
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      return jsonError(`Could not parse JSON: ${(err as Error).message}\nGot: ${text.slice(0, 200)}`, 500);
    }

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-invoice error", err);
    return jsonError((err as Error).message ?? "unknown error", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
