import type { TransactionType } from "@/db/schema";

/**
 * Calcolo dei saldi — logica pura e testabile (nessun I/O).
 *
 * Convenzione importi: `amount` è sempre positivo (centesimi); l'effetto sul
 * saldo dipende dal `type`:
 *  - income:   +amount sul conto
 *  - expense:  −amount sul conto
 *  - transfer: −amount dal conto origine, +counterAmount sul conto destinazione
 *              (counterAmount = amount se stessa valuta).
 */

export interface BalanceTransaction {
  type: TransactionType;
  amount: number;
  accountId: string;
  counterAccountId?: string | null;
  counterAmount?: number | null;
}

export interface AccountSeed {
  id: string;
  initialBalance: number;
}

/**
 * Applica una singola transazione a una mappa di delta per conto (in-place).
 */
function applyDelta(deltas: Map<string, number>, tx: BalanceTransaction): void {
  const bump = (accountId: string, by: number) => {
    deltas.set(accountId, (deltas.get(accountId) ?? 0) + by);
  };

  switch (tx.type) {
    case "income":
      bump(tx.accountId, tx.amount);
      break;
    case "expense":
      bump(tx.accountId, -tx.amount);
      break;
    case "transfer":
      bump(tx.accountId, -tx.amount);
      if (tx.counterAccountId) {
        bump(tx.counterAccountId, tx.counterAmount ?? tx.amount);
      }
      break;
  }
}

/**
 * Saldo corrente di tutti i conti = saldo iniziale + somma degli effetti delle
 * transazioni. Restituisce una mappa accountId → centesimi.
 */
export function computeAccountBalances(
  accounts: readonly AccountSeed[],
  transactions: readonly BalanceTransaction[],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const a of accounts) {
    balances.set(a.id, a.initialBalance);
  }

  const deltas = new Map<string, number>();
  for (const tx of transactions) {
    applyDelta(deltas, tx);
  }

  for (const [accountId, delta] of deltas) {
    balances.set(accountId, (balances.get(accountId) ?? 0) + delta);
  }

  return balances;
}

/** Saldo di un singolo conto. */
export function computeAccountBalance(
  account: AccountSeed,
  transactions: readonly BalanceTransaction[],
): number {
  return computeAccountBalances([account], transactions).get(account.id) ?? 0;
}

/**
 * Saldo totale di uno spazio = somma dei saldi dei conti.
 * NB: ignora il cambio valuta (la conversione verso la valuta base con fx
 * arriva con i report multi-valuta, M2). In M1 assumiamo conti nella stessa
 * valuta base per il totale.
 */
export function computeTotalBalance(
  accounts: readonly AccountSeed[],
  transactions: readonly BalanceTransaction[],
): number {
  const balances = computeAccountBalances(accounts, transactions);
  let total = 0;
  for (const v of balances.values()) total += v;
  return total;
}
