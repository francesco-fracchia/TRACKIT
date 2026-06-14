import { describe, it, expect } from "vitest";
import { toCsv, centsToCsvAmount } from "@/lib/csv";

describe("toCsv", () => {
  it("genera righe con delimitatore ;", () => {
    const out = toCsv(["a", "b"], [["1", "2"], ["3", "4"]]);
    expect(out).toBe("a;b\r\n1;2\r\n3;4");
  });

  it("fa l'escape dei campi con delimitatore, virgolette o newline", () => {
    const out = toCsv(["x"], [['ha;ciao'], ['vir"gola'], ["a\nb"]]);
    expect(out).toContain('"ha;ciao"');
    expect(out).toContain('"vir""gola"');
    expect(out).toContain('"a\nb"');
  });
});

describe("centsToCsvAmount", () => {
  it("formatta con virgola decimale", () => {
    expect(centsToCsvAmount(123456)).toBe("1234,56");
    expect(centsToCsvAmount(5)).toBe("0,05");
    expect(centsToCsvAmount(-1200)).toBe("-12,00");
    expect(centsToCsvAmount(0)).toBe("0,00");
  });
});
