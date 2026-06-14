import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budget, category, type BudgetPeriodType } from "@/db/schema";
import { requireSpaceMember } from "./context";
import { spentByCategory } from "./analytics";
import { budgetProgress, type BudgetProgress } from "@/server/services/budget";
import { monthRange, yearRange } from "@/lib/period";

export interface CreateBudgetInput {
  categoryId: string;
  periodType: BudgetPeriodType;
  amount: number;
  rollover: boolean;
}

/**
 * Crea o aggiorna un budget (upsert su spazio+categoria+periodType).
 * Richiede ruolo >= member.
 */
export async function upsertBudget(
  spaceId: string,
  input: CreateBudgetInput,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");

  // La categoria deve appartenere allo spazio.
  const cat = await db
    .select({ id: category.id })
    .from(category)
    .where(
      and(eq(category.id, input.categoryId), eq(category.organizationId, spaceId)),
    )
    .limit(1);
  if (!cat[0]) throw new Error("Categoria non valida");

  await db
    .insert(budget)
    .values({
      organizationId: spaceId,
      categoryId: input.categoryId,
      periodType: input.periodType,
      amount: input.amount,
      rollover: input.rollover,
    })
    .onConflictDoUpdate({
      target: [budget.organizationId, budget.categoryId, budget.periodType],
      set: { amount: input.amount, rollover: input.rollover, updatedAt: new Date() },
    });
}

export async function deleteBudget(
  spaceId: string,
  budgetId: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .delete(budget)
    .where(and(eq(budget.id, budgetId), eq(budget.organizationId, spaceId)));
}

export interface BudgetLine extends BudgetProgress {
  id: string;
  categoryId: string;
  categoryName: string | null;
  periodType: BudgetPeriodType;
  rollover: boolean;
}

/**
 * Overview dei budget di un periodo: per ogni budget del tipo richiesto,
 * calcola lo speso (uscite della categoria nel periodo) e l'avanzamento.
 */
export async function budgetOverview(
  spaceId: string,
  periodType: BudgetPeriodType,
  year: number,
  month: number,
): Promise<BudgetLine[]> {
  await requireSpaceMember(spaceId);

  const range = periodType === "monthly" ? monthRange(year, month) : yearRange(year);

  const [budgets, spend] = await Promise.all([
    db
      .select({
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: category.name,
        periodType: budget.periodType,
        amount: budget.amount,
        rollover: budget.rollover,
      })
      .from(budget)
      .leftJoin(category, eq(budget.categoryId, category.id))
      .where(
        and(
          eq(budget.organizationId, spaceId),
          eq(budget.periodType, periodType),
        ),
      ),
    spentByCategory(spaceId, range.from, range.to),
  ]);

  const spentByCat = new Map(spend.map((s) => [s.categoryId, s.spent]));

  return budgets.map((b) => {
    const spent = spentByCat.get(b.categoryId) ?? 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      periodType: b.periodType,
      rollover: b.rollover,
      ...budgetProgress(b.amount, spent),
    };
  });
}
