import Link from "next/link";
import { getSpace } from "@/server/dal/spaces";
import { listCategories } from "@/server/dal/categories";
import { budgetOverview } from "@/server/dal/budgets";
import type { BudgetPeriodType } from "@/db/schema";
import { formatMoney, money } from "@/lib/money";
import { currentYearMonth, monthLabel } from "@/lib/period";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetForm } from "./budget-form";
import { DeleteBudgetButton } from "./delete-budget-button";

export default async function BudgetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { spaceId } = await params;
  const { period } = await searchParams;
  const periodType: BudgetPeriodType = period === "annual" ? "annual" : "monthly";

  const { year, month } = currentYearMonth(new Date());

  const [space, categories, lines] = await Promise.all([
    getSpace(spaceId),
    listCategories(spaceId),
    budgetOverview(spaceId, periodType, year, month),
  ]);

  const currency = space.baseCurrency;
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const totalSpent = lines.reduce((s, l) => s + l.spent, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Budget</h2>
          <div className="flex gap-1 text-sm">
            <Link
              href={`/${spaceId}/budgets?period=monthly`}
              className={`rounded-md px-2 py-1 ${periodType === "monthly" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Mensile
            </Link>
            <Link
              href={`/${spaceId}/budgets?period=annual`}
              className={`rounded-md px-2 py-1 ${periodType === "annual" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Annuale
            </Link>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {periodType === "monthly"
            ? `Periodo: ${monthLabel(year, month)}`
            : `Periodo: anno ${year}`}{" "}
          · Speso {formatMoney(money(totalSpent, currency))} su{" "}
          {formatMoney(money(totalBudgeted, currency))}
        </p>

        {lines.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun budget {periodType === "monthly" ? "mensile" : "annuale"}.
            Creane uno dal pannello a destra.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((l) => {
              const pct = Math.min(100, l.percentUsed);
              const barColor = l.over
                ? "bg-destructive"
                : l.percentUsed >= 80
                  ? "bg-amber-500"
                  : "bg-green-600";
              return (
                <li key={l.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{l.categoryName ?? "—"}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">
                        {formatMoney(money(l.spent, currency))} /{" "}
                        {formatMoney(money(l.budgeted, currency))}
                      </span>
                      <DeleteBudgetButton spaceId={spaceId} budgetId={l.id} />
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.over
                      ? `Sforato di ${formatMoney(money(-l.remaining, currency))}`
                      : `Rimangono ${formatMoney(money(l.remaining, currency))}`}
                    {l.rollover && " · rollover attivo"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Nuovo budget</CardTitle>
            <CardDescription>
              Imposta un limite di spesa per categoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Crea prima delle categorie di spesa.
              </p>
            ) : (
              <BudgetForm
                spaceId={spaceId}
                categories={expenseCategories.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                defaultPeriod={periodType}
              />
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
