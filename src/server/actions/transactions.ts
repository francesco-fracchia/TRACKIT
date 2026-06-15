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
import { grossFromNet } from "@/server/services/vat";
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

  // IVA: l'aliquota si applica solo a entrate/uscite (non ai trasferimenti).
  const rate =
    parsed.data.type !== "transfer" && parsed.data.vatRate
      ? Number(parsed.data.vatRate)
      : 0;
  const vatRate = Number.isFinite(rate) && rate > 0 ? Math.round(rate) : undefined;
  // Se l'importo è "IVA esclusa" (imponibile), il lordo che muove cassa è
  // imponibile + IVA. Memorizziamo sempre il LORDO come `amount`.
  const gross =
    vatRate && parsed.data.amountIsNet ? grossFromNet(cents, vatRate) : cents;

  await createTransaction(spaceId, {
    type: parsed.data.type,
    accountId: parsed.data.accountId,
    amount: gross,
    valueDate: parsed.data.valueDate,
    categoryId: parsed.data.categoryId || undefined,
    payee: parsed.data.payee || undefined,
    note: parsed.data.note || undefined,
    counterAccountId: parsed.data.counterAccountId || undefined,
    attachmentId: parsed.data.attachmentId || undefined,
    excludeFromBalance: parsed.data.excludeFromBalance ?? false,
    vatRate,
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
