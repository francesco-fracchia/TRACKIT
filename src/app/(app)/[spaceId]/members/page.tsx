import { getSpace } from "@/server/dal/spaces";
import { listMembers, listPendingInvitations } from "@/server/dal/members";
import { requireUser } from "@/server/dal/context";
import { hasSufficientRole } from "@/server/dal/roles";
import { MembersAdmin } from "./members-admin";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const [space, ctx, members, invitations] = await Promise.all([
    getSpace(spaceId),
    requireUser(),
    listMembers(spaceId),
    listPendingInvitations(spaceId),
  ]);

  const canManage = hasSufficientRole(space.role, "admin");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Membri</h2>
        <p className="text-sm text-muted-foreground">
          {space.type === "shared"
            ? "Gestisci chi condivide questo spazio e con quale ruolo."
            : "Invita altre persone per condividere questo spazio."}
        </p>
      </div>

      <MembersAdmin
        spaceId={spaceId}
        members={members}
        invitations={invitations}
        currentUserId={ctx.userId}
        canManage={canManage}
      />
    </div>
  );
}
