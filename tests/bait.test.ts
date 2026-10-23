import { describe, expect, it } from 'vitest';
import { BAIT, baitReady, createBait, squeakTime, stepBait, throwBait } from '@/core/bait';
import { LIGHT, noiseReaction } from '@/core/noise';
import { createSpook, hearSound, RUDI, stepSpook, wakeRudi } from '@/core/spook-fsm';

const open = (): boolean => true;

/** Runs the ball for `seconds`, returns the times of all squeaks. */
function run(s: ReturnType<typeof createBait>, seconds: number, dt = 1 / 60): number[] {
  const out: number[] = [];
  for (let t = 0; t < seconds; t += dt) if (stepBait(s, dt)) out.push(t);
  return out;
}

describe('köder', () => {
  it('flies BAIT.range along the facing and lands on the floor', () => {
    const s = createBait();
    expect(throwBait(s, 0, 0, 0, open)).toBe(true);
    expect(s.toX).toBeCloseTo(0);
    expect(s.toZ).toBeCloseTo(BAIT.range);
    run(s, BAIT.flight + BAIT.bounceTime + 0.05);
    expect(s.phase).toBe('squeaking');
    expect(s.x).toBeCloseTo(0);
    expect(s.z).toBeCloseTo(BAIT.range);
    expect(s.y).toBeCloseTo(BAIT.ballRadius);
  });

  it('stops before a wall', () => {
    const s = createBait();
    throwBait(s, 0, 0, Math.PI / 2, (x) => x < 2.1);
    expect(s.toX).toBeCloseTo(2);
    expect(s.toZ).toBeCloseTo(0);
  });

  it('squeaks exactly 3 times within 4 s after landing, then goes idle', () => {
    const s = createBait();
    throwBait(s, 0, 0, 0, open);
    const land = BAIT.flight + BAIT.bounceTime;
    const times = run(s, land + BAIT.duration + 1);
    expect(times).toHaveLength(BAIT.squeaks);
    expect(times[0]).toBeGreaterThanOrEqual(land - 0.05);
    expect((times[2] ?? 99) - (times[0] ?? 0)).toBeCloseTo(squeakTime(2), 1);
    expect((times[2] ?? 99) - land).toBeLessThan(BAIT.duration);
    expect(s.phase).toBe('idle');
  });

  it('has a 2 s cooldown shown as HUD progress', () => {
    const s = createBait();
    expect(baitReady(s)).toBe(1);
    throwBait(s, 0, 0, 0, open);
    expect(throwBait(s, 0, 0, 0, open)).toBe(false);
    expect(baitReady(s)).toBe(0);
    run(s, 1);
    expect(baitReady(s)).toBeCloseTo(0.5, 1);
    run(s, 1.05);
    expect(throwBait(s, 0, 0, 0, open)).toBe(true);
  });

  it('a squeak attracts like a scream but never pacifies', () => {
    expect(noiseReaction('socke', 'wander', 'bait', LIGHT.night)).toBe('hear');
    expect(noiseReaction('rudi', 'wander', 'bait', LIGHT.fridge)).toBe('hear');
    expect(noiseReaction('hand', 'wander', 'bait', LIGHT.lightning)).toBe('ignore');
  });

  it('a sock walks to the ball, not to the chicken', () => {
    const s = createBait();
    throwBait(s, 0, 0, 0, open);
    run(s, BAIT.flight + BAIT.bounceTime + 0.1);
    const sock = createSpook(0, 9);
    hearSound(sock, s.toX, s.toZ);
    expect(sock.targetX).toBeCloseTo(0);
    expect(sock.targetZ).toBeCloseTo(BAIT.range);
    const inp = {
      dt: 0.05,
      chickenX: -20,
      chickenZ: 0,
      chickenMoving: false,
      canMove: open,
      rand: () => 0.5,
    };
    for (let i = 0; i < 60; i++) stepSpook(sock, inp);
    expect(Math.hypot(sock.x - s.toX, sock.z - s.toZ)).toBeLessThan(0.5);
  });

  it('Rudi drives to the ball while the squeak is fresh', () => {
    const r = createSpook(10, 0, 'rudi');
    wakeRudi(r);
    hearSound(r, 0, 5);
    const inp = {
      dt: 0.05,
      chickenX: 30,
      chickenZ: 30,
      chickenMoving: false,
      canMove: open,
      rand: () => 0.5,
    };
    for (let t = 0; t < RUDI.noiseMemory; t += inp.dt) stepSpook(r, inp);
    expect(Math.hypot(r.x - 0, r.z - 5)).toBeLessThan(11.2 - 3);
  });
});
