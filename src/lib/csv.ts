/**
 * Generazione CSV. Delimitatore ';' (default Excel in locale IT), escaping
 * dei campi con virgolette quando contengono delimitatore/virgolette/newline.
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number)[])[],
  delimiter = ";",
): string {
  const escape = (value: string | number): string => {
    const s = String(value);
    if (s.includes('"') || s.includes(delimiter) || /[\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers, ...rows].map((row) =>
    row.map(escape).join(delimiter),
  );
  return lines.join("\r\n");
}

/** Importo in centesimi → stringa con segno e virgola decimale (IT). */
export function centsToCsvAmount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
