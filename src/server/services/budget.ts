/**
 * Logica budget — pura e testabile (nessun I/O). Importi in centesimi.
 */

export interface BudgetProgress {
  budgeted: number;
  spent: number;
  remaining: number;
  /** Percentuale usata (0-…, può superare 100 in caso di sforamento). */
  percentUsed: number;
  over: boolean;
}

/** Stato di un budget per un singolo periodo (senza rollover). */
export function budgetProgress(budgeted: number, spent: number): BudgetProgress {
  const remaining = budgeted - spent;
  const percentUsed =
    budgeted > 0 ? Math.round((spent / budgeted) * 100) : spent > 0 ? 100 : 0;
  return { budgeted, spent, remaining, percentUsed, over: spent > budgeted };
}

export interface PeriodInput {
  budgeted: number;
  spent: number;
}

export interface PeriodResult {
  budgeted: number;
  /** Residuo riportato dal periodo precedente (può essere negativo). */
  carryIn: number;
  /** Disponibile = budgeted + carryIn. */
  available: number;
  spent: number;
  /** Residuo da riportare al periodo successivo = available − spent. */
  carryOut: number;
}

/**
 * Applica il rollover su una sequenza ORDINATA di periodi: il residuo
 * (available − spent) di un periodo diventa il carryIn del successivo.
 * Il riporto è bidirezionale: uno sforamento riduce il disponibile del periodo
 * dopo (carryIn negativo).
 */
export function applyRollover(periods: readonly PeriodInput[]): PeriodResult[] {
  const results: PeriodResult[] = [];
  let carryIn = 0;
  for (const p of periods) {
    const available = p.budgeted + carryIn;
    const carryOut = available - p.spent;
    results.push({
      budgeted: p.budgeted,
      carryIn,
      available,
      spent: p.spent,
      carryOut,
    });
    carryIn = carryOut;
  }
  return results;
}
