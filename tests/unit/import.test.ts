import { describe, it, expect } from "vitest";
import {
  parseImportDate,
  rowToDraft,
  dedupHash,
  matchCategory,
} from "@/server/services/import";

describe("parseImportDate", () => {
  it("ISO passthrough", () => {
    expect(parseImportDate("2026-03-15", "iso")).toBe("2026-03-15");
  });
  it("DMY con slash", () => {
    expect(parseImportDate("15/03/2026", "dmy")).toBe("2026-03-15");
  });
  it("DMY con punto e anno a 2 cifre", () => {
    expect(parseImportDate("5.3.26", "dmy")).toBe("2026-03-05");
  });
  it("rifiuta date non valide", () => {
    expect(() => parseImportDate("boh", "dmy")).toThrow();
  });
});

describe("rowToDraft", () => {
  const mapping = {
    date: "Data",
    amount: "Importo",
    payee: "Descrizione",
    dateFormat: "dmy" as const,
  };
  it("mappa una riga in bozza con importo con segno", () => {
    const draft = rowToDraft(
      { Data: "15/03/2026", Importo: "-50,00", Descrizione: " Supermercato " },
      mapping,
    );
    expect(draft).toEqual({
      valueDate: "2026-03-15",
      amount: -5000,
      payee: "Supermercato",
    });
  });
  it("gestisce entrate (segno positivo)", () => {
    const draft = rowToDraft(
      { Data: "01/03/2026", Importo: "1.200,00", Descrizione: "Stipendio" },
      mapping,
    );
    expect(draft.amount).toBe(120000);
  });
});

describe("dedupHash", () => {
  it("uguale per righe equivalenti (case/spazi nel payee)", () => {
    expect(dedupHash("2026-03-15", -5000, " Coop ")).toBe(
      dedupHash("2026-03-15", -5000, "coop"),
    );
  });
  it("diverso se cambia importo", () => {
    expect(dedupHash("2026-03-15", -5000, "x")).not.toBe(
      dedupHash("2026-03-15", -5001, "x"),
    );
  });
});

describe("matchCategory", () => {
  const rules = [
    { matchType: "contains" as const, pattern: "esselunga", categoryId: "cat-spesa" },
    { matchType: "regex" as const, pattern: "^enel", categoryId: "cat-bollette" },
  ];
  it("match per contains (case-insensitive)", () => {
    expect(matchCategory("ESSELUNGA MILANO", rules)).toBe("cat-spesa");
  });
  it("match per regex", () => {
    expect(matchCategory("Enel Energia", rules)).toBe("cat-bollette");
  });
  it("nessun match → null", () => {
    expect(matchCategory("Bar Mario", rules)).toBeNull();
  });
  it("regex non valida viene ignorata", () => {
    expect(matchCategory("test", [{ matchType: "regex", pattern: "[", categoryId: "x" }])).toBeNull();
  });
});
