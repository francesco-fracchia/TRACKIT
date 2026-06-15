import { Fragment } from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { listAccountOptions } from "@/server/dal/accounts";
import { listCategories } from "@/server/dal/categories";
import { attachmentsEnabled } from "@/server/dal/attachments";
import {
  listTransactions,
  listPayees,
  type TransactionFilter,
  type TransactionRow,
} from "@/server/dal/transactions";
import type { TransactionType } from "@/db/schema";
import { formatMoney, money } from "@/lib/money";
import { formatDateLong } from "@/lib/period";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTransactionForm } from "./create-transaction-form";
import { DeleteTransactionButton } from "./delete-transaction-button";

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Uscita",
  income: "Entrata",
  transfer: "Trasferimento",
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const inputClass = selectClass;

function todayISO(): string {
  // Data odierna in formato YYYY-MM-DD (locale del server).
  return new Date().toISOString().slice(0, 10);
}

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { spaceId } = await params;
  const sp = await searchParams;

  const typeParam = str(sp.type);
  const filter: TransactionFilter = {
    accountId: str(sp.account),
    type:
      typeParam === "income" || typeParam === "expense" || typeParam === "transfer"
        ? typeParam
        : undefined,
    categoryId: str(sp.category),
    from: str(sp.from),
    to: str(sp.to),
    q: str(sp.q),
    page: Number(str(sp.page) ?? "1") || 1,
  };

  const [accounts, categories, result, payees] = await Promise.all([
    listAccountOptions(spaceId),
    listCategories(spaceId),
    listTransactions(spaceId, filter),
    listPayees(spaceId),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  // Raggruppa le transazioni per giorno (sono già ordinate per data desc).
  const groups: { date: string; rows: TransactionRow[] }[] = [];
  for (const row of result.rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.valueDate) last.rows.push(row);
    else groups.push({ date: row.valueDate, rows: [row] });
  }

  function pageHref(page: number): string {
    const q = new URLSearchParams();
    if (filter.accountId) q.set("account", filter.accountId);
    if (filter.type) q.set("type", filter.type);
    if (filter.categoryId) q.set("category", filter.categoryId);
    if (filter.from) q.set("from", filter.from);
    if (filter.to) q.set("to", filter.to);
    if (filter.q) q.set("q", filter.q);
    q.set("page", String(page));
    return `/${spaceId}/transactions?${q.toString()}`;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Transazioni</h2>

        {/* Filtri (GET form, niente JS) */}
        <form className="flex flex-wrap items-end gap-2" method="get">
          <select name="type" defaultValue={filter.type ?? ""} className={selectClass} aria-label="Tipo">
            <option value="">Tutti i tipi</option>
            <option value="expense">Uscite</option>
            <option value="income">Entrate</option>
            <option value="transfer">Trasferimenti</option>
          </select>
          <select name="account" defaultValue={filter.accountId ?? ""} className={selectClass} aria-label="Conto">
            <option value="">Tutti i conti</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={filter.from ?? ""} className={inputClass} aria-label="Da" />
          <input type="date" name="to" defaultValue={filter.to ?? ""} className={inputClass} aria-label="A" />
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder="Cerca…"
            className={inputClass}
            aria-label="Cerca"
          />
          <Button type="submit" variant="secondary" size="sm">
            Filtra
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${spaceId}/transactions`}>Azzera</Link>
          </Button>
        </form>

        {result.rows.length === 0 ? (
          <p className="text-muted-foreground">Nessuna transazione trovata.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Descrizione</th>
                  <th className="px-3 py-2 font-medium">Conto</th>
                  <th className="px-3 py-2 text-right font-medium">Importo</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  // Totale del giorno (se i movimenti sono nella stessa valuta).
                  const currencies = new Set(group.rows.map((r) => r.currency));
                  const dayNet = group.rows.reduce(
                    (s, r) =>
                      s +
                      (r.type === "income"
                        ? r.amount
                        : r.type === "expense"
                          ? -r.amount
                          : 0),
                    0,
                  );
                  const dayCurrency = group.rows[0]?.currency ?? "EUR";
                  return (
                    <Fragment key={group.date}>
                      <tr className="border-b bg-muted/30">
                        <td
                          colSpan={3}
                          className="px-3 py-1.5 text-xs font-semibold capitalize text-muted-foreground"
                        >
                          {formatDateLong(group.date)}
                          {currencies.size === 1 && dayNet !== 0 && (
                            <span className="ml-2 font-mono font-normal normal-case tabular-nums">
                              ({dayNet > 0 ? "+" : "−"}
                              {formatMoney(money(Math.abs(dayNet), dayCurrency))})
                            </span>
                          )}
                        </td>
                        <td className="bg-muted/30" />
                      </tr>
                      {group.rows.map((t) => {
                        const sign =
                          t.type === "income"
                            ? 1
                            : t.type === "expense"
                              ? -1
                              : 0;
                        const amountColor =
                          t.type === "income"
                            ? "text-green-600 dark:text-green-500"
                            : t.type === "expense"
                              ? "text-destructive"
                              : "text-muted-foreground";
                        return (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 font-medium">
                                {t.payee || TYPE_LABELS[t.type]}
                                {t.attachmentUrl && (
                                  <a
                                    href={t.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Apri allegato"
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Paperclip className="size-3.5" aria-hidden />
                                  </a>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t.type === "transfer"
                                  ? `→ ${t.counterAccountName ?? ""}`
                                  : t.categoryName ?? "—"}
                                {t.tags.length > 0 && ` · ${t.tags.join(", ")}`}
                                {t.excludeFromBalance && (
                                  <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                                    storico
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {t.accountName}
                            </td>
                            <td
                              className={`whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums ${amountColor}`}
                            >
                              {sign < 0 ? "−" : sign > 0 ? "+" : ""}
                              {formatMoney(money(t.amount, t.currency))}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <DeleteTransactionButton
                                spaceId={spaceId}
                                txId={t.id}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Pagina {result.page} di {totalPages} · {result.total} totali
            </span>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={result.page <= 1}
              >
                <Link href={pageHref(Math.max(1, result.page - 1))}>
                  Precedente
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={result.page >= totalPages}
              >
                <Link href={pageHref(Math.min(totalPages, result.page + 1))}>
                  Successiva
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Nuova transazione</CardTitle>
            <CardDescription>Entrata, uscita o trasferimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTransactionForm
              spaceId={spaceId}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
              categories={categories.map((c) => ({
                id: c.id,
                name: c.name,
                kind: c.kind,
              }))}
              today={todayISO()}
              attachmentsEnabled={attachmentsEnabled()}
              payees={payees}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
