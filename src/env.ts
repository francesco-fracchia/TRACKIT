import { z } from "zod";

/**
 * Validazione centralizzata delle variabili d'ambiente server-side (Zod).
 * Importare `serverEnv` garantisce che, se una variabile critica manca o è
 * malformata, il processo fallisca subito con un messaggio chiaro invece di
 * comportarsi in modo imprevedibile a runtime.
 *
 * NB: questo modulo è server-side. Non va importato da Client Component
 * (esporrebbe i segreti nel bundle). È usato anche da script Node (migrazioni,
 * CLI), quindi NON usa il marker `server-only` che li romperebbe.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL mancante"),
  TURSO_AUTH_TOKEN: z.string().default(""),

  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET mancante"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL deve essere un URL valido"),

  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY mancante"),

  // Verifica email obbligatoria (default true). Impostare "false" SOLO nei
  // test e2e per poter autenticarsi senza intercettare l'email.
  AUTH_REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .transform((v) => v !== "false"),

  // Disabilita i cookie Secure (SOLO per e2e su http://localhost in build prod).
  AUTH_DISABLE_SECURE_COOKIES: z.string().optional(),

  // Storage allegati (Vercel Blob). Se assente, gli upload sono disabilitati.
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  EMAIL_FROM: z.string().default("TRACKIT <no-reply@trackit.local>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = z.flattenError(parsed.error);
  console.error("❌ Variabili d'ambiente non valide:", issues.fieldErrors);
  throw new Error("Configurazione ambiente non valida — vedi log sopra.");
}

export const serverEnv = parsed.data;
