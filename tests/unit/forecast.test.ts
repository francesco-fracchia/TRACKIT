import { describe, it, expect } from "vitest";
import {
  projectMonthly,
  type ScheduledMovement,
} from "@/server/services/forecast";

describe("projectMonthly", () => {
  const movements: ScheduledMovement[] = [
    { date: "2026-01-27", amount: 200000 }, // stipendio +2000
    { date: "2026-01-01", amount: -80000 }, // affitto -800
    { date: "2026-02-27", amount: 200000 },
    { date: "2026-02-01", amount: -80000 },
  ];

  it("proietta i saldi di fine mese", () => {
    const r = projectMonthly({
      startBalance: 50000, // 500
      movements,
      fromYear: 2026,
      fromMonth: 1,
      months: 2,
    });
    expect(r).toHaveLength(2);
    // Gen: +2000 -800 = +1200 → 500+1200 = 1700,00 → 170000
    expect(r[0]!.income).toBe(200000);
    expect(r[0]!.expense).toBe(80000);
    expect(r[0]!.net).toBe(120000);
    expect(r[0]!.endBalance).toBe(170000);
    // Feb: +1200 → 290000
    expect(r[1]!.endBalance).toBe(290000);
  });

  it("applica il delta what-if ogni mese", () => {
    const r = projectMonthly({
      startBalance: 0,
      movements: [],
      fromYear: 2026,
      fromMonth: 1,
      months: 3,
      whatIfMonthlyDelta: -10000, // -100/mese
    });
    expect(r.map((p) => p.endBalance)).toEqual([-10000, -20000, -30000]);
  });

  it("gestisce il cambio d'anno", () => {
    const r = projectMonthly({
      startBalance: 0,
      movements: [{ date: "2027-01-15", amount: 5000 }],
      fromYear: 2026,
      fromMonth: 12,
      months: 2,
    });
    expect(r[0]!.year).toBe(2026);
    expect(r[0]!.month).toBe(12);
    expect(r[1]!.year).toBe(2027);
    expect(r[1]!.month).toBe(1);
    expect(r[1]!.endBalance).toBe(5000);
  });

  it("ignora movimenti fuori dalla finestra di proiezione", () => {
    const r = projectMonthly({
      startBalance: 1000,
      movements: [{ date: "2030-01-01", amount: 999999 }],
      fromYear: 2026,
      fromMonth: 1,
      months: 1,
    });
    expect(r[0]!.endBalance).toBe(1000);
  });
});
