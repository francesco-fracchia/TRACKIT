"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface RevenuePoint {
  label: string;
  fatturato: number; // unità maggiori (es. euro)
}

export function RevenueChart({
  data,
  currency,
}: {
  data: RevenuePoint[];
  currency: string;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
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
        <Bar dataKey="fatturato" name="Fatturato" fill="#16a34a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
