import { describe, expect, it } from 'vitest';
import { dreadInterval } from '../src/audio/dread';

describe('dreadInterval', () => {
  it('is long early and dense later', () => {
    expect(dreadInterval(0, false, 0)).toBeCloseTo(14, 5);
    expect(dreadInterval(600, false, 0)).toBeCloseTo(5, 5);
  });

  it('never increases with play time', () => {
    let prev = Infinity;
    for (let t = 0; t <= 900; t += 30) {
      const v = dreadInterval(t, false, 0);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('is x3 in the Korb', () => {
    for (const t of [0, 200, 600]) {
      expect(dreadInterval(t, true, 0)).toBeCloseTo(dreadInterval(t, false, 0) * 3, 5);
    }
  });

  it('shrinks with danger down to ~0.7x', () => {
    expect(dreadInterval(100, false, 1)).toBeCloseTo(dreadInterval(100, false, 0) * 0.7, 5);
    expect(dreadInterval(100, false, 0.5)).toBeLessThan(dreadInterval(100, false, 0));
  });

  it('tolerates garbage input', () => {
    expect(dreadInterval(NaN, false, NaN)).toBeCloseTo(14, 5);
    expect(dreadInterval(-5, false, 9)).toBeCloseTo(14 * 0.7, 5);
  });
});
