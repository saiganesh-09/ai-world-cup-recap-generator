import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

describe("rate limiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(() => {
      limiter.check("k1");
      limiter.check("k1");
      limiter.check("k1");
    }).not.toThrow();
  });

  it("blocks once the limit is exceeded", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check("k2");
    limiter.check("k2");
    expect(() => limiter.check("k2")).toThrow(RateLimitError);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("a");
    expect(() => limiter.check("b")).not.toThrow();
  });

  it("frees capacity after the window elapses", () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
      limiter.check("k3");
      expect(() => limiter.check("k3")).toThrow(RateLimitError);
      vi.advanceTimersByTime(1100);
      expect(() => limiter.check("k3")).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
});
