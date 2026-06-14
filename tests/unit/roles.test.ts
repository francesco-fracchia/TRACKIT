import { describe, it, expect } from "vitest";
import { hasSufficientRole, isRole, ROLE_RANK } from "@/server/dal/roles";

describe("gerarchia ruoli", () => {
  it("owner soddisfa qualunque requisito", () => {
    expect(hasSufficientRole("owner", "viewer")).toBe(true);
    expect(hasSufficientRole("owner", "admin")).toBe(true);
    expect(hasSufficientRole("owner", "owner")).toBe(true);
  });

  it("member soddisfa member e viewer ma non admin/owner", () => {
    expect(hasSufficientRole("member", "viewer")).toBe(true);
    expect(hasSufficientRole("member", "member")).toBe(true);
    expect(hasSufficientRole("member", "admin")).toBe(false);
    expect(hasSufficientRole("member", "owner")).toBe(false);
  });

  it("viewer soddisfa solo viewer", () => {
    expect(hasSufficientRole("viewer", "viewer")).toBe(true);
    expect(hasSufficientRole("viewer", "member")).toBe(false);
  });

  it("fail-closed: ruolo sconosciuto non soddisfa nulla", () => {
    expect(hasSufficientRole("superuser", "viewer")).toBe(false);
    expect(hasSufficientRole("", "viewer")).toBe(false);
  });

  it("isRole riconosce solo i 4 ruoli validi", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("hacker")).toBe(false);
  });

  it("ranking è strettamente crescente", () => {
    expect(ROLE_RANK.viewer).toBeLessThan(ROLE_RANK.member);
    expect(ROLE_RANK.member).toBeLessThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeLessThan(ROLE_RANK.owner);
  });
});
