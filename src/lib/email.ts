import { serverEnv } from "@/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Invio email (verifica, reset, inviti).
 *
 * M0: nessun provider configurato → le email vengono loggate in console.
 * L'integrazione con un provider SMTP/transactional reale è un servizio terzo
 * e verrà aggiunta SOLO dopo conferma esplicita (vedi DECISIONS / ROADMAP).
 * La firma di questa funzione è il punto di estensione: il resto del codice
 * non cambierà.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  console.info(
    `\n[email] (provider non configurato — log)\n  from: ${serverEnv.EMAIL_FROM}\n  to: ${message.to}\n  subject: ${message.subject}\n  ${message.text}\n`,
  );
}
