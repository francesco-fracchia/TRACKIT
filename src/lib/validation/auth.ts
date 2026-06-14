import { z } from "zod";

/**
 * Schemi di validazione per l'autenticazione, condivisi tra client (form) e
 * server. Unica fonte di verità per le regole (es. lunghezza minima password).
 */

export const passwordSchema = z
  .string()
  .min(10, "La password deve avere almeno 10 caratteri")
  .max(128, "Password troppo lunga");

export const emailSchema = z
  .email("Email non valida")
  .max(255)
  .transform((v) => v.trim().toLowerCase());

export const signUpSchema = z.object({
  name: z.string().min(1, "Inserisci un nome").max(100),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Inserisci la password"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const requestResetSchema = z.object({
  email: emailSchema,
});
export type RequestResetInput = z.infer<typeof requestResetSchema>;

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Il codice è di 6 cifre"),
});
export type TotpInput = z.infer<typeof totpSchema>;
