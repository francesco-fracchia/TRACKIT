"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SnapshotPoint {
  date: string;
  net: number; // unità maggiori
}

export function NetWorthChart({
  data,
  currency,
}: {
  data: SnapshotPoint[];
  currency: string;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nessuno snapshot ancora. Salva il primo per iniziare lo storico.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} tickFormatter={(v) => fmt(Number(v))} width={80} />
        <Tooltip
          formatter={(value) => fmt(Number(value))}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--popover-foreground)",
          }}
        />
        <Area
          type="monotone"
          dataKey="net"
          name="Patrimonio netto"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#nw)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
