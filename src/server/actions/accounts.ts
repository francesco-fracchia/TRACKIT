"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  createAccountSchema,
  type CreateAccountFormInput,
} from "@/lib/validation/ledger";
import { createAccount, softDeleteAccount } from "@/server/dal/accounts";
import { parseMoney } from "@/lib/money";
import { writeAuditLog } from "@/lib/audit";
import { requireSpaceMember } from "@/server/dal/context";
import { getClientIp } from "@/lib/request";

export interface ActionResult {
  ok?: true;
  error?: string;
}

export async function createAccountAction(
  spaceId: string,
  input: CreateAccountFormInput,
): Promise<ActionResult> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  let initialCents = 0;
  try {
    initialCents =
      parsed.data.initialBalance.trim() === ""
        ? 0
        : parseMoney(parsed.data.initialBalance, parsed.data.currency).amount;
  } catch {
    return { error: "Saldo iniziale non valido" };
  }

  await createAccount(spaceId, {
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    initialBalance: initialCents,
  });

  revalidatePath(`/${spaceId}/accounts`);
  revalidatePath(`/${spaceId}/dashboard`);
  return { ok: true };
}

export async function deleteAccountAction(
  spaceId: string,
  accountId: string,
): Promise<ActionResult> {
  const ctx = await requireSpaceMember(spaceId, "admin");
  await softDeleteAccount(spaceId, accountId);

  const h = await headers();
  await writeAuditLog({
    action: "data.deleted",
    actorUserId: ctx.userId,
    organizationId: spaceId,
    entityType: "financial_account",
    entityId: accountId,
    ip: getClientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  revalidatePath(`/${spaceId}/accounts`);
  revalidatePath(`/${spaceId}/dashboard`);
  return { ok: true };
}
