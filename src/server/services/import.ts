import { parseMoney } from "@/lib/money";

/**
 * Logica pura per l'import CSV: parsing data/importo, hash di deduplica,
 * matching delle regole di categorizzazione. Nessun I/O.
 */

export type DateFormat = "iso" | "dmy";

/** Converte una data grezza in YYYY-MM-DD. Lancia se non interpretabile. */
export function parseImportDate(raw: string, format: DateFormat): string {
  const s = raw.trim();
  if (format === "iso") {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) throw new Error(`Data ISO non valida: "${raw}"`);
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  // dmy: DD/MM/YYYY con separatori / - .
  const parts = s.split(/[/.-]/).map((p) => p.trim());
  if (parts.length < 3) throw new Error(`Data non valida: "${raw}"`);
  const [d, mo, y] = parts;
  const year = (y ?? "").length === 2 ? `20${y}` : y;
  if (!d || !mo || !year) throw new Error(`Data non valida: "${raw}"`);
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export interface ImportDraft {
  valueDate: string;
  /** Importo con segno in centesimi (negativo = uscita). */
  amount: number;
  payee: string;
}

export interface ColumnMapping {
  date: string;
  amount: string;
  payee: string;
  dateFormat: DateFormat;
}

/** Trasforma una riga (oggetto colonna→valore) in una bozza di transazione. */
export function rowToDraft(
  row: Record<string, string>,
  mapping: ColumnMapping,
): ImportDraft {
  const rawDate = row[mapping.date] ?? "";
  const rawAmount = row[mapping.amount] ?? "";
  const payee = (row[mapping.payee] ?? "").trim();
  const valueDate = parseImportDate(rawDate, mapping.dateFormat);
  const amount = parseMoney(rawAmount, "EUR").amount;
  return { valueDate, amount, payee };
}

/** Chiave di deduplica stabile per una riga importata. */
export function dedupHash(
  valueDate: string,
  amount: number,
  payee: string,
): string {
  return `${valueDate}|${amount}|${payee.trim().toLowerCase()}`;
}

export interface CategoryRuleSpec {
  matchType: "contains" | "regex";
  pattern: string;
  categoryId: string;
}

/** Restituisce la categoria della prima regola che combacia con il beneficiario. */
export function matchCategory(
  payee: string,
  rules: readonly CategoryRuleSpec[],
): string | null {
  const p = payee.toLowerCase();
  for (const rule of rules) {
    if (rule.matchType === "contains") {
      if (p.includes(rule.pattern.toLowerCase())) return rule.categoryId;
    } else {
      try {
        if (new RegExp(rule.pattern, "i").test(payee)) return rule.categoryId;
      } catch {
        // regex non valida: ignora la regola.
      }
    }
  }
  return null;
}
