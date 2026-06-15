import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

/**
 * Restituisce il transporter SMTP se configurato, altrimenti null.
 * Provider-agnostico: funziona con qualunque SMTP gratuito (Brevo, Gmail,
 * Resend SMTP, …) impostando SMTP_HOST/PORT/USER/PASSWORD.
 */
function getTransporter(): Transporter | null {
  if (!serverEnv.SMTP_HOST || !serverEnv.SMTP_USER || !serverEnv.SMTP_PASSWORD) {
    return null;
  }
  if (!transporter) {
    const port = serverEnv.SMTP_PORT ?? 587;
    transporter = nodemailer.createTransport({
      host: serverEnv.SMTP_HOST,
      port,
      secure: port === 465, // 465 = SMTPS; 587/2525 = STARTTLS
      auth: { user: serverEnv.SMTP_USER, pass: serverEnv.SMTP_PASSWORD },
    });
  }
  return transporter;
}

/**
 * Invio email (verifica, reset, inviti). Se l'SMTP non è configurato, logga in
 * console (utile in dev) senza far fallire l'operazione chiamante.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const mailer = getTransporter();

  if (!mailer) {
    console.info(
      `\n[email] (SMTP non configurato — log)\n  from: ${serverEnv.EMAIL_FROM}\n  to: ${message.to}\n  subject: ${message.subject}\n  ${message.text}\n`,
    );
    return;
  }

  try {
    await mailer.sendMail({
      from: serverEnv.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (err) {
    console.error("[email] invio fallito:", err);
    throw err;
  }
}
