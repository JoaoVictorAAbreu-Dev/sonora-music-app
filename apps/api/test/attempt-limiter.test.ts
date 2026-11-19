import { describe, expect, it } from 'vitest';
import { AttemptLimiter } from '../src/auth/attempt-limiter';

describe('AttemptLimiter', () => {
  it('allows max hits per window, then reports seconds until reset', () => {
    let now = 0;
    const l = new AttemptLimiter(2, 60_000, () => now);
    expect([l.hit('a'), l.hit('a'), l.hit('a')]).toEqual([0, 0, 60]);
    expect(l.hit('b')).toBe(0);
    now = 59_500;
    expect(l.hit('a')).toBe(1);
    now = 60_000;
    expect(l.hit('a')).toBe(0);
  });
});
