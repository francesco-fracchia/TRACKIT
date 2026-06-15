import { RRule } from "rrule";

/**
 * Wrapper su `rrule` (RFC 5545). Lavora in UTC e con date civili YYYY-MM-DD
 * per evitare ambiguità di fuso. DTSTART è gestito a parte dalla regola.
 */

export const FREQUENCIES = [
  "once",
  "monthly",
  "weekly",
  "yearly",
  "daily",
] as const;
export type FrequencyName = (typeof FREQUENCIES)[number];

/** Mappa delle sole frequenze periodiche reali (esclude "once"). */
const FREQ_MAP: Record<Exclude<FrequencyName, "once">, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

export const FREQUENCY_LABELS: Record<FrequencyName, string> = {
  once: "Una tantum",
  daily: "Giornaliera",
  weekly: "Settimanale",
  monthly: "Mensile",
  yearly: "Annuale",
};

function toUTCDate(ymd: string): Date {
  const parts = ymd.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, d));
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Costruisce la stringa RRULE (senza DTSTART). Per "once" genera una regola con
 * una sola occorrenza (COUNT=1) sulla data di inizio.
 */
export function buildRRuleString(freq: FrequencyName, interval: number): string {
  if (freq === "once") {
    return new RRule({ freq: RRule.DAILY, count: 1 }).toString();
  }
  const rule = new RRule({ freq: FREQ_MAP[freq], interval: Math.max(1, interval) });
  return rule.toString();
}

/** Etichetta leggibile (IT) di una stringa RRULE. */
export function describeRRule(rruleStr: string, freqFallback: FrequencyName): string {
  try {
    const opts = RRule.parseString(rruleStr);
    if (opts.count === 1) return FREQUENCY_LABELS.once;
    const interval = opts.interval ?? 1;
    const name =
      (Object.entries(FREQ_MAP).find(([, v]) => v === opts.freq)?.[0] as
        | FrequencyName
        | undefined) ?? freqFallback;
    const base = FREQUENCY_LABELS[name];
    return interval > 1 ? `${base} (ogni ${interval})` : base;
  } catch {
    return FREQUENCY_LABELS[freqFallback];
  }
}

/**
 * Espande le occorrenze di una regola nell'intervallo [from, to] inclusivo.
 * Restituisce date civili YYYY-MM-DD ordinate.
 */
export function expandOccurrences(
  rruleStr: string,
  dtstart: string,
  from: string,
  to: string,
): string[] {
  const opts = RRule.parseString(rruleStr);
  opts.dtstart = toUTCDate(dtstart);
  const rule = new RRule(opts);
  return rule.between(toUTCDate(from), toUTCDate(to), true).map(toYMD);
}
