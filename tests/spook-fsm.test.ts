import { describe, expect, it } from 'vitest';
import {
  CATCH_GRACE,
  HAND,
  RUDI,
  SPOOK,
  createSpook,
  hearSound,
  pacify,
  popHand,
  stepSpook,
  tickGrace,
  wakeRudi,
  type SpookInput,
} from '@/core/spook-fsm';

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

  it('chasing sock outruns the chicken (>= 1.1x) and locks on when close', () => {
    expect(SPOOK.chaseSpeed).toBeGreaterThanOrEqual(3.2 * 1.1);
    const s = createSpook(10, 10);
    hearSound(s, 16, 10);
    run(s, input(), SPOOK.alertTime + 0.1);
    // Chicken 2 m away, off the heard line: the sock homes in on it instead of the sound.
    const near = input({ chickenX: 10, chickenZ: 12 });
    run(s, near, 0.3);
    expect(s.targetX).toBe(10);
    expect(s.targetZ).toBe(12);
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

describe('spook kinds rudi / hand / peaceful', () => {
  it('rudi starts dormant, ignores sound, wakes into parked wander', () => {
    const s = createSpook(10, 10, 'rudi');
    expect(s.mode).toBe('dormant');
    hearSound(s, 12, 10);
    expect(s.mode).toBe('dormant');
    wakeRudi(s);
    expect(s.mode).toBe('wander');
  });

  it('rudi is slower than the chicken and deaf while the wake-up flicker lasts', () => {
    expect(RUDI.speed).toBeLessThan(3.2);
    const s = createSpook(10, 10, 'rudi');
    wakeRudi(s);
    hearSound(s, 30, 10);
    expect(s.mode).toBe('wander');
    const events = run(s, input({ chickenX: 10.3, chickenZ: 10, chickenMoving: true }), 1.2);
    expect(events).toEqual([]);
    run(s, input(), RUDI.wakeTime);
    expect(s.wake).toBe(0);
    hearSound(s, 30, 10);
    expect(s.mode).toBe('chase');
  });

  it('rudi moves only while the last noise is fresh', () => {
    const s = createSpook(10, 10, 'rudi');
    wakeRudi(s);
    run(s, input(), RUDI.wakeTime + 0.1);
    hearSound(s, 30, 10);
    expect(s.mode).toBe('chase');
    run(s, input(), 0.5);
    const moved = s.x;
    expect(moved).toBeGreaterThan(10);
    run(s, input(), RUDI.noiseMemory + 0.2);
    const parked = s.x;
    run(s, input(), 1);
    expect(s.x).toBe(parked);
    expect(s.noiseAge).toBeGreaterThan(RUDI.noiseMemory);
  });

  it('hand grabs inside grabRadius after emergeTime', () => {
    const s = createSpook(10, 10, 'hand');
    const inp = input({ chickenX: 10 + HAND.grabRadius - 0.2, chickenZ: 10 });
    const events = run(s, inp, HAND.emergeTime + 0.2);
    expect(events).toEqual(['caught']);
  });

  it('hand does not grab from outside the radius', () => {
    const s = createSpook(10, 10, 'hand');
    const events = run(s, input({ chickenX: 10 + HAND.grabRadius + 1, chickenZ: 10 }), 3);
    expect(events).toEqual([]);
    expect(s.mode).toBe('wander');
  });

  it('popHand at a spot next to the chicken sinks back home afterwards', () => {
    const s = createSpook(10, 10, 'hand');
    popHand(s, 12, 11);
    expect([s.x, s.z]).toEqual([12, 11]);
    run(s, input(), 0.05 + HAND.grabTime + HAND.cooldown + 0.2);
    expect(s.mode).toBe('wander');
    expect([s.x, s.z]).toEqual([10, 10]);
  });

  it('popHand scare cannot catch', () => {
    const s = createSpook(10, 10, 'hand');
    popHand(s);
    expect(s.scare).toBe(true);
    const events = run(s, input({ chickenX: 10.5, chickenZ: 10 }), 0.3);
    expect(events).toEqual([]);
    expect(s.mode).toBe('chase');
  });

  it('pacified spooks follow and never catch', () => {
    const s = createSpook(10, 10, 'socke');
    pacify(s);
    const events = run(s, input({ chickenX: 10.2, chickenZ: 10, chickenMoving: true }), 5);
    expect(events).toEqual([]);
    expect(s.mode).toBe('follow');
    const far = createSpook(10, 10, 'socke');
    pacify(far);
    run(far, input({ chickenX: 20, chickenZ: 10 }), 6);
    expect(20 - far.x).toBeLessThan(2);
  });
});

describe('catch grace period', () => {
  it('counts down with simulation dt only (pause, cards and freeze hold it)', () => {
    let t = CATCH_GRACE;
    // Paused for 3 s: dt is 0, the grace period is untouched.
    for (let i = 0; i < 180; i++) t = tickGrace(t, 0);
    expect(t).toBe(CATCH_GRACE);
    for (let i = 0; i < 20; i++) t = tickGrace(t, 0.05);
    expect(t).toBeCloseTo(CATCH_GRACE - 1, 5);
    for (let i = 0; i < 40; i++) t = tickGrace(t, 0.05);
    expect(t).toBe(0);
  });
});
