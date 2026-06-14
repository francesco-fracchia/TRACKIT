import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization, user } from "./auth";

/**
 * Schema del ledger (M1): conti, categorie, tag, transazioni, allegati.
 * Tutto è scoperto da uno spazio (`organization_id`). Importi in centesimi.
 */

export const ACCOUNT_TYPES = ["bank", "cash", "card", "ewallet", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const financialAccount = sqliteTable(
  "financial_account",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ACCOUNT_TYPES }).notNull().default("bank"),
    currency: text("currency").notNull().default("EUR"),
    /** Saldo iniziale in centesimi (può essere negativo). */
    initialBalance: integer("initial_balance").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("financial_account_org_idx").on(t.organizationId)],
);

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: CATEGORY_KINDS }).notNull(),
    /** Sottocategoria: riferimento alla categoria padre (stesso spazio). */
    parentId: text("parent_id"),
    icon: text("icon"),
    color: text("color"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("category_org_idx").on(t.organizationId),
    index("category_parent_idx").on(t.parentId),
  ],
);

export const tag = sqliteTable(
  "tag",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [unique("tag_org_name_uq").on(t.organizationId, t.name)],
);

export const attachment = sqliteTable(
  "attachment",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Chiave/URL nel blob storage (Vercel Blob). */
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("attachment_org_idx").on(t.organizationId)],
);

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const transaction = sqliteTable(
  "transaction",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "restrict" }),
    type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
    /** Importo SEMPRE positivo in centesimi; il segno è dato dal `type`. */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("EUR"),
    /** Istante di registrazione (UTC). */
    bookedAt: integer("booked_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    /** Data civile YYYY-MM-DD (per i report mensili, senza ambiguità TZ). */
    valueDate: text("value_date").notNull(),
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    payee: text("payee"),
    note: text("note"),
    attachmentId: text("attachment_id").references(() => attachment.id, {
      onDelete: "set null",
    }),
    // --- Solo per i trasferimenti ---
    counterAccountId: text("counter_account_id").references(
      () => financialAccount.id,
      { onDelete: "restrict" },
    ),
    /** Importo accreditato sul conto destinazione (multi-valuta). */
    counterAmount: integer("counter_amount"),
    fxRate: real("fx_rate"),
    // --- Provenienza ---
    recurringRuleId: text("recurring_rule_id"),
    /** Batch di import di provenienza (testo, no FK: vedi DECISIONS D26). */
    importBatchId: text("import_batch_id"),
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
  (t) => [
    index("transaction_org_date_idx").on(t.organizationId, t.valueDate),
    index("transaction_account_date_idx").on(t.accountId, t.valueDate),
    index("transaction_category_idx").on(t.categoryId),
    index("transaction_import_batch_idx").on(t.importBatchId),
  ],
);

export const transactionTag = sqliteTable(
  "transaction_tag",
  {
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.transactionId, t.tagId] })],
);
