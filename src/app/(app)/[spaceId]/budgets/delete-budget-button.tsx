"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteBudgetAction } from "@/server/actions/budgets";
import { Button } from "@/components/ui/button";

export function DeleteBudgetButton({
  spaceId,
  budgetId,
}: {
  spaceId: string;
  budgetId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Elimina budget"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteBudgetAction(spaceId, budgetId);
        })
      }
    >
      <Trash2 aria-hidden className="text-muted-foreground" />
    </Button>
  );
}
