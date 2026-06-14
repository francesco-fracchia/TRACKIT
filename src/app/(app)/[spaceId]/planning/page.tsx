import { getSpace } from "@/server/dal/spaces";
import { listAccountOptions } from "@/server/dal/accounts";
import { listCategories } from "@/server/dal/categories";
import { listRecurring, listUpcomingOccurrences } from "@/server/dal/recurring";
import { describeRRule } from "@/lib/recurrence";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecurringForm } from "./recurring-form";
import { PostDueButton, DeleteRecurringButton } from "./planning-actions";

const TYPE_LABELS: Record<string, string> = {
  expense: "Uscita",
  income: "Entrata",
  transfer: "Trasferimento",
};

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days))
    .toISOString()
    .slice(0, 10);
}

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, 60);

  const [space, accounts, categories, rules, upcoming] = await Promise.all([
    getSpace(spaceId),
    listAccountOptions(spaceId),
    listCategories(spaceId),
    listRecurring(spaceId, today),
    listUpcomingOccurrences(spaceId, today, horizon),
  ]);

  const currency = space.baseCurrency;
  const sign = (t: string) => (t === "income" ? "+" : t === "expense" ? "−" : "");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ricorrenze</h2>
          <PostDueButton spaceId={spaceId} />
        </div>

        {rules.length === 0 ? (
          <p className="text-muted-foreground">
            Nessuna ricorrenza. Definiscine una dal pannello a destra.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {r.payee || TYPE_LABELS[r.type]}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {describeRRule(r.rrule, "monthly")} ·{" "}
                      {r.mode === "auto_post" ? "auto" : "suggerita"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.accountName} · {r.categoryName ?? "—"} · prossima:{" "}
                    {r.nextOccurrence ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums">
                    {sign(r.type)}
                    {formatMoney(money(r.amount, currency))}
                  </span>
                  <DeleteRecurringButton spaceId={spaceId} id={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium">
            Prossime scadenze (60 giorni)
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna scadenza nel periodo.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {upcoming.slice(0, 30).map((o, i) => (
                <li key={i} className="flex justify-between px-4 py-2">
                  <span className="tabular-nums text-muted-foreground">
                    {o.date}
                  </span>
                  <span>{o.payee || TYPE_LABELS[o.type]}</span>
                  <span className="font-mono tabular-nums">
                    {sign(o.type)}
                    {formatMoney(money(o.amount, currency))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Nuova ricorrenza</CardTitle>
            <CardDescription>
              Es. stipendio, affitto, abbonamenti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecurringForm
              spaceId={spaceId}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
              categories={categories.map((c) => ({
                id: c.id,
                name: c.name,
                kind: c.kind,
              }))}
              today={today}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
