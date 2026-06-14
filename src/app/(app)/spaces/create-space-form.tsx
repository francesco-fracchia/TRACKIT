"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createSpaceSchema,
  type CreateSpaceFormInput,
} from "@/lib/validation/space";
import { createSpaceAction } from "@/server/actions/spaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_LABELS: Record<string, string> = {
  personal: "Personale",
  business: "Business",
  shared: "Condiviso",
};

export function CreateSpaceForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSpaceFormInput>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: { type: "personal", baseCurrency: "EUR" },
  });

  async function onSubmit(values: CreateSpaceFormInput) {
    setServerError(null);
    const res = await createSpaceAction(values);
    // In caso di successo l'action fa redirect; qui gestiamo solo l'errore.
    if (res?.error) setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome dello spazio</Label>
        <Input id="name" placeholder="Es. Famiglia, Azienda…" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("type")}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseCurrency">Valuta base</Label>
          <Input
            id="baseCurrency"
            maxLength={3}
            className="uppercase"
            {...register("baseCurrency")}
          />
          {errors.baseCurrency && (
            <p className="text-sm text-destructive">
              {errors.baseCurrency.message}
            </p>
          )}
        </div>
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creazione…" : "Crea spazio"}
      </Button>
    </form>
  );
}
