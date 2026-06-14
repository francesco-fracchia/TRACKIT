import { describe, it, expect } from "vitest";
import {
  computeAccountBalance,
  computeAccountBalances,
  computeTotalBalance,
  type BalanceTransaction,
} from "@/server/services/balances";

const A = { id: "acc-a", initialBalance: 10000 }; // 100,00 €
const B = { id: "acc-b", initialBalance: 0 };

describe("computeAccountBalance", () => {
  it("income aumenta il saldo", () => {
    const txs: BalanceTransaction[] = [
      { type: "income", amount: 5000, accountId: "acc-a" },
    ];
    expect(computeAccountBalance(A, txs)).toBe(15000);
  });

  it("expense riduce il saldo", () => {
    const txs: BalanceTransaction[] = [
      { type: "expense", amount: 2500, accountId: "acc-a" },
    ];
    expect(computeAccountBalance(A, txs)).toBe(7500);
  });

  it("parte dal saldo iniziale senza transazioni", () => {
    expect(computeAccountBalance(A, [])).toBe(10000);
  });
});

describe("transfer tra conti", () => {
  it("sposta l'importo da origine a destinazione (stessa valuta)", () => {
    const txs: BalanceTransaction[] = [
      {
        type: "transfer",
        amount: 3000,
        accountId: "acc-a",
        counterAccountId: "acc-b",
      },
    ];
    const balances = computeAccountBalances([A, B], txs);
    expect(balances.get("acc-a")).toBe(7000);
    expect(balances.get("acc-b")).toBe(3000);
  });

  it("trasferimento multi-valuta usa counterAmount sulla destinazione", () => {
    const txs: BalanceTransaction[] = [
      {
        type: "transfer",
        amount: 10000, // 100,00 EUR escono
        accountId: "acc-a",
        counterAccountId: "acc-b",
        counterAmount: 10875, // 108,75 USD entrano
      },
    ];
    const balances = computeAccountBalances([A, B], txs);
    expect(balances.get("acc-a")).toBe(0);
    expect(balances.get("acc-b")).toBe(10875);
  });

  it("la somma totale resta invariata in un transfer stessa valuta", () => {
    const txs: BalanceTransaction[] = [
      {
        type: "transfer",
        amount: 3000,
        accountId: "acc-a",
        counterAccountId: "acc-b",
      },
    ];
    expect(computeTotalBalance([A, B], txs)).toBe(10000);
  });
});

describe("scenario combinato", () => {
  it("calcola correttamente più movimenti", () => {
    const txs: BalanceTransaction[] = [
      { type: "income", amount: 200000, accountId: "acc-a" }, // stipendio +2000
      { type: "expense", amount: 5000, accountId: "acc-a" }, // spesa -50
      { type: "transfer", amount: 100000, accountId: "acc-a", counterAccountId: "acc-b" }, // -1000 / +1000
      { type: "expense", amount: 2000, accountId: "acc-b" }, // -20
    ];
    const balances = computeAccountBalances([A, B], txs);
    // A: 10000 + 200000 - 5000 - 100000 = 105000
    expect(balances.get("acc-a")).toBe(105000);
    // B: 0 + 100000 - 2000 = 98000
    expect(balances.get("acc-b")).toBe(98000);
    // Totale: 203000
    expect(computeTotalBalance([A, B], txs)).toBe(203000);
  });
});
