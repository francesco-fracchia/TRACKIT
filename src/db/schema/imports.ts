import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization, user } from "./auth";
import { category } from "./ledger";

/**
 * M6: import di estratti CSV. `import_batch` traccia ogni import (per il revert);
 * `import_mapping_preset` salva la mappatura colonne per banca;
 * `category_rule` categorizza automaticamente per match sul beneficiario.
 */

export const IMPORT_STATUSES = ["committed", "reverted"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const importBatch = sqliteTable(
  "import_batch",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("csv"),
    status: text("status", { enum: IMPORT_STATUSES }).notNull().default("committed"),
    bankName: text("bank_name"),
    fileName: text("file_name"),
    rowCount: integer("row_count").notNull().default(0),
    importedCount: integer("imported_count").notNull().default(0),
    columnMapping: text("column_mapping", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("import_batch_org_idx").on(t.organizationId)],
);

export const importMappingPreset = sqliteTable(
  "import_mapping_preset",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    bankName: text("bank_name").notNull(),
    columnMapping: text("column_mapping", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [unique("import_preset_org_bank_uq").on(t.organizationId, t.bankName)],
);

export const CATEGORY_RULE_MATCHES = ["contains", "regex"] as const;
export type CategoryRuleMatch = (typeof CATEGORY_RULE_MATCHES)[number];

export const categoryRule = sqliteTable(
  "category_rule",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    matchType: text("match_type", { enum: CATEGORY_RULE_MATCHES })
      .notNull()
      .default("contains"),
    pattern: text("pattern").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("category_rule_org_idx").on(t.organizationId)],
);
