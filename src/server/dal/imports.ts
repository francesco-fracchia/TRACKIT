import "server-only";
import Papa from "papaparse";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  category,
  categoryRule,
  financialAccount,
  importBatch,
  importMappingPreset,
  transaction,
  type CategoryRuleMatch,
} from "@/db/schema";
import { requireSpaceMember, ForbiddenError } from "./context";
import {
  rowToDraft,
  dedupHash,
  matchCategory,
  type ColumnMapping,
  type CategoryRuleSpec,
} from "@/server/services/import";

function parseCsv(text: string): {
  fields: string[];
  rows: Record<string, string>[];
} {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return {
    fields: result.meta.fields ?? [],
    rows: result.data,
  };
}

/** Hash delle transazioni esistenti dello spazio (per la deduplica). */
async function existingHashes(spaceId: string): Promise<Set<string>> {
  const rows = await db
    .select({
      valueDate: transaction.valueDate,
      amount: transaction.amount,
      type: transaction.type,
      payee: transaction.payee,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, spaceId),
        isNull(transaction.deletedAt),
      ),
    );
  const set = new Set<string>();
  for (const r of rows) {
    const signed = r.type === "income" ? r.amount : -r.amount;
    set.add(dedupHash(r.valueDate, signed, r.payee ?? ""));
  }
  return set;
}

async function loadRules(spaceId: string): Promise<{
  specs: CategoryRuleSpec[];
  nameById: Map<string, string>;
}> {
  const rows = await db
    .select({
      matchType: categoryRule.matchType,
      pattern: categoryRule.pattern,
      categoryId: categoryRule.categoryId,
      categoryName: category.name,
    })
    .from(categoryRule)
    .leftJoin(category, eq(categoryRule.categoryId, category.id))
    .where(eq(categoryRule.organizationId, spaceId));
  const nameById = new Map<string, string>();
  for (const r of rows) if (r.categoryName) nameById.set(r.categoryId, r.categoryName);
  return {
    specs: rows.map((r) => ({
      matchType: r.matchType,
      pattern: r.pattern,
      categoryId: r.categoryId,
    })),
    nameById,
  };
}

export interface PreviewRow {
  valueDate: string;
  amount: number; // segno
  payee: string;
  type: "income" | "expense";
  duplicate: boolean;
  invalid: boolean;
  error?: string;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
}

export interface ImportPreview {
  fields: string[];
  rows: PreviewRow[];
  total: number;
  duplicates: number;
  invalid: number;
}

export async function previewImport(
  spaceId: string,
  csvText: string,
  mapping: ColumnMapping,
): Promise<ImportPreview> {
  await requireSpaceMember(spaceId);
  const { fields, rows } = parseCsv(csvText);
  const [existing, rules] = await Promise.all([
    existingHashes(spaceId),
    loadRules(spaceId),
  ]);

  const seen = new Set<string>();
  const preview: PreviewRow[] = [];
  let duplicates = 0;
  let invalid = 0;

  for (const row of rows) {
    try {
      const draft = rowToDraft(row, mapping);
      const hash = dedupHash(draft.valueDate, draft.amount, draft.payee);
      const isDup = existing.has(hash) || seen.has(hash);
      if (isDup) duplicates++;
      seen.add(hash);
      const catId = matchCategory(draft.payee, rules.specs);
      preview.push({
        valueDate: draft.valueDate,
        amount: draft.amount,
        payee: draft.payee,
        type: draft.amount < 0 ? "expense" : "income",
        duplicate: isDup,
        invalid: false,
        suggestedCategoryId: catId,
        suggestedCategoryName: catId
          ? (rules.nameById.get(catId) ?? null)
          : null,
      });
    } catch (err) {
      invalid++;
      preview.push({
        valueDate: "",
        amount: 0,
        payee: "",
        type: "expense",
        duplicate: false,
        invalid: true,
        error: err instanceof Error ? err.message : "Riga non valida",
        suggestedCategoryId: null,
        suggestedCategoryName: null,
      });
    }
  }

  return {
    fields,
    rows: preview,
    total: preview.length,
    duplicates,
    invalid,
  };
}

export interface CommitResult {
  batchId: string;
  imported: number;
  skipped: number;
}

