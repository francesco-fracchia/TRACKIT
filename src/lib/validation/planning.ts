import { z } from "zod";
import { FREQUENCIES } from "@/lib/recurrence";
import { TRANSACTION_TYPE_VALUES } from "./ledger";

export const RECURRING_MODE_VALUES = ["auto_post", "suggest"] as const;

export const createRecurringSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPE_VALUES),
    accountId: z.string().min(1, "Seleziona un conto"),
    amount: z.string().trim().min(1, "Inserisci un importo"),
    frequency: z.enum(FREQUENCIES),
    interval: z.coerce.number().int().min(1).max(365),
    dtstart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
    mode: z.enum(RECURRING_MODE_VALUES),
    categoryId: z.string().optional(),
    counterAccountId: z.string().optional(),
    payee: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (d) =>
      d.type !== "transfer" ||
      (d.counterAccountId && d.counterAccountId !== d.accountId),
    {
      message: "Per un trasferimento scegli un conto destinazione diverso",
      path: ["counterAccountId"],
    },
  );
export type CreateRecurringFormInput = z.input<typeof createRecurringSchema>;
