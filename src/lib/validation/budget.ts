import { z } from "zod";

export const BUDGET_PERIOD_VALUES = ["monthly", "annual"] as const;

export const upsertBudgetSchema = z.object({
  categoryId: z.string().min(1, "Seleziona una categoria"),
  periodType: z.enum(BUDGET_PERIOD_VALUES),
  amount: z.string().trim().min(1, "Inserisci un importo"),
  rollover: z.boolean().default(false),
});
export type UpsertBudgetFormInput = z.input<typeof upsertBudgetSchema>;
