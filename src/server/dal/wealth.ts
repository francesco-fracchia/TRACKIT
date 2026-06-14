import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { goal, liability, netWorthSnapshot } from "@/db/schema";
import { requireSpaceMember } from "./context";
import { listAccounts } from "./accounts";
import { goalProgress, netWorth, type GoalProgress } from "@/server/services/wealth";

// ---------- Obiettivi ----------

export interface GoalRow extends GoalProgress {
  id: string;
  name: string;
  targetDate: string | null;
  linkedAccountName: string | null;
  manual: boolean;
}

export async function listGoals(spaceId: string): Promise<GoalRow[]> {
  await requireSpaceMember(spaceId);
  const [goals, accounts] = await Promise.all([
    db
      .select()
      .from(goal)
      .where(and(eq(goal.organizationId, spaceId), isNull(goal.deletedAt))),
    listAccounts(spaceId, { includeArchived: true }),
  ]);

  const balanceById = new Map(accounts.map((a) => [a.id, a.balance]));
  const nameById = new Map(accounts.map((a) => [a.id, a.name]));

  return goals.map((g) => {
    const linked = g.linkedAccountId;
    const current = linked
      ? (balanceById.get(linked) ?? 0)
      : g.currentAmount;
    return {
      id: g.id,
      name: g.name,
      targetDate: g.targetDate,
      linkedAccountName: linked ? (nameById.get(linked) ?? null) : null,
      manual: !linked,
      ...goalProgress(current, g.targetAmount),
    };
  });
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  currentAmount: number;
  linkedAccountId?: string | undefined;
  targetDate?: string | undefined;
}

export async function createGoal(
  spaceId: string,
  input: CreateGoalInput,
): Promise<string> {
  await requireSpaceMember(spaceId, "member");
  const rows = await db
    .insert(goal)
    .values({
      organizationId: spaceId,
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount,
      linkedAccountId: input.linkedAccountId ?? null,
      targetDate: input.targetDate ?? null,
    })
    .returning({ id: goal.id });
  return rows[0]!.id;
}

export async function setGoalCurrent(
  spaceId: string,
  goalId: string,
  amount: number,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(goal)
    .set({ currentAmount: amount })
    .where(and(eq(goal.id, goalId), eq(goal.organizationId, spaceId)));
}

export async function deleteGoal(
  spaceId: string,
  goalId: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(goal)
    .set({ deletedAt: new Date() })
    .where(and(eq(goal.id, goalId), eq(goal.organizationId, spaceId)));
}

// ---------- Passività ----------

export interface LiabilityRow {
  id: string;
  name: string;
  balance: number;
  asOf: string | null;
}

export async function listLiabilities(
  spaceId: string,
): Promise<LiabilityRow[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: liability.id,
      name: liability.name,
      balance: liability.balance,
      asOf: liability.asOf,
    })
    .from(liability)
    .where(
      and(eq(liability.organizationId, spaceId), isNull(liability.deletedAt)),
    );
}

export async function createLiability(
  spaceId: string,
  input: { name: string; balance: number; asOf?: string | undefined },
): Promise<string> {
  await requireSpaceMember(spaceId, "member");
  const rows = await db
    .insert(liability)
    .values({
      organizationId: spaceId,
      name: input.name,
      balance: input.balance,
      asOf: input.asOf ?? null,
    })
    .returning({ id: liability.id });
  return rows[0]!.id;
}

export async function deleteLiability(
  spaceId: string,
  id: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(liability)
    .set({ deletedAt: new Date() })
    .where(and(eq(liability.id, id), eq(liability.organizationId, spaceId)));
}

// ---------- Patrimonio netto ----------

export interface NetWorthNow {
  assets: number;
  liabilities: number;
  net: number;
}

export async function currentNetWorth(
  spaceId: string,
  baseCurrency: string,
): Promise<NetWorthNow> {
  const [accounts, liabilities] = await Promise.all([
    listAccounts(spaceId, { includeArchived: true }),
    listLiabilities(spaceId),
  ]);
  const assets = accounts
    .filter((a) => a.currency === baseCurrency)
    .reduce((s, a) => s + a.balance, 0);
  const liab = liabilities.reduce((s, l) => s + l.balance, 0);
  return { assets, liabilities: liab, net: netWorth(assets, liab) };
}

export async function createSnapshot(
  spaceId: string,
  baseCurrency: string,
  date: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  const now = await currentNetWorth(spaceId, baseCurrency);
  await db
    .insert(netWorthSnapshot)
    .values({
      organizationId: spaceId,
      date,
      assets: now.assets,
      liabilities: now.liabilities,
    })
    .onConflictDoUpdate({
      target: [netWorthSnapshot.organizationId, netWorthSnapshot.date],
      set: { assets: now.assets, liabilities: now.liabilities },
    });
}

export interface SnapshotRow {
  date: string;
  assets: number;
  liabilities: number;
  net: number;
}

export async function listSnapshots(spaceId: string): Promise<SnapshotRow[]> {
  await requireSpaceMember(spaceId);
  const rows = await db
    .select({
      date: netWorthSnapshot.date,
      assets: netWorthSnapshot.assets,
      liabilities: netWorthSnapshot.liabilities,
    })
    .from(netWorthSnapshot)
    .where(eq(netWorthSnapshot.organizationId, spaceId))
    .orderBy(desc(netWorthSnapshot.date))
    .limit(36);
  return rows
    .map((r) => ({ ...r, net: r.assets - r.liabilities }))
    .reverse();
}
