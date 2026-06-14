import "server-only";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import { hasSufficientRole, type Role } from "./roles";

/**
 * DATA ACCESS LAYER — contesto di sicurezza.
 *
 * Ogni operazione di dominio passa di qui. Nessuna fiducia nell'input del
 * client: lo `organizationId` (spazio) arrivato dal client è solo una *claim*,
 * verificata contro la tabella `member` lato server ad ogni richiesta.
 *
 * `server-only` impedisce l'inclusione accidentale in un bundle client.
 */

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Non autenticato") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Accesso negato") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AuthContext {
  userId: string;
  sessionId: string;
  email: string;
}

export interface SpaceContext extends AuthContext {
  organizationId: string;
  role: Role;
}

/** Richiede una sessione valida. Lancia UnauthorizedError altrimenti. */
export async function requireUser(): Promise<AuthContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return {
    userId: session.user.id,
    sessionId: session.session.id,
    email: session.user.email,
  };
}

/**
 * Richiede che l'utente autenticato sia membro dello spazio `organizationId`
 * con almeno il ruolo `minRole`. Restituisce il contesto verificato.
 *
 * Questa è la funzione da cui DEVE passare ogni query/mutazione che tocca i
 * dati di uno spazio: garantisce isolamento e controllo ruoli.
 */
export async function requireSpaceMember(
  organizationId: string,
  minRole: Role = "viewer",
): Promise<SpaceContext> {
  const ctx = await requireUser();

  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, ctx.userId),
      ),
    )
    .limit(1);

  const membership = rows[0];
  if (!membership) {
    throw new ForbiddenError("Non sei membro di questo spazio");
  }
  if (!hasSufficientRole(membership.role, minRole)) {
    throw new ForbiddenError("Ruolo insufficiente per questa operazione");
  }

  return { ...ctx, organizationId, role: membership.role as Role };
}
