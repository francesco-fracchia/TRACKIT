"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  projectMonthly,
  type ScheduledMovement,
} from "@/server/services/forecast";
import { shortMonthLabel } from "@/lib/period";
import { parseMoney, formatMoney, money } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectionsView({
  startBalance,
  movements,
  fromYear,
  fromMonth,
  currency,
}: {
  startBalance: number;
  movements: ScheduledMovement[];
  fromYear: number;
  fromMonth: number;
  currency: string;
}) {
  const [whatIf, setWhatIf] = useState("");

  const whatIfCents = useMemo(() => {
    if (!whatIf.trim()) return 0;
    try {
      return parseMoney(whatIf, currency).amount;
    } catch {
      return 0;
    }
  }, [whatIf, currency]);

  const projection = useMemo(
    () =>
      projectMonthly({
        startBalance,
        movements,
        fromYear,
        fromMonth,
        months: 12,
        whatIfMonthlyDelta: whatIfCents,
      }),
    [startBalance, movements, fromYear, fromMonth, whatIfCents],
  );

  const chartData = projection.map((p) => ({
    label: `${shortMonthLabel(p.month)} ${String(p.year).slice(2)}`,
    balance: p.endBalance / 100,
  }));

  const fmtAxis = (v: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);

  const last = projection[projection.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="whatif">Scenario: risparmio/spesa extra al mese</Label>
          <Input
            id="whatif"
            placeholder="es. 200,00 o -150,00"
            value={whatIf}
            onChange={(e) => setWhatIf(e.target.value)}
            className="w-56"
          />
        </div>
        {last && (
          <p className="text-sm text-muted-foreground">
            Saldo proiettato fra 12 mesi:{" "}
            <span className="font-mono font-medium text-foreground">
              {formatMoney(money(last.endBalance, currency))}
            </span>
          </p>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => fmtAxis(Number(v))} width={80} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Tooltip
              formatter={(value) => fmtAxis(Number(value))}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo proiettato"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Mese</th>
              <th className="px-3 py-2 text-right font-medium">Entrate</th>
              <th className="px-3 py-2 text-right font-medium">Uscite</th>
              <th className="px-3 py-2 text-right font-medium">Saldo fine mese</th>
            </tr>
          </thead>
          <tbody>
            {projection.map((p) => (
              <tr key={`${p.year}-${p.month}`} className="border-b last:border-0">
                <td className="px-3 py-2">
                  {shortMonthLabel(p.month)} {p.year}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-green-600 dark:text-green-500">
                  {formatMoney(money(p.income, currency))}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-destructive">
                  {formatMoney(money(p.expense, currency))}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMoney(money(p.endBalance, currency))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
