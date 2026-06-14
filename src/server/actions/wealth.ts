"use server";

import { revalidatePath } from "next/cache";
import {
  createGoalSchema,
  createLiabilitySchema,
  type CreateGoalFormInput,
  type CreateLiabilityFormInput,
} from "@/lib/validation/wealth";
import {
  createGoal,
  deleteGoal,
  setGoalCurrent,
  createLiability,
  deleteLiability,
  createSnapshot,
} from "@/server/dal/wealth";
import { getSpace } from "@/server/dal/spaces";
import { parseMoney } from "@/lib/money";

export interface ActionResult {
  ok?: true;
  error?: string;
}

function parseCents(input: string, allowZero = false): number | null {
  try {
    const cents = input.trim() === "" ? 0 : parseMoney(input, "EUR").amount;
    if (!allowZero && cents <= 0) return null;
    if (cents < 0) return null;
    return cents;
  } catch {
    return null;
  }
}

export async function createGoalAction(
  spaceId: string,
  input: CreateGoalFormInput,
): Promise<ActionResult> {
  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const target = parseCents(parsed.data.targetAmount);
  if (target === null) return { error: "Obiettivo non valido" };
  const current = parseCents(parsed.data.currentAmount ?? "0", true) ?? 0;

  await createGoal(spaceId, {
    name: parsed.data.name,
    targetAmount: target,
    currentAmount: current,
    linkedAccountId: parsed.data.linkedAccountId || undefined,
    targetDate: parsed.data.targetDate || undefined,
  });
  revalidatePath(`/${spaceId}/goals`);
  return { ok: true };
}

export async function setGoalCurrentAction(
  spaceId: string,
  goalId: string,
  amount: string,
): Promise<ActionResult> {
  const cents = parseCents(amount, true);
  if (cents === null) return { error: "Importo non valido" };
  await setGoalCurrent(spaceId, goalId, cents);
  revalidatePath(`/${spaceId}/goals`);
  return { ok: true };
}

export async function deleteGoalAction(
  spaceId: string,
  goalId: string,
): Promise<ActionResult> {
  await deleteGoal(spaceId, goalId);
  revalidatePath(`/${spaceId}/goals`);
  return { ok: true };
}

export async function createLiabilityAction(
  spaceId: string,
  input: CreateLiabilityFormInput,
): Promise<ActionResult> {
  const parsed = createLiabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const balance = parseCents(parsed.data.balance);
  if (balance === null) return { error: "Importo non valido" };

  await createLiability(spaceId, { name: parsed.data.name, balance });
  revalidatePath(`/${spaceId}/net-worth`);
  return { ok: true };
}

export async function deleteLiabilityAction(
  spaceId: string,
  id: string,
): Promise<ActionResult> {
  await deleteLiability(spaceId, id);
  revalidatePath(`/${spaceId}/net-worth`);
  return { ok: true };
}

export async function createSnapshotAction(
  spaceId: string,
): Promise<ActionResult> {
  const space = await getSpace(spaceId);
  const today = new Date().toISOString().slice(0, 10);
  await createSnapshot(spaceId, space.baseCurrency, today);
  revalidatePath(`/${spaceId}/net-worth`);
  return { ok: true };
}
