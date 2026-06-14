import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization } from "./auth";
import { category } from "./ledger";

/**
 * Budget (M2): target di spesa ricorrente per categoria.
 * `periodType` indica la cadenza (mensile/annuale); l'importo è il cap per
 * ciascun periodo. Lo "speso" è calcolato dalle transazioni del periodo.
 */

export const BUDGET_PERIOD_TYPES = ["monthly", "annual"] as const;
export type BudgetPeriodType = (typeof BUDGET_PERIOD_TYPES)[number];

export const budget = sqliteTable(
  "budget",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    periodType: text("period_type", { enum: BUDGET_PERIOD_TYPES })
      .notNull()
      .default("monthly"),
    /** Cap per periodo in centesimi. */
    amount: integer("amount").notNull(),
    /** Se true, l'inutilizzato di un periodo si somma al successivo. */
    rollover: integer("rollover", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("budget_org_idx").on(t.organizationId),
    // Un solo budget attivo per (spazio, categoria, periodType).
    unique("budget_org_cat_period_uq").on(
      t.organizationId,
      t.categoryId,
      t.periodType,
    ),
  ],
);
