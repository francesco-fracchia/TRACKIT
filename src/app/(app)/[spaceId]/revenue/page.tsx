import Link from "next/link";
import { getSpace } from "@/server/dal/spaces";
import { revenueStats } from "@/server/dal/analytics";
import { formatMoney, money } from "@/lib/money";
import { currentYearMonth, shortMonthLabel } from "@/lib/period";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RevenueChart } from "./revenue-chart";

export default async function RevenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { spaceId } = await params;
  const { year: yearParam } = await searchParams;
  const { year: currentYear } = currentYearMonth(new Date());
  const year = Number(yearParam) || currentYear;

  const [space, stats] = await Promise.all([
    getSpace(spaceId),
    revenueStats(spaceId, year),
  ]);
  const currency = space.baseCurrency;

  const monthsWithRevenue = stats.monthly.filter((m) => m.income > 0).length;
  const avgMonth =
    monthsWithRevenue > 0 ? Math.round(stats.totalYear / monthsWithRevenue) : 0;

  const chartData = stats.monthly.map((m) => ({
    label: shortMonthLabel(m.month),
    fatturato: m.income / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fatturato</h2>
          <p className="text-sm text-muted-foreground">
            Entrate di {space.name} — totale, per anno e per mese.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {stats.years.slice(0, 6).map((y) => (
            <Link
              key={y}
              href={`/${spaceId}/revenue?year=${y}`}
              className={`rounded-md px-2 py-1 ${y === year ? "bg-secondary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fatturato {year}</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-green-600 dark:text-green-500">
              {formatMoney(money(stats.totalYear, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Media mensile {year}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(money(avgMonth, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fatturato totale (sempre)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(money(stats.totalAllTime, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-medium">Fatturato per mese ({year})</h3>
        <RevenueChart data={chartData} currency={currency} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Mese</th>
              <th className="px-3 py-2 text-right font-medium">Fatturato</th>
            </tr>
          </thead>
          <tbody>
            {stats.monthly.map((m) => (
              <tr key={m.month} className="border-b last:border-0">
                <td className="px-3 py-2">
                  {shortMonthLabel(m.month)} {year}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMoney(money(m.income, currency))}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-medium">
              <td className="px-3 py-2">Totale {year}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatMoney(money(stats.totalYear, currency))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
