import { describe, it, expect } from "vitest";
import {
  buildRRuleString,
  expandOccurrences,
  describeRRule,
} from "@/lib/recurrence";

describe("buildRRuleString", () => {
  it("costruisce una regola mensile", () => {
    expect(buildRRuleString("monthly", 1)).toContain("FREQ=MONTHLY");
  });
  it("include l'intervallo", () => {
    expect(buildRRuleString("weekly", 2)).toContain("INTERVAL=2");
  });
});

describe("expandOccurrences", () => {
  it("espande una ricorrenza mensile mantenendo il giorno", () => {
    const rule = buildRRuleString("monthly", 1);
    const occ = expandOccurrences(rule, "2026-01-15", "2026-01-01", "2026-03-31");
    expect(occ).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("rispetta l'intervallo settimanale", () => {
    const rule = buildRRuleString("weekly", 2);
    const occ = expandOccurrences(rule, "2026-01-05", "2026-01-01", "2026-02-01");
    // Ogni 2 settimane: 5, 19 gennaio (2 feb è oltre il 1 feb)
    expect(occ).toEqual(["2026-01-05", "2026-01-19"]);
  });

  it("non genera occorrenze prima di dtstart", () => {
    const rule = buildRRuleString("monthly", 1);
    const occ = expandOccurrences(rule, "2026-06-01", "2026-01-01", "2026-12-31");
    expect(occ[0]).toBe("2026-06-01");
  });
});

describe("una tantum (once)", () => {
  it("genera una regola con una sola occorrenza", () => {
    const rule = buildRRuleString("once", 1);
    expect(rule).toContain("COUNT=1");
  });
  it("espande a una sola data (la data di inizio)", () => {
    const rule = buildRRuleString("once", 1);
    const occ = expandOccurrences(rule, "2026-07-15", "2026-01-01", "2026-12-31");
    expect(occ).toEqual(["2026-07-15"]);
  });
  it("descrizione 'Una tantum'", () => {
    expect(describeRRule(buildRRuleString("once", 1), "once")).toBe("Una tantum");
  });
});

describe("describeRRule", () => {
  it("descrive in italiano", () => {
    expect(describeRRule(buildRRuleString("monthly", 1), "monthly")).toBe(
      "Mensile",
    );
    expect(describeRRule(buildRRuleString("weekly", 3), "weekly")).toBe(
      "Settimanale (ogni 3)",
    );
  });
});
