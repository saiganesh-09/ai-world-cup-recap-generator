import { RateLimitError } from "./errors";

// Sliding-window rate limiter.
//
// In-memory implementation — correct for a single-instance deployment
// or local dev. For multi-instance production, swap `buckets` for a
// Redis INCR/EXPIRE check (documented in README); the public API stays
// identical.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Prevent unbounded memory growth.
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    throw new RateLimitError(Math.ceil((windowMs - (now - oldest)) / 1000));
  }
  bucket.timestamps.push(now);
}

/** Convenience: recap generation is expensive — few per hour per user. */
export function rateLimitRecapGeneration(userId: string, perHour: number) {
  rateLimit(`recap:${userId}`, perHour, 60 * 60 * 1000);
}
