import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  category,
  financialAccount,
  recurringRule,
  type RecurringMode,
  type TransactionType,
} from "@/db/schema";
import { requireSpaceMember } from "./context";
import { createTransaction } from "./transactions";
import { expandOccurrences } from "@/lib/recurrence";
import type { ScheduledMovement } from "@/server/services/forecast";

function dayAfter(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1));
  return date.toISOString().slice(0, 10);
}

export interface RecurringInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId?: string | undefined;
  counterAccountId?: string | undefined;
  payee?: string | undefined;
  note?: string | undefined;
  rrule: string;
  dtstart: string;
  mode: RecurringMode;
}

export async function createRecurring(
  spaceId: string,
  input: RecurringInput,
): Promise<string> {
  const ctx = await requireSpaceMember(spaceId, "member");
  const rows = await db
    .insert(recurringRule)
    .values({
      organizationId: spaceId,
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId ?? null,
      counterAccountId: input.counterAccountId ?? null,
      payee: input.payee ?? null,
      note: input.note ?? null,
      rrule: input.rrule,
      dtstart: input.dtstart,
      mode: input.mode,
      createdBy: ctx.userId,
    })
    .returning({ id: recurringRule.id });
  return rows[0]!.id;
}

export async function deleteRecurring(
  spaceId: string,
  id: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .delete(recurringRule)
    .where(
      and(eq(recurringRule.id, id), eq(recurringRule.organizationId, spaceId)),
    );
}

export interface RecurringRow {
  id: string;
  type: TransactionType;
  amount: number;
  rrule: string;
  dtstart: string;
  mode: RecurringMode;
  active: boolean;
  payee: string | null;
  accountName: string | null;
  categoryName: string | null;
  nextOccurrence: string | null;
}

async function listActiveRules(spaceId: string) {
  return db
    .select()
    .from(recurringRule)
    .where(
      and(
        eq(recurringRule.organizationId, spaceId),
        eq(recurringRule.active, true),
        isNull(recurringRule.deletedAt),
      ),
    );
}

export async function listRecurring(
  spaceId: string,
  today: string,
): Promise<RecurringRow[]> {
  await requireSpaceMember(spaceId);
  const rows = await db
    .select({
      id: recurringRule.id,
      type: recurringRule.type,
      amount: recurringRule.amount,
      rrule: recurringRule.rrule,
      dtstart: recurringRule.dtstart,
      mode: recurringRule.mode,
      active: recurringRule.active,
      payee: recurringRule.payee,
      accountName: financialAccount.name,
      categoryName: category.name,
    })
    .from(recurringRule)
    .leftJoin(financialAccount, eq(recurringRule.accountId, financialAccount.id))
    .leftJoin(category, eq(recurringRule.categoryId, category.id))
    .where(
      and(
        eq(recurringRule.organizationId, spaceId),
        isNull(recurringRule.deletedAt),
      ),
    );

  // Prossima occorrenza nei prossimi ~2 anni.
  const horizon = dayAfter(`${Number(today.slice(0, 4)) + 2}-01-01`);
  return rows.map((r) => {
    const next = r.active
      ? (expandOccurrences(r.rrule, r.dtstart, today, horizon)[0] ?? null)
      : null;
    return { ...r, nextOccurrence: next };
  });
}

export interface UpcomingOccurrence {
  date: string;
  type: TransactionType;
  amount: number;
  payee: string | null;
  accountName: string | null;
  categoryName: string | null;
  mode: RecurringMode;
}

/** Occorrenze pianificate nell'intervallo [from, to] (per il calendario). */
export async function listUpcomingOccurrences(
  spaceId: string,
  from: string,
  to: string,
): Promise<UpcomingOccurrence[]> {
  await requireSpaceMember(spaceId);
  const rules = await db
    .select({
      type: recurringRule.type,
      amount: recurringRule.amount,
      payee: recurringRule.payee,
      mode: recurringRule.mode,
      rrule: recurringRule.rrule,
      dtstart: recurringRule.dtstart,
      accountName: financialAccount.name,
      categoryName: category.name,
    })
    .from(recurringRule)
    .leftJoin(financialAccount, eq(recurringRule.accountId, financialAccount.id))
    .leftJoin(category, eq(recurringRule.categoryId, category.id))
    .where(
      and(
        eq(recurringRule.organizationId, spaceId),
        eq(recurringRule.active, true),
        isNull(recurringRule.deletedAt),
      ),
    );

  const result: UpcomingOccurrence[] = [];
  for (const r of rules) {
    for (const date of expandOccurrences(r.rrule, r.dtstart, from, to)) {
      result.push({
        date,
        type: r.type,
        amount: r.amount,
        payee: r.payee,
        accountName: r.accountName,
        categoryName: r.categoryName,
        mode: r.mode,
      });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Movimenti con segno (per le proiezioni) nell'intervallo [from, to]. */
export async function projectionMovements(
  spaceId: string,
  from: string,
  to: string,
): Promise<ScheduledMovement[]> {
  await requireSpaceMember(spaceId);
  const rules = await listActiveRules(spaceId);
  const movements: ScheduledMovement[] = [];
  for (const r of rules) {
    // I trasferimenti non cambiano il saldo totale dello spazio.
    if (r.type === "transfer") continue;
    const sign = r.type === "income" ? 1 : -1;
    for (const date of expandOccurrences(r.rrule, r.dtstart, from, to)) {
      movements.push({ date, amount: sign * r.amount });
    }
  }
  return movements;
}

/**
 * Registra le occorrenze scadute (fino a `today`) delle regole `auto_post`,
 * creando transazioni reali e avanzando `lastRunAt`. Idempotente.
 * Ritorna il numero di transazioni create.
 */
export async function postDueRecurring(
  spaceId: string,
  today: string,
): Promise<number> {
  await requireSpaceMember(spaceId, "member");
  const rules = await listActiveRules(spaceId);

  let posted = 0;
  for (const r of rules) {
    if (r.mode !== "auto_post") continue;
    const from = r.lastRunAt ? dayAfter(r.lastRunAt) : r.dtstart;
    if (from > today) continue;

    const occurrences = expandOccurrences(r.rrule, r.dtstart, from, today);
    for (const date of occurrences) {
      await createTransaction(spaceId, {
        type: r.type,
        accountId: r.accountId,
        amount: r.amount,
        valueDate: date,
        categoryId: r.categoryId ?? undefined,
        payee: r.payee ?? undefined,
        note: r.note ?? undefined,
        counterAccountId: r.counterAccountId ?? undefined,
      });
      posted += 1;
    }

    await db
      .update(recurringRule)
      .set({ lastRunAt: today })
      .where(eq(recurringRule.id, r.id));
  }
  return posted;
}
