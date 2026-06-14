"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  createTransactionSchema,
  type CreateTransactionFormInput,
} from "@/lib/validation/ledger";
import {
  createTransaction,
  softDeleteTransaction,
} from "@/server/dal/transactions";
import { requireSpaceMember } from "@/server/dal/context";
import { parseMoney } from "@/lib/money";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export interface ActionResult {
  ok?: true;
  error?: string;
}

function revalidateSpace(spaceId: string): void {
  revalidatePath(`/${spaceId}/transactions`);
  revalidatePath(`/${spaceId}/dashboard`);
  revalidatePath(`/${spaceId}/accounts`);
}

export async function createTransactionAction(
  spaceId: string,
  input: CreateTransactionFormInput,
): Promise<ActionResult> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  let cents: number;
  try {
    cents = parseMoney(parsed.data.amount, "EUR").amount;
  } catch {
    return { error: "Importo non valido" };
  }
  if (cents <= 0) {
    return { error: "L'importo deve essere maggiore di zero" };
  }

  await createTransaction(spaceId, {
    type: parsed.data.type,
    accountId: parsed.data.accountId,
    amount: cents,
    valueDate: parsed.data.valueDate,
    categoryId: parsed.data.categoryId || undefined,
    payee: parsed.data.payee || undefined,
    note: parsed.data.note || undefined,
    counterAccountId: parsed.data.counterAccountId || undefined,
    attachmentId: parsed.data.attachmentId || undefined,
    tagNames: parsed.data.tags,
  });

  revalidateSpace(spaceId);
  return { ok: true };
}

export async function deleteTransactionAction(
  spaceId: string,
  txId: string,
): Promise<ActionResult> {
  const ctx = await requireSpaceMember(spaceId, "member");
  await softDeleteTransaction(spaceId, txId);

  const h = await headers();
  await writeAuditLog({
    action: "data.deleted",
    actorUserId: ctx.userId,
    organizationId: spaceId,
    entityType: "transaction",
    entityId: txId,
    ip: getClientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  revalidateSpace(spaceId);
  return { ok: true };
}
