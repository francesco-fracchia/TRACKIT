"use server";

import { revalidatePath } from "next/cache";
import {
  createRecurringSchema,
  type CreateRecurringFormInput,
} from "@/lib/validation/planning";
import {
  createRecurring,
  deleteRecurring,
  postDueRecurring,
} from "@/server/dal/recurring";
import { parseMoney } from "@/lib/money";
import { buildRRuleString } from "@/lib/recurrence";

export interface ActionResult {
  ok?: true;
  error?: string;
  posted?: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createRecurringAction(
  spaceId: string,
  input: CreateRecurringFormInput,
): Promise<ActionResult> {
  const parsed = createRecurringSchema.safeParse(input);
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

  await createRecurring(spaceId, {
    accountId: parsed.data.accountId,
    type: parsed.data.type,
    amount: cents,
    categoryId: parsed.data.categoryId || undefined,
    counterAccountId: parsed.data.counterAccountId || undefined,
    payee: parsed.data.payee || undefined,
    note: parsed.data.note || undefined,
    rrule: buildRRuleString(parsed.data.frequency, parsed.data.interval),
    dtstart: parsed.data.dtstart,
    mode: parsed.data.mode,
  });

  revalidatePath(`/${spaceId}/planning`);
  return { ok: true };
}

export async function deleteRecurringAction(
  spaceId: string,
  id: string,
): Promise<ActionResult> {
  await deleteRecurring(spaceId, id);
  revalidatePath(`/${spaceId}/planning`);
  return { ok: true };
}

export async function postDueRecurringAction(
  spaceId: string,
): Promise<ActionResult> {
  const posted = await postDueRecurring(spaceId, today());
  revalidatePath(`/${spaceId}/planning`);
  revalidatePath(`/${spaceId}/transactions`);
  revalidatePath(`/${spaceId}/dashboard`);
  return { ok: true, posted };
}
