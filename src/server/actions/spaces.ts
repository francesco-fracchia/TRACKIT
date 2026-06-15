"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSpaceSchema, type CreateSpaceFormInput } from "@/lib/validation/space";
import { createSpace, deleteSpace, getSpace } from "@/server/dal/spaces";
import { requireUser } from "@/server/dal/context";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export interface ActionError {
  error: string;
}

/**
 * Crea uno spazio e reindirizza alla sua dashboard. Valida sempre l'input
 * con Zod (mai fidarsi del client). In caso di errore di validazione
 * restituisce un messaggio; in caso di successo fa redirect.
 */
export async function createSpaceAction(
  input: CreateSpaceFormInput,
): Promise<ActionError | never> {
  const parsed = createSpaceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const ctx = await requireUser();
  const spaceId = await createSpace(parsed.data);

  const h = await headers();
  await writeAuditLog({
    action: "space.created",
    actorUserId: ctx.userId,
    organizationId: spaceId,
    entityType: "space",
    entityId: spaceId,
    metadata: { name: parsed.data.name, type: parsed.data.type },
    ip: getClientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  redirect(`/${spaceId}/dashboard`);
}

/**
 * Elimina definitivamente uno spazio. Richiede che il nome digitato combaci
 * (conferma esplicita) e — nel DAL — il ruolo owner. Reindirizza alla lista.
 */
export async function deleteSpaceAction(
  spaceId: string,
  confirmName: string,
): Promise<ActionError | never> {
  const ctx = await requireUser();
  const space = await getSpace(spaceId); // verifica membership + recupera nome

  if (confirmName.trim() !== space.name) {
    return { error: "Il nome digitato non corrisponde" };
  }

  const h = await headers();
  await writeAuditLog({
    action: "space.deleted",
    actorUserId: ctx.userId,
    organizationId: spaceId,
    entityType: "space",
    entityId: spaceId,
    metadata: { name: space.name, type: space.type },
    ip: getClientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  await deleteSpace(spaceId); // verifica owner + cancellazione completa

  redirect("/spaces");
}
