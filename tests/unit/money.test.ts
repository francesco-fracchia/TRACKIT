import { describe, it, expect } from "vitest";
import {
  money,
  zero,
  parseMoney,
  formatMoney,
  add,
  subtract,
  negate,
  sum,
  multiplyByRate,
  allocate,
  compare,
  isZero,
  isNegative,
  MoneyError,
} from "@/lib/money";

describe("money() / costruzione", () => {
  it("crea un Money da centesimi interi", () => {
    expect(money(1234, "EUR")).toEqual({ amount: 1234, currency: "EUR" });
  });

  it("rifiuta importi non interi", () => {
    expect(() => money(12.5, "EUR")).toThrow(MoneyError);
  });

  it("zero() ha importo 0", () => {
    expect(zero("EUR").amount).toBe(0);
  });
});

describe("parseMoney() — locale IT e formati misti", () => {
  it("parse '1.234,56' -> 123456 cent", () => {
    expect(parseMoney("1.234,56", "EUR").amount).toBe(123456);
  });

  it("parse '1234,56' -> 123456 cent", () => {
    expect(parseMoney("1234,56", "EUR").amount).toBe(123456);
  });

  it("parse formato US '1234.56' -> 123456 cent", () => {
    expect(parseMoney("1234.56", "EUR").amount).toBe(123456);
  });

  it("parse con simbolo valuta e spazi", () => {
    expect(parseMoney("€ 1.234,56", "EUR").amount).toBe(123456);
  });

  it("parse negativo", () => {
    expect(parseMoney("-12,00", "EUR").amount).toBe(-1200);
  });

  it("parse intero senza decimali", () => {
    expect(parseMoney("100", "EUR").amount).toBe(10000);
  });

  it("parse una sola cifra decimale '5,5' -> 550 cent", () => {
    expect(parseMoney("5,5", "EUR").amount).toBe(550);
  });

  it("rifiuta troppe cifre decimali", () => {
    expect(() => parseMoney("1,234", "EUR")).toThrow(MoneyError);
  });

  it("rifiuta input vuoto", () => {
    expect(() => parseMoney("   ", "EUR")).toThrow(MoneyError);
  });
});

describe("formatMoney()", () => {
  it("formatta in EUR locale IT (decimale con virgola + simbolo)", () => {
    // ICU it-IT usa la virgola come decimale e NBSP prima di €; la
    // separazione delle migliaia dipende dal locale, quindi verifichiamo
    // le parti stabili: cifre+decimale e simbolo valuta.
    const out = formatMoney(money(123456, "EUR"));
    expect(out).toMatch(/1\.?234,56/);
    expect(out).toContain("€");
  });
});

describe("aritmetica", () => {
  it("add somma stessa valuta", () => {
    expect(add(money(100, "EUR"), money(250, "EUR")).amount).toBe(350);
  });

  it("subtract sottrae", () => {
    expect(subtract(money(100, "EUR"), money(250, "EUR")).amount).toBe(-150);
  });

  it("add tra valute diverse lancia", () => {
    expect(() => add(money(100, "EUR"), money(100, "USD"))).toThrow(MoneyError);
  });

  it("negate inverte il segno", () => {
    expect(negate(money(100, "EUR")).amount).toBe(-100);
  });

  it("sum somma una lista", () => {
    expect(
      sum([money(100, "EUR"), money(200, "EUR"), money(50, "EUR")], "EUR")
        .amount,
    ).toBe(350);
  });
});

describe("multiplyByRate() — conversione valuta", () => {
  it("moltiplica e arrotonda al centesimo", () => {
    // 10000 cent * 1.0875 = 10875
    expect(multiplyByRate(money(10000, "EUR"), 1.0875).amount).toBe(10875);
  });

  it("arrotonda half away from zero (valori esattamente rappresentabili)", () => {
    // 1.25 è rappresentabile in binario: 2 * 1.25 = 2.5 esatto.
    // 2,5 cent -> 3 (away from zero); -2,5 -> -3.
    expect(multiplyByRate(money(2, "EUR"), 1.25).amount).toBe(3);
    expect(multiplyByRate(money(-2, "EUR"), 1.25).amount).toBe(-3);
  });

  it("rifiuta tassi non finiti", () => {
    expect(() => multiplyByRate(money(100, "EUR"), Infinity)).toThrow(
      MoneyError,
    );
  });
});

describe("allocate() — ripartizione senza perdere centesimi", () => {
  it("ripartisce 100 in 3 parti uguali -> 34/33/33", () => {
    const parts = allocate(money(100, "EUR"), [1, 1, 1]);
    expect(parts.map((p) => p.amount)).toEqual([34, 33, 33]);
  });

  it("la somma delle parti è SEMPRE uguale al totale", () => {
    const totalCents = 99999;
    const parts = allocate(money(totalCents, "EUR"), [3, 5, 7, 11]);
    expect(parts.reduce((a, p) => a + p.amount, 0)).toBe(totalCents);
  });

  it("gestisce importi negativi mantenendo la somma", () => {
    const parts = allocate(money(-100, "EUR"), [1, 1, 1]);
    expect(parts.reduce((a, p) => a + p.amount, 0)).toBe(-100);
  });

  it("rifiuta pesi a somma zero", () => {
    expect(() => allocate(money(100, "EUR"), [0, 0])).toThrow(MoneyError);
  });
});

describe("comparazioni", () => {
  it("compare ordina correttamente", () => {
    expect(compare(money(100, "EUR"), money(200, "EUR"))).toBe(-1);
    expect(compare(money(200, "EUR"), money(100, "EUR"))).toBe(1);
    expect(compare(money(100, "EUR"), money(100, "EUR"))).toBe(0);
  });

  it("isZero / isNegative", () => {
    expect(isZero(zero("EUR"))).toBe(true);
    expect(isNegative(money(-1, "EUR"))).toBe(true);
    expect(isNegative(money(1, "EUR"))).toBe(false);
  });
});
