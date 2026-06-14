/**
 * Proiezioni di saldo/cashflow — logica pura e testabile. Importi in centesimi.
 *
 * Modello deterministico: partendo dal saldo attuale si applicano i movimenti
 * pianificati (ricorrenze espanse, importi con segno) mese per mese, più un
 * eventuale delta mensile "what-if" (scenario).
 */

export interface ScheduledMovement {
  date: string; // YYYY-MM-DD
  amount: number; // centesimi con segno: + entrata, − uscita
}

export interface MonthlyProjection {
  year: number;
  month: number; // 1-12
  income: number;
  expense: number;
  net: number;
  /** Saldo proiettato a fine mese. */
  endBalance: number;
}

export interface ProjectionInput {
  startBalance: number;
  movements: readonly ScheduledMovement[];
  fromYear: number;
  fromMonth: number; // 1-12
  months: number;
  /** Delta mensile aggiuntivo (scenario what-if), in centesimi con segno. */
  whatIfMonthlyDelta?: number;
}

function ym(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Proietta i saldi di fine mese per `months` mesi a partire da
 * (fromYear, fromMonth). Ogni movimento è attribuito al mese della sua data.
 */
export function projectMonthly(input: ProjectionInput): MonthlyProjection[] {
  const whatIf = input.whatIfMonthlyDelta ?? 0;

  // Indicizza i movimenti per YYYY-MM.
  const byMonth = new Map<string, ScheduledMovement[]>();
  for (const m of input.movements) {
    const key = m.date.slice(0, 7);
    const list = byMonth.get(key) ?? [];
    list.push(m);
    byMonth.set(key, list);
  }

  const result: MonthlyProjection[] = [];
  let balance = input.startBalance;
  let year = input.fromYear;
  let month = input.fromMonth;

  for (let i = 0; i < input.months; i++) {
    const movements = byMonth.get(ym(year, month)) ?? [];
    let income = 0;
    let expense = 0;
    for (const mv of movements) {
      if (mv.amount >= 0) income += mv.amount;
      else expense += -mv.amount;
    }
    // Il what-if è un aggiustamento netto del mese.
    const net = income - expense + whatIf;
    balance += net;
    result.push({ year, month, income, expense, net, endBalance: balance });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}
