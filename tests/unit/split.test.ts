import { describe, it, expect } from "vitest";
import {
  computeMemberBalances,
  minimizeSettlements,
  splitByWeights,
  type ExpenseForBalance,
} from "@/server/services/split";

describe("computeMemberBalances", () => {
  it("chi paga è creditore, gli altri debitori", () => {
    // A paga 30€ divisi in 3 da 10€.
    const expenses: ExpenseForBalance[] = [
      {
        paidBy: "A",
        splits: [
          { userId: "A", amount: 1000 },
          { userId: "B", amount: 1000 },
          { userId: "C", amount: 1000 },
        ],
      },
    ];
    const b = computeMemberBalances(expenses);
    expect(b.get("A")).toBe(2000); // ha pagato 3000, deve 1000 → +2000
    expect(b.get("B")).toBe(-1000);
    expect(b.get("C")).toBe(-1000);
  });

  it("la somma dei saldi è sempre 0", () => {
    const expenses: ExpenseForBalance[] = [
      { paidBy: "A", splits: [{ userId: "A", amount: 500 }, { userId: "B", amount: 700 }] },
      { paidBy: "B", splits: [{ userId: "A", amount: 300 }, { userId: "B", amount: 300 }] },
    ];
    const b = computeMemberBalances(expenses);
    const sum = [...b.values()].reduce((s, v) => s + v, 0);
    expect(sum).toBe(0);
  });

  it("i rimborsi riducono i saldi", () => {
    const expenses: ExpenseForBalance[] = [
      { paidBy: "A", splits: [{ userId: "A", amount: 1000 }, { userId: "B", amount: 1000 }] },
    ];
    // B deve 1000 ad A; B rimborsa 1000.
    const b = computeMemberBalances(expenses, [{ from: "B", to: "A", amount: 1000 }]);
    expect(b.get("A")).toBe(0);
    expect(b.get("B")).toBe(0);
  });
});

describe("minimizeSettlements", () => {
  it("propone i trasferimenti per azzerare i debiti", () => {
    const balances = new Map([
      ["A", 2000],
      ["B", -1000],
      ["C", -1000],
    ]);
    const s = minimizeSettlements(balances);
    expect(s).toEqual([
      { from: "B", to: "A", amount: 1000 },
      { from: "C", to: "A", amount: 1000 },
    ]);
  });

  it("la somma rimborsata uguaglia il debito totale", () => {
    const balances = new Map([
      ["A", 5000],
      ["B", 3000],
      ["C", -6000],
      ["D", -2000],
    ]);
    const s = minimizeSettlements(balances);
    const totalDebt = 8000;
    expect(s.reduce((sum, x) => sum + x.amount, 0)).toBe(totalDebt);
    // Numero di trasferimenti ≤ n−1.
    expect(s.length).toBeLessThanOrEqual(3);
  });

  it("nessun trasferimento se tutti a zero", () => {
    expect(minimizeSettlements(new Map([["A", 0], ["B", 0]]))).toEqual([]);
  });
});

describe("splitByWeights", () => {
  it("divisione equa senza perdere centesimi", () => {
    const parts = splitByWeights(1000, [
      { userId: "A", weight: 1 },
      { userId: "B", weight: 1 },
      { userId: "C", weight: 1 },
    ]);
    expect(parts.map((p) => p.amount)).toEqual([334, 333, 333]);
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBe(1000);
  });

  it("divisione per percentuali", () => {
    const parts = splitByWeights(10000, [
      { userId: "A", weight: 70 },
      { userId: "B", weight: 30 },
    ]);
    expect(parts).toEqual([
      { userId: "A", amount: 7000 },
      { userId: "B", amount: 3000 },
    ]);
  });
});
