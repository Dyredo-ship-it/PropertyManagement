import { supabase } from "./supabase";
import type { Building, Tenant } from "../utils/storage";
import { getLandlordInfo } from "./landlord";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(args: SendEmailArgs): Promise<void> {
  const { error } = await supabase.functions.invoke("send-email", { body: args });
  if (error) throw error;
}

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  const idx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${FR_MONTHS[idx]} ${y}`;
}

function formatAmount(value: number, currency = "CHF"): string {
  return `${currency} ${value.toLocaleString("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shell(content: string, footerName: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E5E7EB;">
    ${content}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 12px;" />
    <p style="font-size:11px;color:#9CA3AF;margin:0;">
      Email envoyé par ${footerName} via ImmoStore.
    </p>
  </div>
</body></html>`;
}

/* ─── Rent reminder ─────────────────────────────────────────────── */

export async function sendRentReminder(
  tenant: Tenant,
  building: Building,
  period: string,
): Promise<void> {
  const total = (Number(tenant.rentNet) || 0) + (Number(tenant.charges) || 0);
  const currency = building.currency ?? "CHF";
  const landlord = getLandlordInfo();
  const fromName = landlord.name || "Votre régie";
  const periodLabel = formatPeriod(period);

  const html = shell(
    `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Rappel de loyer</h2>
    <p>Bonjour ${tenant.name.split(" ")[0]},</p>
    <p>
      Nous vous rappelons que le loyer du mois de <strong>${periodLabel}</strong>
      pour votre logement situé au <strong>${building.address}</strong> est en attente de paiement.
    </p>
    <p style="font-size:24px;font-weight:600;color:#111827;margin:24px 0;">
      ${formatAmount(total, currency)}
    </p>
    <p>
      Merci de procéder au virement dans les meilleurs délais. Si vous l'avez déjà effectué,
      merci d'ignorer ce message.
    </p>
    <p style="margin-top:24px;">Cordialement,<br/>${fromName}</p>
    `,
    fromName,
  );

  await sendEmail({
    to: tenant.email,
    subject: `Rappel : loyer ${periodLabel}`,
    html,
  });
}

/* ─── Lease renewal reminder ────────────────────────────────────── */

export async function sendLeaseEndReminder(
  tenant: Tenant,
  building: Building,
): Promise<void> {
  if (!tenant.leaseEnd) {
    throw new Error("Pas de date de fin de bail définie pour ce locataire.");
  }
  const landlord = getLandlordInfo();
  const fromName = landlord.name || "Votre régie";
  const endDate = new Date(tenant.leaseEnd).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const html = shell(
    `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Renouvellement de bail</h2>
    <p>Bonjour ${tenant.name.split(" ")[0]},</p>
    <p>
      Votre bail pour le logement situé au <strong>${building.address}</strong> arrive à échéance le
      <strong>${endDate}</strong>.
    </p>
    <p>
      Nous vous remercions de bien vouloir nous indiquer si vous souhaitez le renouveler ou
      donner votre congé selon les délais légaux applicables.
    </p>
    <p style="margin-top:24px;">Cordialement,<br/>${fromName}</p>
    `,
    fromName,
  );

  await sendEmail({
    to: tenant.email,
    subject: "Renouvellement de bail",
    html,
  });
}
