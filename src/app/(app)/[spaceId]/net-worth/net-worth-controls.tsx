"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import {
  createLiabilitySchema,
  type CreateLiabilityFormInput,
} from "@/lib/validation/wealth";
import {
  createLiabilityAction,
  deleteLiabilityAction,
  createSnapshotAction,
} from "@/server/actions/wealth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SnapshotButton({ spaceId }: { spaceId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await createSnapshotAction(spaceId);
            setMsg("Snapshot salvato");
          })
        }
      >
        {pending ? "Salvataggio…" : "Salva snapshot di oggi"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

export function DeleteLiabilityButton({
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
      aria-label="Elimina passività"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteLiabilityAction(spaceId, id);
        })
      }
    >
      <Trash2 aria-hidden className="text-muted-foreground" />
    </Button>
  );
}

export function LiabilityForm({ spaceId }: { spaceId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLiabilityFormInput>({
    resolver: zodResolver(createLiabilitySchema),
  });

  async function onSubmit(values: CreateLiabilityFormInput) {
    setServerError(null);
    const res = await createLiabilityAction(spaceId, values);
    if (res.error) {
      setServerError(res.error);
      return;
    }
    reset({ name: "", balance: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="l-name">Nome</Label>
        <Input id="l-name" placeholder="Es. Mutuo, prestito" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="l-balance">Importo dovuto</Label>
        <Input id="l-balance" placeholder="0,00" {...register("balance")} />
        {errors.balance && (
          <p className="text-sm text-destructive">{errors.balance.message}</p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio…" : "Aggiungi passività"}
      </Button>
    </form>
  );
}
