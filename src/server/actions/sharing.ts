"use server";

import { revalidatePath } from "next/cache";
import {
  createSharedExpenseSchema,
  recordSettlementSchema,
  type CreateSharedExpenseInput,
  type RecordSettlementInput,
} from "@/lib/validation/sharing";
import {
  createSharedExpense,
  deleteSharedExpense,
  recordSettlement,
} from "@/server/dal/sharing";
import { parseMoney } from "@/lib/money";
import { splitByWeights } from "@/server/services/split";
import type { SplitInput as DalSplitInput } from "@/server/dal/sharing";

export interface ActionResult {
  ok?: true;
  error?: string;
}

export async function createSharedExpenseAction(
  spaceId: string,
  input: CreateSharedExpenseInput,
): Promise<ActionResult> {
  const parsed = createSharedExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const data = parsed.data;

  let total: number;
  try {
    total = parseMoney(data.total, "EUR").amount;
  } catch {
    return { error: "Totale non valido" };
  }
  if (total <= 0) return { error: "Il totale deve essere maggiore di zero" };

  let splits: DalSplitInput[];

  if (data.mode === "equal") {
    const weights = data.participants.map((p) => ({
      userId: p.userId,
      weight: 1,
    }));
    splits = splitByWeights(total, weights).map((s) => ({
      userId: s.userId,
      shareKind: "amount" as const,
      shareValue: s.amount,
      computedAmount: s.amount,
    }));
  } else if (data.mode === "percent") {
    const percents = data.participants.map((p) => Number(p.value));
    if (percents.some((n) => !Number.isFinite(n) || n < 0)) {
      return { error: "Percentuali non valide" };
    }
    const sumPct = percents.reduce((s, n) => s + n, 0);
    if (Math.round(sumPct) !== 100) {
      return { error: "Le percentuali devono sommare a 100" };
    }
    const computed = splitByWeights(
      total,
      data.participants.map((p, i) => ({ userId: p.userId, weight: percents[i]! })),
    );
    splits = computed.map((s, i) => ({
      userId: s.userId,
      shareKind: "percent" as const,
      shareValue: Math.round(percents[i]!),
      computedAmount: s.amount,
    }));
  } else {
    // amount: importi espliciti per partecipante.
    const amounts: number[] = [];
    for (const p of data.participants) {
      try {
        amounts.push(parseMoney(p.value ?? "0", "EUR").amount);
      } catch {
        return { error: "Importo partecipante non valido" };
      }
    }
    if (amounts.reduce((s, n) => s + n, 0) !== total) {
      return { error: "La somma delle quote deve corrispondere al totale" };
    }
    splits = data.participants.map((p, i) => ({
      userId: p.userId,
      shareKind: "amount" as const,
      shareValue: amounts[i]!,
      computedAmount: amounts[i]!,
    }));
  }

  await createSharedExpense(spaceId, {
    description: data.description,
    totalAmount: total,
    paidBy: data.paidBy,
    date: data.date,
    splits,
  });

  revalidatePath(`/${spaceId}/shared`);
  return { ok: true };
}

export async function deleteSharedExpenseAction(
  spaceId: string,
  id: string,
): Promise<ActionResult> {
  await deleteSharedExpense(spaceId, id);
  revalidatePath(`/${spaceId}/shared`);
  return { ok: true };
}

export async function recordSettlementAction(
  spaceId: string,
  input: RecordSettlementInput,
): Promise<ActionResult> {
  const parsed = recordSettlementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  let amount: number;
  try {
    amount = parseMoney(parsed.data.amount, "EUR").amount;
  } catch {
    return { error: "Importo non valido" };
  }
  if (amount <= 0) return { error: "L'importo deve essere maggiore di zero" };
  if (parsed.data.fromUser === parsed.data.toUser) {
    return { error: "Pagatore e ricevente devono essere diversi" };
  }

  await recordSettlement(spaceId, {
    fromUser: parsed.data.fromUser,
    toUser: parsed.data.toUser,
    amount,
    date: parsed.data.date,
    note: parsed.data.note || undefined,
  });

  revalidatePath(`/${spaceId}/shared`);
  return { ok: true };
}
