"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  setGoalCurrentAction,
  deleteGoalAction,
} from "@/server/actions/wealth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GoalControls({
  spaceId,
  goalId,
  manual,
}: {
  spaceId: string;
  goalId: string;
  manual: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");

  return (
    <div className="flex items-center gap-2">
      {manual && (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            startTransition(async () => {
              await setGoalCurrentAction(spaceId, goalId, value);
              setValue("");
            });
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Aggiorna"
            className="h-8 w-24"
            aria-label="Nuovo importo accumulato"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            Salva
          </Button>
        </form>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Elimina obiettivo"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteGoalAction(spaceId, goalId);
          })
        }
      >
        <Trash2 aria-hidden className="text-muted-foreground" />
      </Button>
    </div>
  );
}
