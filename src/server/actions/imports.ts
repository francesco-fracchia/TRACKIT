"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import {
  previewImport,
  commitImport,
  revertImport,
  savePreset,
  createCategoryRule,
  deleteCategoryRule,
  type ImportPreview,
  type CommitResult,
} from "@/server/dal/imports";
import { requireSpaceMember } from "@/server/dal/context";
import type { ColumnMapping } from "@/server/services/import";
import type { CategoryRuleMatch } from "@/db/schema";

export interface InspectResult {
  fields?: string[];
  sample?: Record<string, string>[];
  error?: string;
}

export async function inspectCsvAction(
  spaceId: string,
  csvText: string,
): Promise<InspectResult> {
  await requireSpaceMember(spaceId);
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    preview: 4,
  });
  const fields = result.meta.fields ?? [];
  if (fields.length === 0) {
    return { error: "CSV non riconosciuto o senza intestazioni" };
  }
  return { fields, sample: result.data.slice(0, 3) };
}

function validateMapping(m: ColumnMapping): string | null {
  if (!m.date || !m.amount || !m.payee) return "Mappa data, importo e descrizione";
  if (m.dateFormat !== "iso" && m.dateFormat !== "dmy")
    return "Formato data non valido";
  return null;
}

export async function previewImportAction(
  spaceId: string,
  csvText: string,
  mapping: ColumnMapping,
): Promise<{ preview?: ImportPreview; error?: string }> {
  const err = validateMapping(mapping);
  if (err) return { error: err };
  try {
    const preview = await previewImport(spaceId, csvText, mapping);
    return { preview };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Anteprima fallita" };
  }
}

export async function commitImportAction(
  spaceId: string,
  csvText: string,
  mapping: ColumnMapping,
  accountId: string,
  bankName: string | undefined,
  fileName: string | undefined,
  savePresetFlag: boolean,
): Promise<{ result?: CommitResult; error?: string }> {
  const err = validateMapping(mapping);
  if (err) return { error: err };
  if (!accountId) return { error: "Seleziona un conto" };
  try {
    const result = await commitImport(
      spaceId,
      csvText,
      mapping,
      accountId,
      bankName,
      fileName,
    );
    if (savePresetFlag && bankName) {
      await savePreset(spaceId, bankName, mapping);
    }
    revalidatePath(`/${spaceId}/import`);
    revalidatePath(`/${spaceId}/transactions`);
    revalidatePath(`/${spaceId}/dashboard`);
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import fallito" };
  }
}

export async function revertImportAction(
  spaceId: string,
  batchId: string,
): Promise<{ ok?: true; error?: string }> {
  await revertImport(spaceId, batchId);
  revalidatePath(`/${spaceId}/import`);
  revalidatePath(`/${spaceId}/transactions`);
  revalidatePath(`/${spaceId}/dashboard`);
  return { ok: true };
}

export async function createCategoryRuleAction(
  spaceId: string,
  input: { matchType: CategoryRuleMatch; pattern: string; categoryId: string },
): Promise<{ ok?: true; error?: string }> {
  if (!input.pattern.trim() || !input.categoryId) {
    return { error: "Pattern e categoria obbligatori" };
  }
  await createCategoryRule(spaceId, input);
  revalidatePath(`/${spaceId}/import`);
  return { ok: true };
}

export async function deleteCategoryRuleAction(
  spaceId: string,
  id: string,
): Promise<{ ok?: true }> {
  await deleteCategoryRule(spaceId, id);
  revalidatePath(`/${spaceId}/import`);
  return { ok: true };
}
