/**
 * Aritmetica monetaria sicura.
 *
 * REGOLA D'ORO: il denaro è SEMPRE rappresentato come intero in *minor units*
 * (centesimi per EUR/USD). Mai `float` per gli importi. Tutte le operazioni
 * passano da qui per garantire che non si perdano/creino centesimi.
 */

export type Currency = string; // ISO 4217, es. "EUR"

export interface Money {
  /** Importo in minor units (centesimi). Intero, può essere negativo. */
  readonly amount: number;
  readonly currency: Currency;
}

/** Errore sollevato su operazioni tra valute diverse o input non validi. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

function assertInteger(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new MoneyError(`L'importo in centesimi deve essere intero: ${amount}`);
  }
  if (!Number.isSafeInteger(amount)) {
    throw new MoneyError(`Importo fuori dal range sicuro: ${amount}`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(
      `Valute incompatibili: ${a.currency} vs ${b.currency}`,
    );
  }
}

/** Crea un Money da centesimi interi. */
export function money(amount: number, currency: Currency): Money {
  assertInteger(amount);
  return { amount, currency };
}

/** Money con importo zero nella valuta data. */
export function zero(currency: Currency): Money {
  return { amount: 0, currency };
}

/**
 * Converte un input testuale (locale IT di default) in Money.
 * Accetta: "1.234,56", "1234,56", "1234.56", "-12,00", "€ 1.234,56".
 * Il separatore delle migliaia è opzionale; il decimale è l'ultimo
 * separatore (',' o '.') seguito da 1-2 cifre.
 */
export function parseMoney(
  input: string,
  currency: Currency,
  options: { decimals?: number } = {},
): Money {
  const decimals = options.decimals ?? 2;
  const factor = 10 ** decimals;

  // Tieni solo cifre, separatori e segno meno.
  let s = input.trim().replace(/[^\d.,-]/g, "");
  if (s === "" || s === "-") {
    throw new MoneyError(`Importo non valido: "${input}"`);
  }

  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");

  // Individua il separatore decimale: l'ultimo tra '.' e ',' .
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decimalSep =
    lastComma > lastDot ? "," : lastDot > lastComma ? "." : null;

  let intPart: string;
  let fracPart: string;
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep);
    intPart = s.slice(0, idx).replace(/[.,]/g, "");
    fracPart = s.slice(idx + 1).replace(/[.,]/g, "");
  } else {
    intPart = s.replace(/[.,]/g, "");
    fracPart = "";
  }

  if (fracPart.length > decimals) {
    throw new MoneyError(
      `Troppe cifre decimali per ${currency}: "${input}"`,
    );
  }

  const intCents = (intPart === "" ? 0 : Number(intPart)) * factor;
  const fracCents = fracPart === "" ? 0 : Number(fracPart.padEnd(decimals, "0"));
  const total = intCents + fracCents;

  assertInteger(total);
  return { amount: negative ? -total : total, currency };
}

/** Formatta un Money secondo il locale (IT di default). */
export function formatMoney(m: Money, locale = "it-IT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
  }).format(m.amount / 100);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function negate(m: Money): Money {
  return { amount: -m.amount, currency: m.currency };
}

export function sum(items: readonly Money[], currency: Currency): Money {
  return items.reduce<Money>((acc, m) => add(acc, m), zero(currency));
}

/**
 * Moltiplica per un tasso decimale (es. fx) arrotondando al centesimo più
 * vicino (half away from zero). Usato per conversioni valuta.
 */
export function multiplyByRate(m: Money, rate: number): Money {
  if (!Number.isFinite(rate)) {
    throw new MoneyError(`Tasso non valido: ${rate}`);
  }
  const raw = m.amount * rate;
  const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
  return money(rounded, m.currency);
}

/**
 * Ripartisce un importo secondo dei pesi, SENZA perdere o creare centesimi.
 * Usa il metodo del "resto più grande" (largest remainder): la somma dei
 * risultati è esattamente uguale all'importo di partenza.
 *
 * Esempio: allocate(money(100,"EUR"), [1,1,1]) -> 34,33,33 cent.
 */
export function allocate(m: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) {
    throw new MoneyError("Servono almeno un peso per la ripartizione");
  }
  if (weights.some((w) => w < 0)) {
    throw new MoneyError("I pesi non possono essere negativi");
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    throw new MoneyError("La somma dei pesi non può essere zero");
  }

  const sign = m.amount < 0 ? -1 : 1;
  const total = Math.abs(m.amount);

  const shares = weights.map((w) => {
    const exact = (total * w) / totalWeight;
    return { floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  const distributed = shares.reduce((acc, s) => acc + s.floor, 0);
  const leftover = total - distributed;

  // Assegna i centesimi residui a chi ha il resto maggiore.
  const order = shares
    .map((s, i) => ({ i, remainder: s.remainder }))
    .sort((a, b) => b.remainder - a.remainder);

  const result = shares.map((s) => s.floor);
  for (let k = 0; k < leftover; k++) {
    const target = order[k % order.length];
    if (target) result[target.i] = (result[target.i] ?? 0) + 1;
  }

  return result.map((cents) => money(sign * cents, m.currency));
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

export function isNegative(m: Money): boolean {
  return m.amount < 0;
}

/** -1 se a<b, 0 se uguali, 1 se a>b. Richiede stessa valuta. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  return a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : 0;
}
