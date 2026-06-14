import "server-only";
import { and, count, desc, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  monthlyReview,
  reviewActionItem,
  transaction,
  user,
} from "@/db/schema";
import { requireSpaceMember } from "./context";
import { getSpace } from "./spaces";
import { incomeVsExpense, spentByCategory } from "./analytics";
import { budgetOverview } from "./budgets";
import { listGoals } from "./wealth";
import { monthRange } from "@/lib/period";

export interface ReviewData {
  income: number;
  expense: number;
  net: number;
  uncategorizedCount: number;
  budgetLines: {
    categoryName: string | null;
    budgeted: number;
    spent: number;
    over: boolean;
  }[];
  topCategories: { name: string; spent: number }[];
  goals: { total: number; reached: number };
}

function periodToYM(period: string): { year: number; month: number } {
  const [y, m] = period.split("-").map(Number);
  return { year: y ?? 1970, month: m ?? 1 };
}

/** Calcola i numeri della revisione per un periodo (dati live). */
export async function computeReviewData(
  spaceId: string,
  period: string,
): Promise<ReviewData> {
  const space = await getSpace(spaceId);
  const { year, month } = periodToYM(period);
  const range = monthRange(year, month);

  const [ie, budget, spend, goals, uncat] = await Promise.all([
    incomeVsExpense(spaceId, range.from, range.to),
    budgetOverview(spaceId, "monthly", year, month),
    spentByCategory(spaceId, range.from, range.to),
    listGoals(spaceId),
    db
      .select({ value: count() })
      .from(transaction)
      .where(
        and(
          eq(transaction.organizationId, spaceId),
          ne(transaction.type, "transfer"),
          isNull(transaction.deletedAt),
          isNull(transaction.categoryId),
          gte(transaction.valueDate, range.from),
          lte(transaction.valueDate, range.to),
        ),
      ),
  ]);
  void space;

  return {
    income: ie.income,
    expense: ie.expense,
    net: ie.income - ie.expense,
    uncategorizedCount: uncat[0]?.value ?? 0,
    budgetLines: budget.map((b) => ({
      categoryName: b.categoryName,
      budgeted: b.budgeted,
      spent: b.spent,
      over: b.over,
    })),
    topCategories: spend
      .filter((s) => s.spent > 0)
      .slice(0, 5)
      .map((s) => ({ name: s.categoryName ?? "Senza categoria", spent: s.spent })),
    goals: {
      total: goals.length,
      reached: goals.filter((g) => g.reached).length,
    },
  };
}

export async function getOrCreateReview(
  spaceId: string,
  period: string,
): Promise<string> {
  const ctx = await requireSpaceMember(spaceId, "member");
  const existing = await db
    .select({ id: monthlyReview.id })
    .from(monthlyReview)
    .where(
      and(
        eq(monthlyReview.organizationId, spaceId),
        eq(monthlyReview.period, period),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0].id;

  const rows = await db
    .insert(monthlyReview)
    .values({ organizationId: spaceId, period, createdBy: ctx.userId })
    .returning({ id: monthlyReview.id });
  return rows[0]!.id;
}

export interface ReviewDetail {
  id: string;
  period: string;
  status: "open" | "closed";
  notes: string | null;
  closedAt: Date | null;
  data: ReviewData;
  actionItems: {
    id: string;
    text: string;
    done: boolean;
    assigneeName: string | null;
  }[];
}

export async function getReview(
  spaceId: string,
  period: string,
): Promise<ReviewDetail | null> {
  await requireSpaceMember(spaceId);
  const rows = await db
    .select()
    .from(monthlyReview)
    .where(
      and(
        eq(monthlyReview.organizationId, spaceId),
        eq(monthlyReview.period, period),
      ),
    )
    .limit(1);
  const review = rows[0];
  if (!review) return null;

  // Chiusa → usa lo snapshot congelato; aperta → calcola live.
  const data =
    review.status === "closed" && review.snapshot
      ? (review.snapshot as unknown as ReviewData)
      : await computeReviewData(spaceId, period);

  const items = await db
    .select({
      id: reviewActionItem.id,
      text: reviewActionItem.text,
      done: reviewActionItem.done,
      assigneeName: user.name,
    })
    .from(reviewActionItem)
    .leftJoin(user, eq(reviewActionItem.assignee, user.id))
    .where(eq(reviewActionItem.reviewId, review.id));

  return {
    id: review.id,
    period: review.period,
    status: review.status,
    notes: review.notes,
    closedAt: review.closedAt,
    data,
    actionItems: items,
  };
}

export async function closeReview(
  spaceId: string,
  period: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  const data = await computeReviewData(spaceId, period);
  await db
    .update(monthlyReview)
    .set({
      status: "closed",
      snapshot: data as unknown as Record<string, unknown>,
      closedAt: new Date(),
    })
    .where(
      and(
        eq(monthlyReview.organizationId, spaceId),
        eq(monthlyReview.period, period),
      ),
    );
}

export async function reopenReview(
  spaceId: string,
  period: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(monthlyReview)
    .set({ status: "open", closedAt: null })
    .where(
      and(
        eq(monthlyReview.organizationId, spaceId),
        eq(monthlyReview.period, period),
      ),
    );
}

export async function saveReviewNotes(
  spaceId: string,
  reviewId: string,
  notes: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(monthlyReview)
    .set({ notes })
    .where(
      and(
        eq(monthlyReview.id, reviewId),
        eq(monthlyReview.organizationId, spaceId),
      ),
    );
}

export async function addActionItem(
  spaceId: string,
  reviewId: string,
  text: string,
  assignee?: string | undefined,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  // Verifica che la review appartenga allo spazio.
  const r = await db
    .select({ id: monthlyReview.id })
    .from(monthlyReview)
    .where(
      and(
        eq(monthlyReview.id, reviewId),
        eq(monthlyReview.organizationId, spaceId),
      ),
    )
    .limit(1);
  if (!r[0]) return;
  await db.insert(reviewActionItem).values({
    reviewId,
    text,
    assignee: assignee ?? null,
  });
}

export async function toggleActionItem(
  spaceId: string,
  itemId: string,
  done: boolean,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(reviewActionItem)
    .set({ done })
    .where(eq(reviewActionItem.id, itemId));
}

export async function deleteActionItem(
  spaceId: string,
  itemId: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db.delete(reviewActionItem).where(eq(reviewActionItem.id, itemId));
}

export interface ReviewListRow {
  period: string;
  status: "open" | "closed";
  closedAt: Date | null;
}

export async function listReviews(spaceId: string): Promise<ReviewListRow[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({
      period: monthlyReview.period,
      status: monthlyReview.status,
      closedAt: monthlyReview.closedAt,
    })
    .from(monthlyReview)
    .where(eq(monthlyReview.organizationId, spaceId))
    .orderBy(desc(monthlyReview.period));
}
