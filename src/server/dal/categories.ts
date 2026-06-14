import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { category, type CategoryKind } from "@/db/schema";
import { requireSpaceMember } from "./context";

export interface CategoryOption {
  id: string;
  name: string;
  kind: CategoryKind;
}

/** Categorie attive dello spazio (per le select). */
export async function listCategories(
  spaceId: string,
): Promise<CategoryOption[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({ id: category.id, name: category.name, kind: category.kind })
    .from(category)
    .where(
      and(
        eq(category.organizationId, spaceId),
        isNull(category.deletedAt),
      ),
    );
}
