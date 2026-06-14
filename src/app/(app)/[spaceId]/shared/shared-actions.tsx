"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteSharedExpenseAction,
  recordSettlementAction,
} from "@/server/actions/sharing";
import { Button } from "@/components/ui/button";

export function DeleteExpenseButton({
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
      aria-label="Elimina spesa"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteSharedExpenseAction(spaceId, id);
        })
      }
    >
      <Trash2 aria-hidden className="text-muted-foreground" />
    </Button>
  );
}

export function SettleButton({
  spaceId,
  from,
  to,
  amount,
  today,
}: {
  spaceId: string;
  from: string;
  to: string;
  amount: number;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          const cents = `${Math.floor(amount / 100)},${String(amount % 100).padStart(2, "0")}`;
          const res = await recordSettlementAction(spaceId, {
            fromUser: from,
            toUser: to,
            amount: cents,
            date: today,
          });
          if (!res.error) setDone(true);
        })
      }
    >
      {done ? "Saldato" : "Segna saldato"}
    </Button>
  );
}
