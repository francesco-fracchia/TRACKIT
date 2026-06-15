import Link from "next/link";
import { getSpace } from "@/server/dal/spaces";
import { vatReconciliation } from "@/server/dal/analytics";
import { formatMoney, money } from "@/lib/money";
import { currentYearMonth } from "@/lib/period";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function VatPage({
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

  const [space, vat] = await Promise.all([
    getSpace(spaceId),
    vatReconciliation(spaceId, year),
  ]);
  const currency = space.baseCurrency;

  const saldoColor = (n: number) =>
    n > 0 ? "text-destructive" : n < 0 ? "text-green-600 dark:text-green-500" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Riconciliazione IVA</h2>
          <p className="text-sm text-muted-foreground">
            IVA a debito (sulle entrate) − IVA a credito (sulle uscite), per
            trimestre. Saldo &gt; 0 = da versare.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {vat.years.slice(0, 6).map((y) => (
            <Link
              key={y}
              href={`/${spaceId}/vat?year=${y}`}
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
            <CardDescription>IVA a debito {year}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(money(vat.total.debito, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>IVA a credito {year}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(money(vat.total.credito, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo IVA {year}</CardDescription>
            <CardTitle className={`text-2xl tabular-nums ${saldoColor(vat.total.saldo)}`}>
              {formatMoney(money(vat.total.saldo, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Trimestre</th>
              <th className="px-3 py-2 text-right font-medium">IVA a debito</th>
              <th className="px-3 py-2 text-right font-medium">IVA a credito</th>
              <th className="px-3 py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {vat.quarters.map((q) => (
              <tr key={q.quarter} className="border-b last:border-0">
                <td className="px-3 py-2">
                  T{q.quarter} ({(q.quarter - 1) * 3 + 1}–{q.quarter * 3})
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMoney(money(q.debito, currency))}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMoney(money(q.credito, currency))}
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono tabular-nums ${saldoColor(q.saldo)}`}
                >
                  {formatMoney(money(q.saldo, currency))}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-medium">
              <td className="px-3 py-2">Totale {year}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatMoney(money(vat.total.debito, currency))}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatMoney(money(vat.total.credito, currency))}
              </td>
              <td
                className={`px-3 py-2 text-right font-mono tabular-nums ${saldoColor(vat.total.saldo)}`}
              >
                {formatMoney(money(vat.total.saldo, currency))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        L&apos;IVA è scorporata dal lordo di ogni transazione con aliquota
        impostata. Imposta l&apos;aliquota (e l&apos;opzione &quot;IVA
        esclusa&quot;) quando registri una transazione.
      </p>
    </div>
  );
}
