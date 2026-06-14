import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tag } from "@/db/schema";

/**
 * Garantisce l'esistenza dei tag (per nome) nello spazio e ne restituisce gli
 * id. Crea quelli mancanti. Usa l'unique(org,name) per evitare duplicati.
 */
export async function ensureTags(
  spaceId: string,
  names: readonly string[],
): Promise<string[]> {
  const clean = Array.from(
    new Set(
      names.map((n) => n.trim()).filter((n) => n.length > 0 && n.length <= 40),
    ),
  );
  if (clean.length === 0) return [];

  const existing = await db
    .select({ id: tag.id, name: tag.name })
    .from(tag)
    .where(and(eq(tag.organizationId, spaceId), inArray(tag.name, clean)));

  const existingNames = new Set(existing.map((t) => t.name));
  const toCreate = clean.filter((n) => !existingNames.has(n));

  let created: { id: string; name: string }[] = [];
  if (toCreate.length > 0) {
    created = await db
      .insert(tag)
      .values(toCreate.map((name) => ({ organizationId: spaceId, name })))
      .returning({ id: tag.id, name: tag.name });
  }

  return [...existing, ...created].map((t) => t.id);
}
