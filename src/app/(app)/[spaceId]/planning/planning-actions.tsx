"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteRecurringAction,
  postDueRecurringAction,
} from "@/server/actions/recurring";
import { Button } from "@/components/ui/button";

export function PostDueButton({ spaceId }: { spaceId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await postDueRecurringAction(spaceId);
            setMsg(
              res.posted
                ? `Registrate ${res.posted} transazioni`
                : "Nessuna scadenza da registrare",
            );
          })
        }
      >
        {pending ? "Elaborazione…" : "Registra scadute"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

export function DeleteRecurringButton({
  spaceId,
  id,
}: {
  spaceId: string;
  id: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Elimina ricorrenza"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteRecurringAction(spaceId, id);
        })
      }
    >
      <Trash2 aria-hidden className="text-muted-foreground" />
    </Button>
  );
}
