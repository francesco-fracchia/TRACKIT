import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization } from "./auth";
import { financialAccount } from "./ledger";

/**
 * M4: obiettivi di risparmio, passività e snapshot del patrimonio netto.
 */

export const goal = sqliteTable(
  "goal",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: integer("target_amount").notNull(),
    /** Importo accumulato manuale (usato se non c'è un conto collegato). */
    currentAmount: integer("current_amount").notNull().default(0),
    /** Se valorizzato, l'avanzamento usa il saldo di questo conto. */
    linkedAccountId: text("linked_account_id").references(
      () => financialAccount.id,
      { onDelete: "set null" },
    ),
    targetDate: text("target_date"), // YYYY-MM-DD
    achievedAt: integer("achieved_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("goal_org_idx").on(t.organizationId)],
);

export const liability = sqliteTable(
  "liability",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Importo dovuto in centesimi (positivo). */
    balance: integer("balance").notNull(),
    asOf: text("as_of"), // YYYY-MM-DD
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("liability_org_idx").on(t.organizationId)],
);

export const netWorthSnapshot = sqliteTable(
  "net_worth_snapshot",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    assets: integer("assets").notNull(),
    liabilities: integer("liabilities").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("net_worth_org_idx").on(t.organizationId),
    unique("net_worth_org_date_uq").on(t.organizationId, t.date),
  ],
);
