"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createRecurringSchema,
  type CreateRecurringFormInput,
} from "@/lib/validation/planning";
import { createRecurringAction } from "@/server/actions/recurring";
import { FREQUENCY_LABELS, FREQUENCIES } from "@/lib/recurrence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TYPE_LABELS: Record<string, string> = {
  expense: "Uscita",
  income: "Entrata",
  transfer: "Trasferimento",
};

export function RecurringForm({
  spaceId,
  accounts,
  categories,
  today,
}: {
  spaceId: string;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  today: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecurringFormInput>({
    resolver: zodResolver(createRecurringSchema),
    defaultValues: {
      type: "expense",
      accountId: accounts[0]?.id ?? "",
      frequency: "monthly",
      interval: 1,
      dtstart: today,
      mode: "suggest",
    },
  });

  const type = watch("type");
  const accountId = watch("accountId");
  const frequency = watch("frequency");
  const cats = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  async function onSubmit(values: CreateRecurringFormInput) {
    setServerError(null);
    const res = await createRecurringAction(spaceId, values);
    if (res.error) {
      setServerError(res.error);
      return;
    }
    reset({
      type: values.type,
      accountId: values.accountId,
      frequency: values.frequency,
      interval: values.interval,
      dtstart: values.dtstart,
      mode: values.mode,
      amount: "",
      payee: "",
      note: "",
    });
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea prima un conto per definire ricorrenze.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="r-type">Tipo</Label>
          <select id="r-type" className={selectClass} {...register("type")}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-amount">Importo</Label>
          <Input id="r-amount" placeholder="0,00" {...register("amount")} />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="r-account">
            {type === "transfer" ? "Dal conto" : "Conto"}
          </Label>
          <select id="r-account" className={selectClass} {...register("accountId")}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {type === "transfer" ? (
          <div className="space-y-1">
            <Label htmlFor="r-counter">Al conto</Label>
            <select
              id="r-counter"
              className={selectClass}
              {...register("counterAccountId")}
            >
              <option value="">Seleziona…</option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            {errors.counterAccountId && (
              <p className="text-sm text-destructive">
                {errors.counterAccountId.message}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="r-category">Categoria</Label>
            <select id="r-category" className={selectClass} {...register("categoryId")}>
              <option value="">Nessuna</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="r-freq">Frequenza</Label>
          <select id="r-freq" className={selectClass} {...register("frequency")}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        {frequency !== "once" && (
          <div className="space-y-1">
            <Label htmlFor="r-interval">Ogni</Label>
            <Input id="r-interval" type="number" min={1} {...register("interval")} />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="r-dtstart">
            {frequency === "once" ? "Data" : "Inizio"}
          </Label>
          <Input id="r-dtstart" type="date" {...register("dtstart")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="r-mode">Modalità</Label>
        <select id="r-mode" className={selectClass} {...register("mode")}>
          <option value="suggest">Suggerisci soltanto</option>
          <option value="auto_post">Registra automaticamente</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="r-payee">Beneficiario</Label>
        <Input id="r-payee" {...register("payee")} />
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio…" : "Aggiungi ricorrenza"}
      </Button>
    </form>
  );
}
