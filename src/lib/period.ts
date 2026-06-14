/**
 * Helper per i periodi (mese/anno) in formato data civile YYYY-MM-DD.
 * Funzioni pure: ricevono anno/mese espliciti per essere testabili.
 */

export interface DateRange {
  from: string; // inclusivo, YYYY-MM-DD
  to: string; // inclusivo, YYYY-MM-DD
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Numero di giorni nel mese (month: 1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Intervallo del mese (month: 1-12). */
export function monthRange(year: number, month: number): DateRange {
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`,
  };
}

/** Intervallo dell'anno. */
export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

const MONTH_NAMES_IT = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_IT[month - 1] ?? ""} ${year}`;
}

export function shortMonthLabel(month: number): string {
  return (MONTH_NAMES_IT[month - 1] ?? "").slice(0, 3);
}

/** Anno/mese correnti (month 1-12) a partire da una data. */
export function currentYearMonth(now: Date): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
