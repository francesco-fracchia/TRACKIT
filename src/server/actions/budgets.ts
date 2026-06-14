"use server";

import { revalidatePath } from "next/cache";
import {
  upsertBudgetSchema,
  type UpsertBudgetFormInput,
} from "@/lib/validation/budget";
import { upsertBudget, deleteBudget } from "@/server/dal/budgets";
import { parseMoney } from "@/lib/money";

export interface ActionResult {
  ok?: true;
  error?: string;
}

export async function upsertBudgetAction(
  spaceId: string,
  input: UpsertBudgetFormInput,
): Promise<ActionResult> {
  const parsed = upsertBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  let cents: number;
  try {
    cents = parseMoney(parsed.data.amount, "EUR").amount;
  } catch {
    return { error: "Importo non valido" };
  }
  if (cents <= 0) return { error: "L'importo deve essere maggiore di zero" };

  await upsertBudget(spaceId, {
    categoryId: parsed.data.categoryId,
    periodType: parsed.data.periodType,
    amount: cents,
    rollover: parsed.data.rollover,
  });

  revalidatePath(`/${spaceId}/budgets`);
  return { ok: true };
}

export async function deleteBudgetAction(
  spaceId: string,
  budgetId: string,
): Promise<ActionResult> {
  await deleteBudget(spaceId, budgetId);
  revalidatePath(`/${spaceId}/budgets`);
  return { ok: true };
}
