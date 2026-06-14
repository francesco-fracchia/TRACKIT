import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization, user } from "./auth";
import { financialAccount, category, TRANSACTION_TYPES } from "./ledger";

/**
 * Regole di ricorrenza (M3): template di transazione + cadenza RRULE.
 * Le occorrenze "scadute" possono generare transazioni reali (auto_post) o
 * essere solo suggerite (suggest).
 */

export const RECURRING_MODES = ["auto_post", "suggest"] as const;
export type RecurringMode = (typeof RECURRING_MODES)[number];

export const recurringRule = sqliteTable(
  "recurring_rule",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
    amount: integer("amount").notNull(),
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    counterAccountId: text("counter_account_id").references(
      () => financialAccount.id,
      { onDelete: "set null" },
    ),
    payee: text("payee"),
    note: text("note"),
    /** Stringa RRULE (RFC 5545), senza DTSTART (memorizzato a parte). */
    rrule: text("rrule").notNull(),
    /** Data di partenza della ricorrenza (YYYY-MM-DD). */
    dtstart: text("dtstart").notNull(),
    mode: text("mode", { enum: RECURRING_MODES }).notNull().default("suggest"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    /** Ultima data per cui è stata generata/processata un'occorrenza. */
    lastRunAt: text("last_run_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("recurring_rule_org_idx").on(t.organizationId)],
);
