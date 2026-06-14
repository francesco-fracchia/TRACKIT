import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  expense_split,
  settlement,
  shared_expense,
  member,
  user,
  type ShareKind,
} from "@/db/schema";
import { requireSpaceMember, ForbiddenError } from "./context";
import {
  computeMemberBalances,
  minimizeSettlements,
  type ExpenseForBalance,
} from "@/server/services/split";

export interface SplitInput {
  userId: string;
  shareKind: ShareKind;
  shareValue: number;
  computedAmount: number;
}

export interface CreateSharedExpenseInput {
  description: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  splits: SplitInput[];
}

async function spaceMemberIds(spaceId: string): Promise<Set<string>> {
  const rows = await db
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, spaceId));
  return new Set(rows.map((r) => r.userId));
}

export async function createSharedExpense(
  spaceId: string,
  input: CreateSharedExpenseInput,
): Promise<string> {
  await requireSpaceMember(spaceId, "member");

  const sum = input.splits.reduce((s, x) => s + x.computedAmount, 0);
  if (sum !== input.totalAmount) {
    throw new ForbiddenError("La somma delle quote non corrisponde al totale");
  }
  // Tutti i partecipanti devono essere membri dello spazio.
  const members = await spaceMemberIds(spaceId);
  if (!members.has(input.paidBy)) {
    throw new ForbiddenError("Il pagatore non è membro dello spazio");
  }
  for (const s of input.splits) {
    if (!members.has(s.userId)) {
      throw new ForbiddenError("Un partecipante non è membro dello spazio");
    }
  }

  const rows = await db
    .insert(shared_expense)
    .values({
      organizationId: spaceId,
      description: input.description,
      totalAmount: input.totalAmount,
      paidBy: input.paidBy,
      date: input.date,
    })
    .returning({ id: shared_expense.id });
  const expenseId = rows[0]!.id;

  await db.insert(expense_split).values(
    input.splits.map((s) => ({
      sharedExpenseId: expenseId,
      userId: s.userId,
      shareKind: s.shareKind,
      shareValue: s.shareValue,
      computedAmount: s.computedAmount,
    })),
  );

  return expenseId;
}

export async function deleteSharedExpense(
  spaceId: string,
  id: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(shared_expense)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(shared_expense.id, id), eq(shared_expense.organizationId, spaceId)),
    );
}

export interface SharedExpenseRow {
  id: string;
  description: string;
  totalAmount: number;
  date: string;
  paidByName: string | null;
}

export async function listSharedExpenses(
  spaceId: string,
): Promise<SharedExpenseRow[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: shared_expense.id,
      description: shared_expense.description,
      totalAmount: shared_expense.totalAmount,
      date: shared_expense.date,
      paidByName: user.name,
    })
    .from(shared_expense)
    .leftJoin(user, eq(shared_expense.paidBy, user.id))
    .where(
      and(
        eq(shared_expense.organizationId, spaceId),
        isNull(shared_expense.deletedAt),
      ),
    )
    .orderBy(desc(shared_expense.date));
}

export interface MemberOption {
  userId: string;
  name: string;
}

export async function listSpaceMembersForSplit(
  spaceId: string,
): Promise<MemberOption[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({ userId: user.id, name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, spaceId));
}

export interface BalanceRow {
  userId: string;
  name: string;
  balance: number;
}
export interface SuggestionRow {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

/** Saldi reciproci + compensazioni minime suggerite per lo spazio. */
export async function getSharingOverview(spaceId: string): Promise<{
  balances: BalanceRow[];
  suggestions: SuggestionRow[];
}> {
  await requireSpaceMember(spaceId);

  const [expenses, members, settlements] = await Promise.all([
    db
      .select({
        id: shared_expense.id,
        paidBy: shared_expense.paidBy,
      })
      .from(shared_expense)
      .where(
        and(
          eq(shared_expense.organizationId, spaceId),
          isNull(shared_expense.deletedAt),
        ),
      ),
    listSpaceMembersForSplit(spaceId),
    db
      .select({
        from: settlement.fromUser,
        to: settlement.toUser,
        amount: settlement.amount,
      })
      .from(settlement)
      .where(eq(settlement.organizationId, spaceId)),
  ]);

  const expenseIds = expenses.map((e) => e.id);
  const splits = expenseIds.length
    ? await db
        .select({
          sharedExpenseId: expense_split.sharedExpenseId,
          userId: expense_split.userId,
          amount: expense_split.computedAmount,
        })
        .from(expense_split)
        .where(inArray(expense_split.sharedExpenseId, expenseIds))
    : [];

  const splitsByExpense = new Map<string, { userId: string; amount: number }[]>();
  for (const s of splits) {
    const list = splitsByExpense.get(s.sharedExpenseId) ?? [];
    list.push({ userId: s.userId, amount: s.amount });
    splitsByExpense.set(s.sharedExpenseId, list);
  }

  const forBalance: ExpenseForBalance[] = expenses.map((e) => ({
    paidBy: e.paidBy,
    splits: splitsByExpense.get(e.id) ?? [],
  }));

  const balances = computeMemberBalances(
    forBalance,
    settlements.map((s) => ({ from: s.from, to: s.to, amount: s.amount })),
  );
  const suggestions = minimizeSettlements(balances);

  const nameById = new Map(members.map((m) => [m.userId, m.name]));

  return {
    balances: members.map((m) => ({
      userId: m.userId,
      name: m.name,
      balance: balances.get(m.userId) ?? 0,
    })),
    suggestions: suggestions.map((s) => ({
      from: s.from,
      fromName: nameById.get(s.from) ?? "?",
      to: s.to,
      toName: nameById.get(s.to) ?? "?",
      amount: s.amount,
    })),
  };
}

export async function recordSettlement(
  spaceId: string,
  input: { fromUser: string; toUser: string; amount: number; date: string; note?: string | undefined },
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  const members = await spaceMemberIds(spaceId);
  if (!members.has(input.fromUser) || !members.has(input.toUser)) {
    throw new ForbiddenError("Utente non valido per il rimborso");
  }
  await db.insert(settlement).values({
    organizationId: spaceId,
    fromUser: input.fromUser,
    toUser: input.toUser,
    amount: input.amount,
    date: input.date,
    note: input.note ?? null,
  });
}

export interface SettlementRow {
  id: string;
  fromName: string | null;
  toName: string | null;
  amount: number;
  date: string;
  note: string | null;
}

export async function listSettlements(
  spaceId: string,
): Promise<SettlementRow[]> {
  await requireSpaceMember(spaceId);
  // Due join sulla tabella user (from/to): uno diretto, uno via alias.
  const fromUser = user;
  const toUserAlias = alias(user, "to_user");
  return db
    .select({
      id: settlement.id,
      fromName: fromUser.name,
      toName: toUserAlias.name,
      amount: settlement.amount,
      date: settlement.date,
      note: settlement.note,
    })
    .from(settlement)
    .leftJoin(fromUser, eq(settlement.fromUser, fromUser.id))
    .leftJoin(toUserAlias, eq(settlement.toUser, toUserAlias.id))
    .where(eq(settlement.organizationId, spaceId))
    .orderBy(desc(settlement.date));
}
