/**
 * Calcolo IVA — logica pura e testabile. Importi in centesimi, aliquota in
 * punti percentuali interi (es. 22).
 *
 * Convenzione: `amount` memorizzato sulla transazione è sempre il LORDO (la
 * cassa che si muove). Imponibile e IVA si derivano da lordo + aliquota.
 */

export interface VatBreakdown {
  gross: number; // lordo (centesimi)
  imponibile: number; // base imponibile (centesimi)
  iva: number; // imposta (centesimi)
}

/** Scorpora l'IVA da un importo lordo. Aliquota <= 0 → nessuna IVA. */
export function vatFromGross(gross: number, ratePercent: number): VatBreakdown {
  if (ratePercent <= 0) {
    return { gross, imponibile: gross, iva: 0 };
  }
  const iva = Math.round((gross * ratePercent) / (100 + ratePercent));
  return { gross, imponibile: gross - iva, iva };
}

/**
 * Dato un importo netto (imponibile) e l'aliquota, calcola il lordo.
 * Usato quando l'utente inserisce un importo "IVA esclusa".
 */
export function grossFromNet(net: number, ratePercent: number): number {
  if (ratePercent <= 0) return net;
  return net + Math.round((net * ratePercent) / 100);
}
