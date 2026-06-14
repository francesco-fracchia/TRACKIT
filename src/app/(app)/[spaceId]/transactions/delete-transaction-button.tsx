"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTransactionAction } from "@/server/actions/transactions";
import { Button } from "@/components/ui/button";

export function DeleteTransactionButton({
  spaceId,
  txId,
}: {
  spaceId: string;
  txId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteTransactionAction(spaceId, txId);
            })
          }
        >
          Conferma
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Annulla
        </Button>
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Elimina transazione"
      onClick={() => setConfirming(true)}
    >
      <Trash2 aria-hidden className="text-muted-foreground" />
    </Button>
  );
}
