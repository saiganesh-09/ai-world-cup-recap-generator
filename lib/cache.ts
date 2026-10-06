/**
 * Tiny TTL cache for provider responses. Single-node friendly;
 * swap for Redis in multi-instance deployments.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return Promise.resolve(hit.value as T);
  }
  return fn().then((value) => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) return store.clear();
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
