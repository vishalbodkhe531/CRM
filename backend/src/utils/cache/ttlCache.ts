/**
 * Single-value in-process cache with a TTL.
 *
 * Deliberately not Redis. The only thing cached here is the platform dashboard,
 * where the goal is to stop a handful of super-admins re-running a dozen
 * aggregates on every page focus. Per-process is enough for that: with N API
 * replicas the worst case is N recomputations per TTL instead of one, which is
 * still a large reduction and needs no new infrastructure.
 *
 * Never cache anything tenant-scoped in here without keying by organization —
 * a shared process-level cache is exactly how one tenant ends up reading
 * another's numbers.
 */
export interface TtlCache<T> {
  /** Returns the cached value, or computes, stores and returns a fresh one. */
  get(compute: () => Promise<T>): Promise<T>;
  /** Drops the cached value so the next read recomputes. */
  invalidate(): void;
}

export const createTtlCache = <T>(ttlMs: number): TtlCache<T> => {
  let value: T | null = null;
  let expiresAt = 0;
  /**
   * The in-flight computation, if any.
   *
   * Without this, a cold cache hit by several requests at once would start
   * several identical computations — the stampede the cache exists to prevent.
   * They all await the same promise instead.
   */
  let pending: Promise<T> | null = null;

  return {
    async get(compute: () => Promise<T>): Promise<T> {
      if (value !== null && Date.now() < expiresAt) return value;
      if (pending) return pending;

      pending = compute()
        .then((fresh) => {
          value = fresh;
          expiresAt = Date.now() + ttlMs;
          return fresh;
        })
        .finally(() => {
          // Cleared on failure too, so an error is retried rather than latched.
          pending = null;
        });

      return pending;
    },

    invalidate() {
      value = null;
      expiresAt = 0;
    },
  };
};
