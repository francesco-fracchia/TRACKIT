import Link from "next/link";
import { getSpace } from "@/server/dal/spaces";
import { listAccounts } from "@/server/dal/accounts";
import {
  cashflowByMonth,
  incomeVsExpense,
  spentByCategory,
} from "@/server/dal/analytics";
import { formatMoney, money } from "@/lib/money";
import { currentYearMonth, monthRange, shortMonthLabel } from "@/lib/period";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "./dashboard-charts";

export default async function SpaceDashboardPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const { year, month } = currentYearMonth(new Date());
  const range = monthRange(year, month);

  const [space, accounts, ie, cashflow, byCat] = await Promise.all([
    getSpace(spaceId),
    listAccounts(spaceId),
    incomeVsExpense(spaceId, range.from, range.to),
    cashflowByMonth(spaceId, year),
    spentByCategory(spaceId, range.from, range.to),
  ]);

  const currency = space.baseCurrency;
  const totalCents = accounts
    .filter((a) => a.currency === currency)
    .reduce((sum, a) => sum + a.balance, 0);
  const net = ie.income - ie.expense;

  // Converte i centesimi in unità maggiori per i grafici.
  const cashflowData = cashflow.map((m) => ({
    label: shortMonthLabel(m.month),
    income: m.income / 100,
    expense: m.expense / 100,
  }));
  const categoryData = byCat
    .filter((c) => c.spent > 0)
    .map((c) => ({ name: c.categoryName ?? "Senza categoria", value: c.spent / 100 }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo totale</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {formatMoney(money(totalCents, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entrate (mese)</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-600 dark:text-green-500">
              {formatMoney(money(ie.income, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uscite (mese)</CardDescription>
            <CardTitle className="text-xl tabular-nums text-destructive">
              {formatMoney(money(ie.expense, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo del mese</CardDescription>
            <CardTitle
              className={`text-xl tabular-nums ${net >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}`}
            >
              {formatMoney(money(net, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DashboardCharts
        cashflow={cashflowData}
        byCategory={categoryData}
        currency={currency}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Conti</CardTitle>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${spaceId}/transactions`}>Transazioni</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/${spaceId}/export/transactions.csv`}>Esporta CSV</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/${spaceId}/export/report.pdf`}>Report PDF</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground">
              Inizia creando un conto in{" "}
              <Link href={`/${spaceId}/accounts`} className="underline underline-offset-4">
                Conti
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {accounts.map((a) => (
                <li key={a.id} className="flex justify-between py-2">
                  <span>{a.name}</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(money(a.balance, a.currency))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
