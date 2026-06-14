import "server-only";
import { and, eq, gte, isNull, lte, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { category, transaction } from "@/db/schema";
import { requireSpaceMember } from "./context";

function toCents(v: string | null): number {
  return v ? Number(v) : 0;
}

export interface CategorySpend {
  categoryId: string | null;
  categoryName: string | null;
  spent: number;
}

/** Spesa (uscite) per categoria nell'intervallo [from, to]. Esclude i transfer. */
export async function spentByCategory(
  spaceId: string,
  from: string,
  to: string,
): Promise<CategorySpend[]> {
  await requireSpaceMember(spaceId);
  const rows = await db
    .select({
      categoryId: transaction.categoryId,
      categoryName: category.name,
      spent: sum(transaction.amount),
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.organizationId, spaceId),
        eq(transaction.type, "expense"),
        isNull(transaction.deletedAt),
        gte(transaction.valueDate, from),
        lte(transaction.valueDate, to),
      ),
    )
    .groupBy(transaction.categoryId, category.name);

  return rows
    .map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      spent: toCents(r.spent),
    }))
    .sort((a, b) => b.spent - a.spent);
}

export interface IncomeExpense {
  income: number;
  expense: number;
}

/** Totale entrate e uscite nell'intervallo (transfer esclusi). */
export async function incomeVsExpense(
  spaceId: string,
  from: string,
  to: string,
): Promise<IncomeExpense> {
  await requireSpaceMember(spaceId);
  const rows = await db
    .select({ type: transaction.type, total: sum(transaction.amount) })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, spaceId),
        ne(transaction.type, "transfer"),
        isNull(transaction.deletedAt),
        gte(transaction.valueDate, from),
        lte(transaction.valueDate, to),
      ),
    )
    .groupBy(transaction.type);

  const result: IncomeExpense = { income: 0, expense: 0 };
  for (const r of rows) {
    if (r.type === "income") result.income = toCents(r.total);
    if (r.type === "expense") result.expense = toCents(r.total);
  }
  return result;
}

export interface MonthlyCashflow {
  month: number; // 1-12
  income: number;
  expense: number;
}

/** Entrate/uscite per mese di un anno (per il grafico cashflow). */
export async function cashflowByMonth(
  spaceId: string,
  year: number,
): Promise<MonthlyCashflow[]> {
  await requireSpaceMember(spaceId);
  const ym = sql<string>`substr(${transaction.valueDate}, 1, 7)`;
  const rows = await db
    .select({
      ym,
      type: transaction.type,
      total: sum(transaction.amount),
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, spaceId),
        ne(transaction.type, "transfer"),
        isNull(transaction.deletedAt),
        gte(transaction.valueDate, `${year}-01-01`),
        lte(transaction.valueDate, `${year}-12-31`),
      ),
    )
    .groupBy(ym, transaction.type);

  const months: MonthlyCashflow[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
  }));

  for (const r of rows) {
    const month = Number(r.ym.slice(5, 7));
    const target = months[month - 1];
    if (!target) continue;
    if (r.type === "income") target.income = toCents(r.total);
    if (r.type === "expense") target.expense = toCents(r.total);
  }
  return months;
}
