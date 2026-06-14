import "server-only";
import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  like,
  lte,
  or,
  inArray,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  attachment,
  category,
  financialAccount,
  transaction,
  transactionTag,
  tag,
  type TransactionType,
} from "@/db/schema";
import { ForbiddenError, requireSpaceMember } from "./context";
import { ensureTags } from "./tags";
import { attachmentBelongsToSpace } from "./attachments";

export interface CreateTransactionInput {
  type: TransactionType;
  accountId: string;
  amount: number; // centesimi, positivo
  valueDate: string; // YYYY-MM-DD
  categoryId?: string | undefined;
  payee?: string | undefined;
  note?: string | undefined;
  counterAccountId?: string | undefined;
  attachmentId?: string | undefined;
  tagNames?: readonly string[] | undefined;
}

async function assertAccountInSpace(
  spaceId: string,
  accountId: string,
): Promise<string> {
  const rows = await db
    .select({ currency: financialAccount.currency })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.organizationId, spaceId),
        isNull(financialAccount.deletedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    throw new ForbiddenError("Conto non valido per questo spazio");
  }
  return rows[0].currency;
}

/** Crea una transazione (entrata/uscita/trasferimento). Ruolo >= member. */
export async function createTransaction(
  spaceId: string,
  input: CreateTransactionInput,
): Promise<string> {
  const ctx = await requireSpaceMember(spaceId, "member");

  const currency = await assertAccountInSpace(spaceId, input.accountId);

  let counterAccountId: string | null = null;
  let counterAmount: number | null = null;
  if (input.type === "transfer") {
    if (!input.counterAccountId || input.counterAccountId === input.accountId) {
      throw new ForbiddenError("Conto destinazione non valido");
    }
    await assertAccountInSpace(spaceId, input.counterAccountId);
    counterAccountId = input.counterAccountId;
    // M1: trasferimenti nella stessa valuta → counterAmount = amount.
    counterAmount = input.amount;
  }

  // La categoria, se indicata, deve appartenere allo spazio.
  let categoryId: string | null = null;
  if (input.categoryId) {
    const cat = await db
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.id, input.categoryId),
          eq(category.organizationId, spaceId),
        ),
      )
      .limit(1);
    if (!cat[0]) throw new ForbiddenError("Categoria non valida");
    categoryId = input.categoryId;
  }

  // L'allegato, se indicato, deve appartenere allo spazio.
  let attachmentId: string | null = null;
  if (input.attachmentId) {
    if (!(await attachmentBelongsToSpace(spaceId, input.attachmentId))) {
      throw new ForbiddenError("Allegato non valido");
    }
    attachmentId = input.attachmentId;
  }

  const rows = await db
    .insert(transaction)
    .values({
      organizationId: spaceId,
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      currency,
      valueDate: input.valueDate,
      categoryId,
      payee: input.payee ?? null,
      note: input.note ?? null,
      attachmentId,
      counterAccountId,
      counterAmount,
      createdBy: ctx.userId,
    })
    .returning({ id: transaction.id });

  const txId = rows[0]!.id;

  const tagNames = input.tagNames ?? [];
  if (tagNames.length > 0) {
    const tagIds = await ensureTags(spaceId, tagNames);
    if (tagIds.length > 0) {
      await db
        .insert(transactionTag)
        .values(tagIds.map((tagId) => ({ transactionId: txId, tagId })));
    }
  }

  return txId;
}

export interface TransactionFilter {
  accountId?: string | undefined;
  type?: TransactionType | undefined;
  categoryId?: string | undefined;
  from?: string | undefined; // YYYY-MM-DD
  to?: string | undefined;
  q?: string | undefined;
  page?: number;
  pageSize?: number;
}

export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  valueDate: string;
  payee: string | null;
  note: string | null;
  accountName: string | null;
  counterAccountName: string | null;
  categoryName: string | null;
  attachmentUrl: string | null;
  tags: string[];
}

export interface TransactionPage {
  rows: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Lista transazioni con filtri, ricerca testuale e paginazione. */
export async function listTransactions(
  spaceId: string,
  filter: TransactionFilter = {},
): Promise<TransactionPage> {
  await requireSpaceMember(spaceId);

  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const conditions = [
    eq(transaction.organizationId, spaceId),
    isNull(transaction.deletedAt),
  ];
  if (filter.accountId) conditions.push(eq(transaction.accountId, filter.accountId));
  if (filter.type) conditions.push(eq(transaction.type, filter.type));
  if (filter.categoryId) conditions.push(eq(transaction.categoryId, filter.categoryId));
  if (filter.from) conditions.push(gte(transaction.valueDate, filter.from));
  if (filter.to) conditions.push(lte(transaction.valueDate, filter.to));
  if (filter.q) {
    const pattern = `%${filter.q}%`;
    const search = or(
      like(transaction.payee, pattern),
      like(transaction.note, pattern),
    );
    if (search) conditions.push(search);
  }
  const where = and(...conditions);

  const counterAccount = alias(financialAccount, "counter_account");

  const [totalRow, rows] = await Promise.all([
    db.select({ value: count() }).from(transaction).where(where),
    db
      .select({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        valueDate: transaction.valueDate,
        payee: transaction.payee,
        note: transaction.note,
        accountName: financialAccount.name,
        counterAccountName: counterAccount.name,
        categoryName: category.name,
        attachmentUrl: attachment.storageKey,
      })
      .from(transaction)
      .leftJoin(
        financialAccount,
        eq(transaction.accountId, financialAccount.id),
      )
      .leftJoin(
        counterAccount,
        eq(transaction.counterAccountId, counterAccount.id),
      )
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .leftJoin(attachment, eq(transaction.attachmentId, attachment.id))
      .where(where)
      .orderBy(desc(transaction.valueDate), desc(transaction.bookedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  // Tag delle transazioni della pagina (una sola query).
  const ids = rows.map((r) => r.id);
  const tagsByTx = new Map<string, string[]>();
  if (ids.length > 0) {
    const tagRows = await db
      .select({
        transactionId: transactionTag.transactionId,
        name: tag.name,
      })
      .from(transactionTag)
      .innerJoin(tag, eq(transactionTag.tagId, tag.id))
      .where(inArray(transactionTag.transactionId, ids));
    for (const tr of tagRows) {
      const list = tagsByTx.get(tr.transactionId) ?? [];
      list.push(tr.name);
      tagsByTx.set(tr.transactionId, list);
    }
  }

  return {
    rows: rows.map((r) => ({ ...r, tags: tagsByTx.get(r.id) ?? [] })),
    total: totalRow[0]?.value ?? 0,
    page,
    pageSize,
  };
}

/** Soft-delete di una transazione. Ruolo >= member (chi crea può cancellare). */
export async function softDeleteTransaction(
  spaceId: string,
  txId: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(transaction)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(transaction.id, txId),
        eq(transaction.organizationId, spaceId),
      ),
    );
}
