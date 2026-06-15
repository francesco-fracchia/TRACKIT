import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { financialAccount, transaction, type AccountType } from "@/db/schema";
import { computeAccountBalances } from "@/server/services/balances";
import { requireSpaceMember } from "./context";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  /** Saldo corrente in centesimi (iniziale + transazioni). */
  balance: number;
  archivedAt: Date | null;
}

/**
 * Conti dello spazio con saldo calcolato. Recupera le transazioni non
 * cancellate dello spazio una volta sola e calcola i saldi in memoria.
 */
export async function listAccounts(
  spaceId: string,
  options: { includeArchived?: boolean } = {},
): Promise<AccountWithBalance[]> {
  await requireSpaceMember(spaceId);

  const accounts = await db
    .select()
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.organizationId, spaceId),
        isNull(financialAccount.deletedAt),
      ),
    );

  const txs = await db
    .select({
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.accountId,
      counterAccountId: transaction.counterAccountId,
      counterAmount: transaction.counterAmount,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, spaceId),
        isNull(transaction.deletedAt),
        // I movimenti "solo storico" non incidono sul saldo.
        eq(transaction.excludeFromBalance, false),
      ),
    );

  const balances = computeAccountBalances(
    accounts.map((a) => ({ id: a.id, initialBalance: a.initialBalance })),
    txs,
  );

  return accounts
    .filter((a) => options.includeArchived || !a.archivedAt)
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      initialBalance: a.initialBalance,
      balance: balances.get(a.id) ?? a.initialBalance,
      archivedAt: a.archivedAt,
    }));
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
}

/** Crea un conto. Richiede ruolo >= member (viewer è in sola lettura). */
export async function createAccount(
  spaceId: string,
  input: CreateAccountInput,
): Promise<string> {
  await requireSpaceMember(spaceId, "member");
  const rows = await db
    .insert(financialAccount)
    .values({
      organizationId: spaceId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      initialBalance: input.initialBalance,
    })
    .returning({ id: financialAccount.id });
  return rows[0]!.id;
}

/** Soft-delete di un conto (richiede ruolo >= admin per azioni distruttive). */
export async function softDeleteAccount(
  spaceId: string,
  accountId: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "admin");
  await db
    .update(financialAccount)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.organizationId, spaceId),
      ),
    );
}

/** Elenco minimale dei conti (per le select nei form). */
export async function listAccountOptions(
  spaceId: string,
): Promise<{ id: string; name: string; currency: string }[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: financialAccount.id,
      name: financialAccount.name,
      currency: financialAccount.currency,
    })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.organizationId, spaceId),
        isNull(financialAccount.deletedAt),
        isNull(financialAccount.archivedAt),
      ),
    );
}