export async function commitImport(
  spaceId: string,
  csvText: string,
  mapping: ColumnMapping,
  accountId: string,
  bankName: string | undefined,
  fileName: string | undefined,
): Promise<CommitResult> {
  const ctx = await requireSpaceMember(spaceId, "member");

  // Il conto di destinazione deve appartenere allo spazio.
  const acc = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.organizationId, spaceId),
        isNull(financialAccount.deletedAt),
      ),
    )
    .limit(1);
  if (!acc[0]) throw new ForbiddenError("Conto non valido");

  const { rows } = parseCsv(csvText);
  const [existing, rules] = await Promise.all([
    existingHashes(spaceId),
    loadRules(spaceId),
  ]);

  const batchRows = await db
    .insert(importBatch)
    .values({
      organizationId: spaceId,
      source: "csv",
      status: "committed",
      bankName: bankName ?? null,
      fileName: fileName ?? null,
      rowCount: rows.length,
      columnMapping: mapping as unknown as Record<string, unknown>,
      createdBy: ctx.userId,
    })
    .returning({ id: importBatch.id });
  const batchId = batchRows[0]!.id;

  const seen = new Set<string>();
  const toInsert: (typeof transaction.$inferInsert)[] = [];

  for (const row of rows) {
    let draft;
    try {
      draft = rowToDraft(row, mapping);
    } catch {
      continue; // riga non valida: salta
    }
    const hash = dedupHash(draft.valueDate, draft.amount, draft.payee);
    if (existing.has(hash) || seen.has(hash)) continue; // duplicato: salta
    seen.add(hash);

    const catId = matchCategory(draft.payee, rules.specs);
    toInsert.push({
      organizationId: spaceId,
      accountId,
      type: draft.amount < 0 ? "expense" : "income",
      amount: Math.abs(draft.amount),
      valueDate: draft.valueDate,
      payee: draft.payee || null,
      categoryId: catId,
      importBatchId: batchId,
      createdBy: ctx.userId,
    });
  }

  if (toInsert.length > 0) {
    await db.insert(transaction).values(toInsert);
  }

  await db
    .update(importBatch)
    .set({ importedCount: toInsert.length })
    .where(eq(importBatch.id, batchId));

  return {
    batchId,
    imported: toInsert.length,
    skipped: rows.length - toInsert.length,
  };
}

export async function revertImport(
  spaceId: string,
  batchId: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .update(transaction)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(transaction.organizationId, spaceId),
        eq(transaction.importBatchId, batchId),
      ),
    );
  await db
    .update(importBatch)
    .set({ status: "reverted" })
    .where(
      and(eq(importBatch.id, batchId), eq(importBatch.organizationId, spaceId)),
    );
}

export interface BatchRow {
  id: string;
  bankName: string | null;
  fileName: string | null;
  importedCount: number;
  status: string;
  createdAt: Date;
}

export async function listBatches(spaceId: string): Promise<BatchRow[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: importBatch.id,
      bankName: importBatch.bankName,
      fileName: importBatch.fileName,
      importedCount: importBatch.importedCount,
      status: importBatch.status,
      createdAt: importBatch.createdAt,
    })
    .from(importBatch)
    .where(eq(importBatch.organizationId, spaceId))
    .orderBy(desc(importBatch.createdAt));
}

// ---------- Preset mappatura ----------

export async function listPresets(spaceId: string) {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: importMappingPreset.id,
      bankName: importMappingPreset.bankName,
      columnMapping: importMappingPreset.columnMapping,
    })
    .from(importMappingPreset)
    .where(eq(importMappingPreset.organizationId, spaceId));
}

export async function savePreset(
  spaceId: string,
  bankName: string,
  mapping: ColumnMapping,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .insert(importMappingPreset)
    .values({
      organizationId: spaceId,
      bankName,
      columnMapping: mapping as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: [importMappingPreset.organizationId, importMappingPreset.bankName],
      set: { columnMapping: mapping as unknown as Record<string, unknown> },
    });
}

// ---------- Regole di categorizzazione ----------

export async function listCategoryRules(spaceId: string) {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: categoryRule.id,
      matchType: categoryRule.matchType,
      pattern: categoryRule.pattern,
      categoryName: category.name,
    })
    .from(categoryRule)
    .leftJoin(category, eq(categoryRule.categoryId, category.id))
    .where(eq(categoryRule.organizationId, spaceId));
}

export async function createCategoryRule(
  spaceId: string,
  input: { matchType: CategoryRuleMatch; pattern: string; categoryId: string },
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db.insert(categoryRule).values({
    organizationId: spaceId,
    matchType: input.matchType,
    pattern: input.pattern,
    categoryId: input.categoryId,
  });
}

export async function deleteCategoryRule(
  spaceId: string,
  id: string,
): Promise<void> {
  await requireSpaceMember(spaceId, "member");
  await db
    .delete(categoryRule)
    .where(
      and(eq(categoryRule.id, id), eq(categoryRule.organizationId, spaceId)),
    );
}
