"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CashflowPoint {
  label: string;
  income: number; // unità maggiori (es. euro)
  expense: number;
}
export interface CategorySlice {
  name: string;
  value: number; // unità maggiori
}

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#a3a3a3",
];

export function DashboardCharts({
  cashflow,
  byCategory,
  currency,
}: {
  cashflow: CashflowPoint[];
  byCategory: CategorySlice[];
  currency: string;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-medium">Cashflow (anno corrente)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={cashflow}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => fmt(Number(v))} width={70} />
            <Tooltip
              formatter={(value) => fmt(Number(value))}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
              }}
            />
            <Legend />
            <Bar dataKey="income" name="Entrate" fill="#16a34a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" name="Uscite" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-medium">Spese per categoria (mese)</h3>
        {byCategory.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nessuna spesa questo mese.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => entry.name}
                fontSize={11}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length] ?? "#a3a3a3"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => fmt(Number(value))}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
