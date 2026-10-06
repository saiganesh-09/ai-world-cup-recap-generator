import { RateLimitError } from "./errors";

/**
 * In-memory sliding-window rate limiter.
 * Suitable for a single-node deployment / dev. For multi-instance
 * production, swap `buckets` for Redis INCR + EXPIRE — the call
 * surface (`limiter.check(key)`) stays identical.
 */
interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unboundedly.
let lastSweep = Date.now();
const SWEEP_INTERVAL = 5 * 60 * 1000;

function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export function createRateLimiter(opts: { limit: number; windowMs: number }) {
  return {
    check(key: string) {
      sweep(opts.windowMs);
      const now = Date.now();
      const bucket = buckets.get(key) ?? { timestamps: [] };
      bucket.timestamps = bucket.timestamps.filter(
        (t) => now - t < opts.windowMs,
      );
      if (bucket.timestamps.length >= opts.limit) {
        const oldest = bucket.timestamps[0];
        const retrySec = Math.ceil(
          (opts.windowMs - (now - oldest)) / 1000,
        );
        throw new RateLimitError(
          `Rate limit reached. Try again in ${Math.max(retrySec, 1)}s.`,
        );
      }
      bucket.timestamps.push(now);
      buckets.set(key, bucket);
    },
    remaining(key: string) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket) return opts.limit;
      const recent = bucket.timestamps.filter(
        (t) => now - t < opts.windowMs,
      );
      return Math.max(0, opts.limit - recent.length);
    },
  };
}
