"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  upsertBudgetSchema,
  type UpsertBudgetFormInput,
} from "@/lib/validation/budget";
import { upsertBudgetAction } from "@/server/actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BudgetForm({
  spaceId,
  categories,
  defaultPeriod,
}: {
  spaceId: string;
  categories: { id: string; name: string }[];
  defaultPeriod: "monthly" | "annual";
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpsertBudgetFormInput>({
    resolver: zodResolver(upsertBudgetSchema),
    defaultValues: { periodType: defaultPeriod, rollover: false },
  });

  async function onSubmit(values: UpsertBudgetFormInput) {
    setServerError(null);
    const res = await upsertBudgetAction(spaceId, values);
    if (res.error) {
      setServerError(res.error);
      return;
    }
    reset({ periodType: values.periodType, rollover: false, amount: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="b-category">Categoria</Label>
        <select id="b-category" className={selectClass} {...register("categoryId")}>
          <option value="">Seleziona…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-sm text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="b-period">Periodo</Label>
          <select id="b-period" className={selectClass} {...register("periodType")}>
            <option value="monthly">Mensile</option>
            <option value="annual">Annuale</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-amount">Importo</Label>
          <Input id="b-amount" placeholder="0,00" {...register("amount")} />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("rollover")} />
        Riporta l&apos;inutilizzato al periodo successivo (rollover)
      </label>

      {serverError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio…" : "Salva budget"}
      </Button>
    </form>
  );
}
