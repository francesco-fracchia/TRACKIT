"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createGoalSchema,
  type CreateGoalFormInput,
} from "@/lib/validation/wealth";
import { createGoalAction } from "@/server/actions/wealth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function GoalForm({
  spaceId,
  accounts,
}: {
  spaceId: string;
  accounts: { id: string; name: string }[];
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGoalFormInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: { currentAmount: "0", linkedAccountId: "" },
  });

  const linked = watch("linkedAccountId");

  async function onSubmit(values: CreateGoalFormInput) {
    setServerError(null);
    const res = await createGoalAction(spaceId, values);
    if (res.error) {
      setServerError(res.error);
      return;
    }
    reset({ currentAmount: "0", linkedAccountId: "", name: "", targetAmount: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="g-name">Nome obiettivo</Label>
        <Input id="g-name" placeholder="Es. Fondo emergenza" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="g-target">Obiettivo</Label>
          <Input id="g-target" placeholder="0,00" {...register("targetAmount")} />
          {errors.targetAmount && (
            <p className="text-sm text-destructive">
              {errors.targetAmount.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="g-date">Data target</Label>
          <Input id="g-date" type="date" {...register("targetDate")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="g-account">Conto collegato (opzionale)</Label>
        <select id="g-account" className={selectClass} {...register("linkedAccountId")}>
          <option value="">Nessuno (importo manuale)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {!linked && (
        <div className="space-y-1">
          <Label htmlFor="g-current">Importo già accumulato</Label>
          <Input id="g-current" placeholder="0,00" {...register("currentAmount")} />
        </div>
      )}

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio…" : "Crea obiettivo"}
      </Button>
    </form>
  );
}
