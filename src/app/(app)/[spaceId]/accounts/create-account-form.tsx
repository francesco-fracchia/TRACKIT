"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAccountSchema,
  type CreateAccountFormInput,
} from "@/lib/validation/ledger";
import { createAccountAction } from "@/server/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_LABELS: Record<string, string> = {
  bank: "Banca",
  cash: "Contanti",
  card: "Carta",
  ewallet: "E-wallet",
  other: "Altro",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CreateAccountForm({
  spaceId,
  baseCurrency,
}: {
  spaceId: string;
  baseCurrency: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { type: "bank", currency: baseCurrency, initialBalance: "0" },
  });

  async function onSubmit(values: CreateAccountFormInput) {
    setServerError(null);
    const res = await createAccountAction(spaceId, values);
    if (res.error) {
      setServerError(res.error);
      return;
    }
    reset({ type: "bank", currency: baseCurrency, initialBalance: "0", name: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="acc-name">Nome del conto</Label>
        <Input id="acc-name" placeholder="Es. Conto corrente" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="acc-type">Tipo</Label>
          <select id="acc-type" className={selectClass} {...register("type")}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-currency">Valuta</Label>
          <Input
            id="acc-currency"
            maxLength={3}
            className="uppercase"
            {...register("currency")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-initial">Saldo iniziale</Label>
          <Input id="acc-initial" placeholder="0,00" {...register("initialBalance")} />
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
        {isSubmitting ? "Creazione…" : "Aggiungi conto"}
      </Button>
    </form>
  );
}
