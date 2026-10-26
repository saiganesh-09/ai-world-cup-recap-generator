import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

describe("rateLimit", () => {
  it("allows up to the limit then throws with retry-after", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(() => rateLimit(key, 3, 60_000)).not.toThrow();
    }
    try {
      rateLimit(key, 3, 60_000);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      expect((e as RateLimitError).retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("different keys are independent", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(() => rateLimit(b, 1, 60_000)).not.toThrow();
  });
});
