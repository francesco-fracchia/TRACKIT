import { z } from "zod";

export const SPLIT_MODE_VALUES = ["equal", "percent", "amount"] as const;
export type SplitMode = (typeof SPLIT_MODE_VALUES)[number];

export const createSharedExpenseSchema = z.object({
  description: z.string().trim().min(1, "Inserisci una descrizione").max(120),
  total: z.string().trim().min(1, "Inserisci il totale"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  paidBy: z.string().min(1, "Indica chi ha pagato"),
  mode: z.enum(SPLIT_MODE_VALUES),
  participants: z
    .array(
      z.object({
        userId: z.string().min(1),
        value: z.string().optional(),
      }),
    )
    .min(1, "Seleziona almeno un partecipante"),
});
export type CreateSharedExpenseInput = z.infer<typeof createSharedExpenseSchema>;

export const recordSettlementSchema = z.object({
  fromUser: z.string().min(1),
  toUser: z.string().min(1),
  amount: z.string().trim().min(1, "Inserisci l'importo"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  note: z.string().trim().max(200).optional(),
});
export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;
