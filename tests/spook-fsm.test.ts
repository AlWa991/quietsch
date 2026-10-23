import { describe, expect, it } from 'vitest';
import { SPOOK, createSpook, hearSound, stepSpook, type SpookInput } from '@/core/spook-fsm';

function input(over: Partial<SpookInput> = {}): SpookInput {
  let seed = 1;
  return {
    dt: 0.05,
    chickenX: 100,
    chickenZ: 100,
    chickenMoving: false,
    canMove: () => true,
    rand: () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    },
    ...over,
  };
}

function run(s: ReturnType<typeof createSpook>, inp: SpookInput, seconds: number): string[] {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += inp.dt) {
    const e = stepSpook(s, inp);
    if (e) events.push(e);
  }
  return events;
}

describe('spook fsm', () => {
  it('wanders near home when nothing happens', () => {
    const s = createSpook(10, 10);
    run(s, input(), 20);
    expect(s.mode).toBe('wander');
    expect(Math.hypot(s.x - 10, s.z - 10)).toBeLessThanOrEqual(SPOOK.wanderRadius + 0.01);
  });

  it('wander -> alert -> chase on hearing, moving towards the sound', () => {
    const s = createSpook(10, 10);
    hearSound(s, 16, 10);
    expect(s.mode).toBe('alert');
    run(s, input(), SPOOK.alertTime + 0.1);
    expect(s.mode).toBe('chase');
    const before = Math.abs(16 - s.x);
    run(s, input(), 0.5);
    expect(Math.abs(16 - s.x)).toBeLessThan(before);
  });

  it('chase reaches the heard position, lingers, then returns home and wanders', () => {
    const s = createSpook(10, 10);
    hearSound(s, 13, 10);
    run(s, input(), SPOOK.alertTime + 3 / SPOOK.chaseSpeed + 0.3);
    expect(Math.hypot(s.x - 13, s.z - 10)).toBeLessThan(SPOOK.arriveEps);
    run(s, input(), SPOOK.lingerTime + 0.1);
    expect(s.mode).toBe('return');
    run(s, input(), 3 / SPOOK.returnSpeed + 0.5);
    expect(s.mode).toBe('wander');
  });

  it('hearing again during a chase redirects without re-alerting', () => {
    const s = createSpook(10, 10);
    hearSound(s, 20, 10);
    run(s, input(), SPOOK.alertTime + 0.1);
    hearSound(s, 10, 20);
    expect(s.mode).toBe('chase');
    expect(s.targetZ).toBe(20);
  });

  it('catches the chicken on contact once, then cools down', () => {
    const s = createSpook(10, 10);
    const inp = input({ chickenX: 10.3, chickenZ: 10 });
    expect(stepSpook(s, inp)).toBe('caught');
    expect(s.mode).toBe('return');
    expect(stepSpook(s, inp)).toBeNull();
    const events = run(s, inp, SPOOK.catchCooldown + 0.2);
    expect(events.length).toBeLessThanOrEqual(1);
  });

  it('notices hop noise only within the notice radius', () => {
    const far = createSpook(10, 10);
    stepSpook(far, input({ chickenX: 13, chickenZ: 10, chickenMoving: true }));
    expect(far.mode).toBe('wander');
    const near = createSpook(10, 10);
    stepSpook(near, input({ chickenX: 11.5, chickenZ: 10, chickenMoving: true }));
    expect(near.mode).toBe('alert');
  });

  it('does not walk through blocked cells', () => {
    const s = createSpook(10, 10);
    hearSound(s, 16, 10);
    const wall = input({ canMove: (x) => x < 12 });
    run(s, wall, 5);
    expect(s.x).toBeLessThan(12);
  });
});
