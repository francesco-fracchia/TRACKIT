import { z } from "zod";

export const ACCOUNT_TYPE_VALUES = [
  "bank",
  "cash",
  "card",
  "ewallet",
  "other",
] as const;

const currencyField = z
  .string()
  .trim()
  .length(3, "Codice valuta a 3 lettere")
  .transform((v) => v.toUpperCase());

/** Importo come stringa (locale IT): convertito in centesimi lato server. */
const amountStringField = z
  .string()
  .trim()
  .min(1, "Inserisci un importo");

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(80),
  type: z.enum(ACCOUNT_TYPE_VALUES),
  currency: currencyField,
  // Saldo iniziale opzionale (default 0); parsing monetario lato server.
  initialBalance: z.string().trim().default("0"),
});
export type CreateAccountFormInput = z.input<typeof createAccountSchema>;

export const TRANSACTION_TYPE_VALUES = [
  "income",
  "expense",
  "transfer",
] as const;

export const createTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPE_VALUES),
    accountId: z.string().min(1, "Seleziona un conto"),
    amount: amountStringField,
    valueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
    categoryId: z.string().optional(),
    payee: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
    tags: z.array(z.string()).optional(),
    attachmentId: z.string().optional(),
    // Solo per i trasferimenti:
    counterAccountId: z.string().optional(),
  })
  .refine(
    (d) => d.type !== "transfer" || (d.counterAccountId && d.counterAccountId !== d.accountId),
    {
      message: "Per un trasferimento scegli un conto destinazione diverso",
      path: ["counterAccountId"],
    },
  );
export type CreateTransactionFormInput = z.input<typeof createTransactionSchema>;
