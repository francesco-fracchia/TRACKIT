import { describe, it, expect } from "vitest";
import {
  budgetProgress,
  applyRollover,
  type PeriodInput,
} from "@/server/services/budget";

describe("budgetProgress", () => {
  it("calcola residuo e percentuale sotto budget", () => {
    const p = budgetProgress(10000, 4000);
    expect(p.remaining).toBe(6000);
    expect(p.percentUsed).toBe(40);
    expect(p.over).toBe(false);
  });

  it("segnala lo sforamento", () => {
    const p = budgetProgress(10000, 12000);
    expect(p.remaining).toBe(-2000);
    expect(p.percentUsed).toBe(120);
    expect(p.over).toBe(true);
  });

  it("budget zero con spesa = 100% e over", () => {
    const p = budgetProgress(0, 500);
    expect(p.percentUsed).toBe(100);
    expect(p.over).toBe(true);
  });

  it("budget zero senza spesa = 0%", () => {
    expect(budgetProgress(0, 0).percentUsed).toBe(0);
  });
});

describe("applyRollover", () => {
  it("riporta il surplus al periodo successivo", () => {
    const periods: PeriodInput[] = [
      { budgeted: 10000, spent: 6000 }, // +4000 residuo
      { budgeted: 10000, spent: 8000 },
    ];
    const r = applyRollover(periods);
    expect(r[0]!.carryOut).toBe(4000);
    expect(r[1]!.carryIn).toBe(4000);
    expect(r[1]!.available).toBe(14000);
    expect(r[1]!.carryOut).toBe(6000);
  });

  it("riporta anche lo sforamento (carryIn negativo)", () => {
    const periods: PeriodInput[] = [
      { budgeted: 10000, spent: 13000 }, // -3000
      { budgeted: 10000, spent: 5000 },
    ];
    const r = applyRollover(periods);
    expect(r[0]!.carryOut).toBe(-3000);
    expect(r[1]!.carryIn).toBe(-3000);
    expect(r[1]!.available).toBe(7000);
    expect(r[1]!.carryOut).toBe(2000);
  });

  it("primo periodo ha carryIn zero", () => {
    const r = applyRollover([{ budgeted: 5000, spent: 1000 }]);
    expect(r[0]!.carryIn).toBe(0);
    expect(r[0]!.available).toBe(5000);
  });

  it("sequenza vuota → array vuoto", () => {
    expect(applyRollover([])).toEqual([]);
  });
});
