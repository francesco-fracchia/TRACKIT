"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransactionSchema,
  type CreateTransactionFormInput,
} from "@/lib/validation/ledger";
import { createTransactionAction } from "@/server/actions/transactions";
import { uploadAttachmentAction } from "@/server/actions/attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccountOpt {
  id: string;
  name: string;
}
interface CategoryOpt {
  id: string;
  name: string;
  kind: "income" | "expense";
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TYPE_LABELS: Record<string, string> = {
  expense: "Uscita",
  income: "Entrata",
  transfer: "Trasferimento",
};

export function CreateTransactionForm({
  spaceId,
  accounts,
  categories,
  today,
  attachmentsEnabled,
  payees = [],
}: {
  spaceId: string;
  accounts: AccountOpt[];
  categories: CategoryOpt[];
  today: string;
  attachmentsEnabled: boolean;
  payees?: string[];
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionFormInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "expense",
      accountId: accounts[0]?.id ?? "",
      valueDate: today,
      amount: "",
    },
  });

  const type = watch("type");
  const accountId = watch("accountId");
  const relevantCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  async function onSubmit(values: CreateTransactionFormInput) {
    setServerError(null);
    // Converte i tag da stringa separata da virgole ad array.
    const rawTags = (values as { tagsRaw?: string }).tagsRaw ?? "";
    const tags = rawTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Se è stato scelto un file, caricalo prima e collega l'allegato.
    let attachmentId: string | undefined;
    const file = fileRef.current?.files?.[0];
    if (attachmentsEnabled && file) {
      const fd = new FormData();
      fd.set("file", file);
      const up = await uploadAttachmentAction(spaceId, fd);
      if (up.error) {
        setServerError(up.error);
        return;
      }
      attachmentId = up.id;
    }

    const res = await createTransactionAction(spaceId, {
      ...values,
      tags,
      attachmentId,
    });
    if (res.error) {
      setServerError(res.error);
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    reset({
      type: values.type,
      accountId: values.accountId,
      valueDate: values.valueDate,
      amount: "",
      payee: "",
      note: "",
      categoryId: "",
    });
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea prima un conto per registrare transazioni.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tx-type">Tipo</Label>
          <select id="tx-type" className={selectClass} {...register("type")}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-amount">Importo</Label>
          <Input id="tx-amount" placeholder="0,00" {...register("amount")} />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tx-account">
            {type === "transfer" ? "Dal conto" : "Conto"}
          </Label>
          <select id="tx-account" className={selectClass} {...register("accountId")}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {type === "transfer" ? (
          <div className="space-y-2">
            <Label htmlFor="tx-counter">Al conto</Label>
            <select
              id="tx-counter"
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
          <div className="space-y-2">
            <Label htmlFor="tx-category">Categoria</Label>
            <select
              id="tx-category"
              className={selectClass}
              {...register("categoryId")}
            >
              <option value="">Nessuna</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tx-date">Data</Label>
          <Input id="tx-date" type="date" {...register("valueDate")} />
          {errors.valueDate && (
            <p className="text-sm text-destructive">{errors.valueDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-payee">Beneficiario / Pagatore</Label>
          <Input
            id="tx-payee"
            placeholder="Es. Supermercato"
            list="tx-payees"
            autoComplete="off"
            {...register("payee")}
          />
          <datalist id="tx-payees">
            {payees.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-tags">Tag (separati da virgola)</Label>
        <Input
          id="tx-tags"
          placeholder="vacanza, lavoro"
          {...register("tagsRaw" as keyof CreateTransactionFormInput)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-note">Nota</Label>
        <Input id="tx-note" {...register("note")} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          {...register("excludeFromBalance")}
        />
        <span>
          Solo storico — non incide sul saldo
          <span className="block text-xs text-muted-foreground">
            Per inserire movimenti passati: compaiono nei grafici e report ma
            non modificano il saldo del conto.
          </span>
        </span>
      </label>

      {attachmentsEnabled && (
        <div className="space-y-2">
          <Label htmlFor="tx-file">Allegato (ricevuta, PDF/immagine)</Label>
          <input
            id="tx-file"
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm"
          />
        </div>
      )}

      {serverError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio…" : "Aggiungi transazione"}
      </Button>
    </form>
  );
}
