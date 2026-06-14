import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, resetRateLimitStore } from "@/lib/rate-limit";

describe("rateLimit (fixed window)", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permette fino al limite, poi blocca", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit("k", opts).success).toBe(true);
    expect(rateLimit("k", opts).success).toBe(true);
    const third = rateLimit("k", opts);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);
    expect(rateLimit("k", opts).success).toBe(false);
  });

  it("resetta dopo la finestra", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("k", opts).success).toBe(true);
    expect(rateLimit("k", opts).success).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("k", opts).success).toBe(true);
  });

  it("isola chiavi diverse", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("a", opts).success).toBe(true);
    expect(rateLimit("b", opts).success).toBe(true);
  });
});
