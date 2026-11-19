/**
 * Fixed-window counter keyed by a normalized identifier (client IP or email). In memory: enough
 * for the single API instance on one VM (see docs/decisions.md).
 */
export class AttemptLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt. Returns 0 when allowed, otherwise the seconds until the window resets. */
  hit(key: string): number {
    const t = this.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= t) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      this.sweep(t);
      return 0;
    }
    entry.count += 1;
    return entry.count <= this.max ? 0 : Math.ceil((entry.resetAt - t) / 1000);
  }

  private sweep(t: number) {
    if (this.hits.size < 10_000) return;
    for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
  }
}
