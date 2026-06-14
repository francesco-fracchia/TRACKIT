import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization, user } from "./auth";

/**
 * M5: spese condivise negli spazi `shared`.
 * `shared_expense` + `expense_split` (quota per membro) + `settlement` (rimborsi).
 */

export const shared_expense = sqliteTable(
  "shared_expense",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    totalAmount: integer("total_amount").notNull(),
    paidBy: text("paid_by")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    date: text("date").notNull(), // YYYY-MM-DD
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("shared_expense_org_idx").on(t.organizationId)],
);

export const SHARE_KINDS = ["amount", "percent"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];

export const expense_split = sqliteTable(
  "expense_split",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    sharedExpenseId: text("shared_expense_id")
      .notNull()
      .references(() => shared_expense.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    shareKind: text("share_kind", { enum: SHARE_KINDS }).notNull(),
    /** Valore inserito (centesimi se amount, percentuale se percent). */
    shareValue: integer("share_value").notNull(),
    /** Quota calcolata in centesimi (somma = totale spesa). */
    computedAmount: integer("computed_amount").notNull(),
  },
  (t) => [index("expense_split_expense_idx").on(t.sharedExpenseId)],
);

export const settlement = sqliteTable(
  "settlement",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fromUser: text("from_user")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    toUser: text("to_user")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    date: text("date").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("settlement_org_idx").on(t.organizationId)],
);
