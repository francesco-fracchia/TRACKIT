import { describe, it, expect } from "vitest";
import { vatFromGross, grossFromNet } from "@/server/services/vat";

describe("vatFromGross", () => {
  it("scorpora il 22% da 122,00 → imponibile 100,00, IVA 22,00", () => {
    expect(vatFromGross(12200, 22)).toEqual({
      gross: 12200,
      imponibile: 10000,
      iva: 2200,
    });
  });

  it("aliquota 0 o nessuna → IVA zero", () => {
    expect(vatFromGross(5000, 0)).toEqual({
      gross: 5000,
      imponibile: 5000,
      iva: 0,
    });
  });

  it("arrotonda al centesimo", () => {
    // 10% di 99,99 lordo: iva = round(9999*10/110) = round(909.0) = 909
    const b = vatFromGross(9999, 10);
    expect(b.iva).toBe(909);
    expect(b.imponibile).toBe(9999 - 909);
    expect(b.imponibile + b.iva).toBe(9999);
  });
});

describe("grossFromNet", () => {
  it("aggiunge l'IVA a un imponibile (IVA esclusa → lordo)", () => {
    expect(grossFromNet(10000, 22)).toBe(12200);
    expect(grossFromNet(10000, 4)).toBe(10400);
  });

  it("aliquota 0 → lordo = netto", () => {
    expect(grossFromNet(10000, 0)).toBe(10000);
  });

  it("round-trip coerente: netto → lordo → scorporo", () => {
    const gross = grossFromNet(10000, 22);
    const b = vatFromGross(gross, 22);
    expect(b.imponibile).toBe(10000);
    expect(b.iva).toBe(2200);
  });
});
