import { z } from "zod";

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(80),
  targetAmount: z.string().trim().min(1, "Inserisci l'obiettivo"),
  currentAmount: z.string().trim().default("0"),
  linkedAccountId: z.string().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});
export type CreateGoalFormInput = z.input<typeof createGoalSchema>;

export const createLiabilitySchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(80),
  balance: z.string().trim().min(1, "Inserisci l'importo"),
});
export type CreateLiabilityFormInput = z.input<typeof createLiabilitySchema>;
