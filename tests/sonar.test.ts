import { describe, expect, it } from 'vitest';
import {
  SONAR,
  comboBonus,
  crossed,
  distToRect,
  ringAlpha,
  ringFront,
  ringLifetime,
  sonarCharge,
  sonarRadius,
} from '@/core/sonar';

describe('sonar radius', () => {
  it('uses the small tap radius for short presses', () => {
    expect(sonarRadius(0)).toBe(SONAR.tapRadius);
    expect(sonarRadius(0.1)).toBe(SONAR.tapRadius);
    expect(sonarRadius(Number.NaN)).toBe(SONAR.tapRadius);
  });

  it('grows monotonically with hold time and caps at max', () => {
    const a = sonarRadius(0.3);
    const b = sonarRadius(0.8);
    const c = sonarRadius(1.4);
    expect(a).toBeGreaterThan(SONAR.tapRadius - 0.001);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(sonarRadius(SONAR.maxHold)).toBeCloseTo(SONAR.maxRadius);
    expect(sonarRadius(10)).toBe(SONAR.maxRadius);
  });

  it('charge is clamped to 0..1', () => {
    expect(sonarCharge(-1)).toBe(0);
    expect(sonarCharge(SONAR.maxHold / 2)).toBeCloseTo(0.5);
    expect(sonarCharge(99)).toBe(1);
  });
});

describe('ring front', () => {
  it('expands at speed and stops at max radius', () => {
    expect(ringFront(0, 10)).toBe(0);
    expect(ringFront(0.25, 10, 20)).toBeCloseTo(5);
    expect(ringFront(5, 10, 20)).toBe(10);
    expect(ringFront(-1, 10)).toBe(0);
  });

  it('fades only after expansion and dies at lifetime', () => {
    const r = 9;
    expect(ringAlpha(r / SONAR.speed - 0.01, r)).toBe(1);
    expect(ringAlpha(ringLifetime(r) - SONAR.fadeOut / 2, r)).toBeCloseTo(0.5);
    expect(ringAlpha(ringLifetime(r) + 0.01, r)).toBe(0);
  });

  it('crossed fires exactly once across consecutive frames', () => {
    const dist = 3.3;
    let prev = 0;
    let hits = 0;
    for (let t = 0.016; t < 1; t += 0.016) {
      const f = ringFront(t, 10);
      if (crossed(dist, prev, f)) hits++;
      prev = f;
    }
    expect(hits).toBe(1);
  });

  it('objects beyond the max radius are never crossed', () => {
    let prev = 0;
    let hits = 0;
    for (let t = 0.016; t < 2; t += 0.016) {
      const f = ringFront(t, 4);
      if (crossed(4.5, prev, f)) hits++;
      prev = f;
    }
    expect(hits).toBe(0);
  });
});

describe('distToRect', () => {
  it('is 0 inside and euclidean outside', () => {
    expect(distToRect(1, 1, 0, 0, 2, 2)).toBe(0);
    expect(distToRect(5, 1, 0, 0, 2, 2)).toBe(3);
    expect(distToRect(5, 6, 0, 0, 2, 2)).toBe(5);
  });
});

describe('combo', () => {
  it('bonus is 5 per extra reveal, zero without combo, capped at 40', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBe(5);
    expect(comboBonus(3)).toBe(10);
    expect(comboBonus(9)).toBe(40);
    expect(comboBonus(50)).toBe(SONAR.comboCap);
  });
});
