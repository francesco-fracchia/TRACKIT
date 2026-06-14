"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inviteMemberSchema,
  type InviteMemberValues,
  INVITE_ROLE_VALUES,
} from "@/lib/validation/space";
import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MemberView {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}
interface InvitationView {
  id: string;
  email: string;
  role: string | null;
}

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietario",
  admin: "Amministratore",
  member: "Membro",
  viewer: "Osservatore",
};

export function MembersAdmin({
  spaceId,
  members,
  invitations,
  currentUserId,
  canManage,
}: {
  spaceId: string;
  members: MemberView[];
  invitations: InvitationView[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: "member" },
  });

  async function onInvite(values: InviteMemberValues) {
    setError(null);
    const { error } = await authClient.organization.inviteMember({
      email: values.email,
      role: values.role,
      organizationId: spaceId,
    });
    if (error) {
      setError(error.message ?? "Invito non riuscito");
      return;
    }
    reset({ role: "member", email: "" });
    router.refresh();
  }

  async function changeRole(memberId: string, role: string) {
    setBusy(true);
    await authClient.organization.updateMemberRole({
      memberId,
      role: role as "admin" | "member" | "viewer" | "owner",
      organizationId: spaceId,
    });
    setBusy(false);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setBusy(true);
    await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId: spaceId,
    });
    setBusy(false);
    router.refresh();
  }

  async function cancelInvite(invitationId: string) {
    setBusy(true);
    await authClient.organization.cancelInvitation({ invitationId });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border">
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const isOwner = m.role === "owner";
          return (
            <li
              key={m.memberId}
              className="flex items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.name} {isSelf && <span className="text-xs">(tu)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && !isOwner && !isSelf ? (
                  <>
                    <select
                      className={selectClass}
                      defaultValue={m.role}
                      disabled={busy}
                      onChange={(e) => changeRole(m.memberId, e.target.value)}
                      aria-label={`Ruolo di ${m.name}`}
                    >
                      {INVITE_ROLE_VALUES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => removeMember(m.memberId)}
                    >
                      Rimuovi
                    </Button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {invitations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Inviti in sospeso
          </h3>
          <ul className="divide-y rounded-lg border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>
                  {inv.email}{" "}
                  <span className="text-muted-foreground">
                    ({ROLE_LABELS[inv.role ?? "member"] ?? inv.role})
                  </span>
                </span>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => cancelInvite(inv.id)}
                  >
                    Annulla
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <form
          onSubmit={handleSubmit(onInvite)}
          noValidate
          className="flex flex-wrap items-end gap-2 rounded-lg border p-4"
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="invite-email">Invita per email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="persona@esempio.it"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Ruolo</Label>
            <select id="invite-role" className={selectClass + " h-9"} {...register("role")}>
              {INVITE_ROLE_VALUES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Invio…" : "Invita"}
          </Button>
          {error && (
            <p role="alert" className="w-full text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
