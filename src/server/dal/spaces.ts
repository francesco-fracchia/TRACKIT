import "server-only";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
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
import { listAccounts } from "./accounts";
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

export interface SpaceWithTotal extends SpaceSummary {
  /** Saldo totale nella valuta base dello spazio (centesimi). */
  totalBalance: number;
  accountCount: number;
}

/**
 * Tutti gli spazi dell'utente con il saldo totale calcolato per ciascuno
 * (somma dei conti nella valuta base dello spazio). Per la vista d'insieme.
 */
export async function listMySpacesWithTotals(): Promise<SpaceWithTotal[]> {
  const spaces = await listMySpaces();
  return Promise.all(
    spaces.map(async (s) => {
      const accounts = await listAccounts(s.id);
      const totalBalance = accounts
        .filter((a) => a.currency === s.baseCurrency)
        .reduce((sum, a) => sum + a.balance, 0);
      return { ...s, totalBalance, accountCount: accounts.length };
    }),
  );
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

/**
 * Elimina DEFINITIVAMENTE uno spazio e tutti i suoi dati. Solo l'owner.
 * Cancellazione esplicita e deterministica (non ci affidiamo al cascade del
 * DB: su Turso l'enforcement delle FK non è garantito). Atomica via transaction.
 * Gli audit log NON vengono cancellati (storico immutabile).
 */
export async function deleteSpace(spaceId: string): Promise<void> {
  await requireSpaceMember(spaceId, "owner");

  await db.transaction(async (tx) => {
    // 1. Tabelle figlie senza organizationId (via i rispettivi padri dello spazio).
    await tx.delete(schema.transactionTag).where(
      inArray(
        schema.transactionTag.transactionId,
        tx
          .select({ id: schema.transaction.id })
          .from(schema.transaction)
          .where(eq(schema.transaction.organizationId, spaceId)),
      ),
    );
    await tx.delete(schema.expense_split).where(
      inArray(
        schema.expense_split.sharedExpenseId,
        tx
          .select({ id: schema.shared_expense.id })
          .from(schema.shared_expense)
          .where(eq(schema.shared_expense.organizationId, spaceId)),
      ),
    );
    await tx.delete(schema.reviewActionItem).where(
      inArray(
        schema.reviewActionItem.reviewId,
        tx
          .select({ id: schema.monthlyReview.id })
          .from(schema.monthlyReview)
          .where(eq(schema.monthlyReview.organizationId, spaceId)),
      ),
    );

    // 2. Tabelle di dominio con organizationId.
    await tx.delete(schema.transaction).where(eq(schema.transaction.organizationId, spaceId));
    await tx.delete(schema.attachment).where(eq(schema.attachment.organizationId, spaceId));
    await tx.delete(schema.recurringRule).where(eq(schema.recurringRule.organizationId, spaceId));
    await tx.delete(schema.budget).where(eq(schema.budget.organizationId, spaceId));
    await tx.delete(schema.settlement).where(eq(schema.settlement.organizationId, spaceId));
    await tx.delete(schema.shared_expense).where(eq(schema.shared_expense.organizationId, spaceId));
    await tx.delete(schema.netWorthSnapshot).where(eq(schema.netWorthSnapshot.organizationId, spaceId));
    await tx.delete(schema.liability).where(eq(schema.liability.organizationId, spaceId));
    await tx.delete(schema.goal).where(eq(schema.goal.organizationId, spaceId));
    await tx.delete(schema.monthlyReview).where(eq(schema.monthlyReview.organizationId, spaceId));
    await tx.delete(schema.categoryRule).where(eq(schema.categoryRule.organizationId, spaceId));
    await tx.delete(schema.importMappingPreset).where(eq(schema.importMappingPreset.organizationId, spaceId));
    await tx.delete(schema.importBatch).where(eq(schema.importBatch.organizationId, spaceId));
    await tx.delete(schema.tag).where(eq(schema.tag.organizationId, spaceId));
    await tx.delete(schema.category).where(eq(schema.category.organizationId, spaceId));
    await tx.delete(schema.financialAccount).where(eq(schema.financialAccount.organizationId, spaceId));
    await tx.delete(schema.spaceProfile).where(eq(schema.spaceProfile.organizationId, spaceId));

    // 3. Membership/inviti e infine l'organizzazione.
    await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, spaceId));
    await tx.delete(schema.member).where(eq(schema.member.organizationId, spaceId));
    await tx.delete(schema.organization).where(eq(schema.organization.id, spaceId));
  });
}
