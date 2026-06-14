"use client";

import { useTransition } from "react";
import { openReviewAction } from "@/server/actions/reviews";
import { Button } from "@/components/ui/button";

export function OpenReviewButton({
  spaceId,
  period,
  label,
}: {
  spaceId: string;
  period: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await openReviewAction(spaceId, period);
        })
      }
    >
      {pending ? "Apertura…" : label}
    </Button>
  );
}
