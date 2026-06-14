import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  category,
  member,
  organization,
  spaceProfile,
  type SpaceType,
} from "@/db/schema";
import { newId } from "@/lib/id";
import { DEFAULT_CATEGORIES } from "@/server/services/default-categories";
import { requireUser, requireSpaceMember } from "./context";
import type { Role } from "./roles";

export interface SpaceSummary {
  id: string;
  name: string;
  role: Role;
  type: SpaceType;
  baseCurrency: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove i segni diacritici (à -> a)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  // Suffisso casuale per garantire l'unicità dello slug.
  return `${base || "spazio"}-${newId().slice(0, 8)}`;
}

/** Spazi di cui l'utente corrente è membro. */
export async function listMySpaces(): Promise<SpaceSummary[]> {
  const ctx = await requireUser();
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      role: member.role,
      type: spaceProfile.type,
      baseCurrency: spaceProfile.baseCurrency,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .leftJoin(spaceProfile, eq(spaceProfile.organizationId, organization.id))
    .where(eq(member.userId, ctx.userId));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: (r.role as Role) ?? "viewer",
    type: r.type ?? "personal",
    baseCurrency: r.baseCurrency ?? "EUR",
  }));
}

export interface CreateSpaceInput {
  name: string;
  type: SpaceType;
  baseCurrency: string;
}

/**
 * Crea uno spazio: organization (Better Auth, aggiunge il creatore come owner),
 * profilo di dominio e categorie di default. Operazione coesa.
 */
export async function createSpace(input: CreateSpaceInput): Promise<string> {
  await requireUser();
  const h = await headers();

  const org = await auth.api.createOrganization({
    body: { name: input.name, slug: slugify(input.name) },
    headers: h,
  });
  if (!org) {
    throw new Error("Creazione dello spazio fallita");
  }

  await db.insert(spaceProfile).values({
    organizationId: org.id,
    type: input.type,
    baseCurrency: input.baseCurrency,
  });

  await db.insert(category).values(
    DEFAULT_CATEGORIES.map((c) => ({
      organizationId: org.id,
      name: c.name,
      kind: c.kind,
      ...(c.color ? { color: c.color } : {}),
      ...(c.icon ? { icon: c.icon } : {}),
    })),
  );

  return org.id;
}

export interface SpaceDetail extends SpaceSummary {
  settings: Record<string, unknown>;
}

/** Dettaglio di uno spazio, previa verifica della membership. */
export async function getSpace(spaceId: string): Promise<SpaceDetail> {
  const ctx = await requireSpaceMember(spaceId);
  const rows = await db
    .select({
      name: organization.name,
      type: spaceProfile.type,
      baseCurrency: spaceProfile.baseCurrency,
      settings: spaceProfile.settings,
    })
    .from(organization)
    .leftJoin(spaceProfile, eq(spaceProfile.organizationId, organization.id))
    .where(eq(organization.id, spaceId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error("Spazio non trovato");
  }

  return {
    id: spaceId,
    name: row.name,
    role: ctx.role,
    type: row.type ?? "personal",
    baseCurrency: row.baseCurrency ?? "EUR",
    settings: row.settings ?? {},
  };
}
