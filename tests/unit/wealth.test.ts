import { describe, it, expect } from "vitest";
import { netWorth, goalProgress } from "@/server/services/wealth";

describe("netWorth", () => {
  it("attività − passività", () => {
    expect(netWorth(500000, 120000)).toBe(380000);
  });
  it("può essere negativo", () => {
    expect(netWorth(10000, 50000)).toBe(-40000);
  });
});

describe("goalProgress", () => {
  it("calcola percentuale e residuo", () => {
    const p = goalProgress(2500, 10000);
    expect(p.percent).toBe(25);
    expect(p.remaining).toBe(7500);
    expect(p.reached).toBe(false);
  });

  it("obiettivo raggiunto", () => {
    const p = goalProgress(10000, 10000);
    expect(p.percent).toBe(100);
    expect(p.remaining).toBe(0);
    expect(p.reached).toBe(true);
  });

  it("cap al 100% se superato", () => {
    const p = goalProgress(15000, 10000);
    expect(p.percent).toBe(100);
    expect(p.reached).toBe(true);
    expect(p.remaining).toBe(0);
  });

  it("target zero senza accumulo = 0%", () => {
    expect(goalProgress(0, 0).percent).toBe(0);
  });
});
