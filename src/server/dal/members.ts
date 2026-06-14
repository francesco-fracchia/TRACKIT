import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invitation, member, user } from "@/db/schema";
import { requireSpaceMember } from "./context";
import type { Role } from "./roles";

export interface SpaceMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string | null;
}

export async function listMembers(spaceId: string): Promise<SpaceMember[]> {
  await requireSpaceMember(spaceId);
  const rows = await db
    .select({
      memberId: member.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, spaceId));

  return rows.map((r) => ({ ...r, role: (r.role as Role) ?? "viewer" }));
}

export async function listPendingInvitations(
  spaceId: string,
): Promise<PendingInvitation[]> {
  await requireSpaceMember(spaceId);
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, spaceId),
        eq(invitation.status, "pending"),
      ),
    );
}
