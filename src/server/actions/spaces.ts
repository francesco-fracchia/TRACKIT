"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSpaceSchema, type CreateSpaceFormInput } from "@/lib/validation/space";
import { createSpace } from "@/server/dal/spaces";
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
