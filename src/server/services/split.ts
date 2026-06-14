import { allocate } from "@/lib/money";

/**
 * Spese condivise — logica pura e testabile. Importi in centesimi.
 *
 * Saldo di un membro = (quanto ha pagato) − (quanto gli spetta di quota).
 * Saldo > 0: gli altri gli devono dei soldi (creditore).
 * Saldo < 0: deve dei soldi (debitore).
 */

export interface ExpenseForBalance {
  paidBy: string;
  /** Quota a carico di ciascun membro (centesimi); la somma = totale spesa. */
  splits: { userId: string; amount: number }[];
}

export interface SettlementForBalance {
  from: string; // debitore che rimborsa
  to: string; // creditore rimborsato
  amount: number;
}

/**
 * Calcola il saldo netto di ogni membro a partire dalle spese e dai rimborsi
 * già effettuati. La somma di tutti i saldi è sempre 0.
 */
export function computeMemberBalances(
  expenses: readonly ExpenseForBalance[],
  settlements: readonly SettlementForBalance[] = [],
): Map<string, number> {
  const balances = new Map<string, number>();
  const bump = (userId: string, by: number) =>
    balances.set(userId, (balances.get(userId) ?? 0) + by);

  for (const e of expenses) {
    const total = e.splits.reduce((s, x) => s + x.amount, 0);
    bump(e.paidBy, total); // ha anticipato il totale
    for (const s of e.splits) bump(s.userId, -s.amount); // ognuno deve la sua quota
  }

  // Un rimborso: il debitore (from) versa al creditore (to).
  for (const st of settlements) {
    bump(st.from, st.amount); // riduce il debito (saldo negativo → +)
    bump(st.to, -st.amount); // riduce il credito (saldo positivo → −)
  }

  return balances;
}

export interface SuggestedSettlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Compensazioni minime (stile Splitwise): dato l'insieme dei saldi, propone il
 * minor numero di trasferimenti per azzerare tutti i debiti. Greedy: abbina il
 * massimo debitore al massimo creditore. Restituisce ≤ n−1 trasferimenti.
 */
export function minimizeSettlements(
  balances: ReadonlyMap<string, number>,
): SuggestedSettlement[] {
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const [userId, balance] of balances) {
    if (balance > 0) creditors.push({ userId, amount: balance });
    else if (balance < 0) debtors.push({ userId, amount: -balance });
  }

  // Ordine deterministico (importo desc, poi userId) per output stabile.
  const byAmount = (
    a: { userId: string; amount: number },
    b: { userId: string; amount: number },
  ) => b.amount - a.amount || a.userId.localeCompare(b.userId);
  creditors.sort(byAmount);
  debtors.sort(byAmount);

  const result: SuggestedSettlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) {
      result.push({ from: debtor.userId, to: creditor.userId, amount });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return result;
}

/**
 * Suddivide un totale tra i membri secondo dei pesi (quote uguali o
 * percentuali), senza perdere centesimi. Riusa `allocate`.
 */
export function splitByWeights(
  total: number,
  members: readonly { userId: string; weight: number }[],
): { userId: string; amount: number }[] {
  const parts = allocate({ amount: total, currency: "X" }, members.map((m) => m.weight));
  return members.map((m, i) => ({ userId: m.userId, amount: parts[i]!.amount }));
}
