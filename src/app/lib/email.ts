import { supabase } from "./supabase";
import type { Building, Tenant } from "../utils/storage";
import { getLandlordInfo } from "./landlord";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  replyTo?: string;
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
      Email envoyé par ${footerName} via Palier.
    </p>
  </div>
</body></html>`;
}

/* ─── Escalated reminders (chain CO 257d) ──────────────────────── */

export type ReminderStageKey = "rappel-1" | "rappel-2" | "mise-en-demeure";

export async function sendReminderForStage(
  stage: ReminderStageKey,
  tenant: Tenant,
  building: Building,
  period: string,
): Promise<void> {
  const total = (Number(tenant.rentNet) || 0) + (Number(tenant.charges) || 0);
  const currency = building.currency ?? "CHF";
  const landlord = getLandlordInfo();
  const fromName = landlord.name || "Votre régie";
  const periodLabel = formatPeriod(period);
  const firstName = tenant.name.split(" ")[0];

  let subject: string;
  let bodyHtml: string;

  if (stage === "rappel-1") {
    subject = `Rappel : loyer ${periodLabel}`;
    bodyHtml = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Rappel de loyer</h2>
      <p>Bonjour ${firstName},</p>
      <p>Nous n'avons pas encore reçu le paiement du loyer de <strong>${periodLabel}</strong> pour votre logement situé au <strong>${building.address}</strong>.</p>
      <p style="font-size:24px;font-weight:600;color:#111827;margin:24px 0;">${formatAmount(total, currency)}</p>
      <p>Merci de procéder au virement dans les meilleurs délais. Si le paiement a déjà été effectué, merci d'ignorer ce message.</p>
      <p style="margin-top:24px;">Cordialement,<br/>${fromName}</p>`;
  } else if (stage === "rappel-2") {
    subject = `2ème rappel : loyer ${periodLabel} en souffrance`;
    bodyHtml = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#B45309;">Deuxième rappel — paiement en souffrance</h2>
      <p>Bonjour ${firstName},</p>
      <p>Malgré notre premier rappel, le loyer de <strong>${periodLabel}</strong> n'a toujours pas été réglé. Nous vous prions de régulariser cette situation <strong>sous 8 jours</strong>.</p>
      <p style="font-size:24px;font-weight:600;color:#B45309;margin:24px 0;">${formatAmount(total, currency)}</p>
      <p>À défaut de paiement dans ce délai, nous nous verrons contraints de vous adresser une <strong>mise en demeure formelle</strong> au sens de l'art. 257d CO, qui fait courir un délai légal de 30 jours au terme duquel une résiliation anticipée du bail peut être prononcée.</p>
      <p>Si vous rencontrez des difficultés, contactez-nous rapidement pour trouver un arrangement.</p>
      <p style="margin-top:24px;">Cordialement,<br/>${fromName}</p>`;
  } else {
    // mise-en-demeure
    subject = `Mise en demeure — loyer ${periodLabel} (art. 257d CO)`;
    bodyHtml = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#991B1B;">MISE EN DEMEURE</h2>
      <p>Bonjour ${firstName},</p>
      <p>Nous constatons qu'en dépit de nos rappels, le loyer de <strong>${periodLabel}</strong> (${formatAmount(total, currency)}) pour votre logement situé au <strong>${building.address}</strong> demeure impayé.</p>
      <p>Nous vous mettons formellement en demeure, au sens de l'<strong>article 257d du Code des obligations</strong>, de régler l'intégralité du montant dû <strong>dans un délai de 30 jours</strong> à compter de la réception de la présente.</p>
      <p style="font-size:24px;font-weight:700;color:#991B1B;margin:24px 0;">${formatAmount(total, currency)}</p>
      <p>À défaut de paiement intégral dans ce délai, nous prononcerons la <strong>résiliation anticipée de votre bail</strong> avec un préavis minimum de 30 jours pour la fin d'un mois, conformément à l'art. 257d al. 2 CO, et engagerons les démarches nécessaires (poursuite, procédure d'évacuation).</p>
      <p>Nous espérons vivement ne pas devoir en arriver à cette extrémité et restons à disposition pour discuter d'un éventuel arrangement.</p>
      <p style="margin-top:24px;">Cordialement,<br/>${fromName}</p>`;
  }

  const html = shell(bodyHtml, fromName);

  await sendEmail({
    to: tenant.email,
    subject,
    html,
    senderName: landlord.name || undefined,
    replyTo: landlord.email || undefined,
  });
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
    senderName: landlord.name || undefined,
    replyTo: landlord.email || undefined,
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
    senderName: landlord.name || undefined,
    replyTo: landlord.email || undefined,
  });
}
