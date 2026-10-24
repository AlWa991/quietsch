import { describe, expect, it } from 'vitest';
import {
  applyHit,
  createCombo,
  createDrop,
  createStreak,
  damageStage,
  DROP,
  ENEMY_HP,
  hitsBack,
  inPeckCone,
  KNOCK_DECAY,
  launchDrop,
  PECK,
  peckDamage,
  pressPeck,
  registerKill,
  stepCombo,
  stepDrop,
  stepHealth,
  type Health,
} from '@/core/combat';
import { createSpook, stepSpook } from '@/core/spook-fsm';

const ctx = { base: 1, stunned: false, behind: false, inFridgeLight: false };

function run(c: ReturnType<typeof createCombo>, seconds: number, dt = 1 / 120): number[] {
  const impacts: number[] = [];
  for (let t = 0; t < seconds; t += dt) {
    const i = stepCombo(c, dt);
    if (i > 0) impacts.push(i);
  }
  return impacts;
}

describe('peck combo', () => {
  it('three presses in rhythm make a 1-2-3 combo, then a short recovery', () => {
    const c = createCombo();
    expect(pressPeck(c)).toBe(1);
    expect(run(c, 0.3)).toEqual([1]);
    expect(pressPeck(c)).toBe(2);
    expect(run(c, 0.3)).toEqual([2]);
    expect(pressPeck(c)).toBe(3);
    expect(run(c, 0.26)).toEqual([3]);
    expect(pressPeck(c)).toBe(0); // recovering
    run(c, PECK.recover + 0.01);
    expect(pressPeck(c)).toBe(1);
  });

  it('a press during a swing is buffered and chains the next hit', () => {
    const c = createCombo();
    pressPeck(c);
    expect(run(c, 0.1)).toEqual([1]);
    expect(pressPeck(c)).toBe(0);
    expect(run(c, 0.4)).toEqual([2]);
    expect(c.starts).toBe(2);
  });

  it('waiting longer than the window restarts at hit 1', () => {
    const c = createCombo();
    pressPeck(c);
    run(c, PECK.swing + PECK.comboWindow + 0.05);
    expect(pressPeck(c)).toBe(1);
  });
});

describe('hits', () => {
  it('the cone hits in front within 1.2 m only', () => {
    expect(inPeckCone(0, 0, 0, 0, 1)).toBe(true); // facing +z
    expect(inPeckCone(0, 0, 0, 0, 1.3)).toBe(false);
    expect(inPeckCone(0, 0, 0, 0, -1)).toBe(false);
    expect(inPeckCone(0, 0, Math.PI / 2, 1, 0)).toBe(true);
    expect(inPeckCone(0, 0, 0, 0.1, -0.1)).toBe(true); // overlapping
  });

  it('damage: Rudi is armoured unless stunned or in the fridge light; stun and teddy back double', () => {
    expect(peckDamage('socke', ctx)).toBe(1);
    expect(peckDamage('rudi', ctx)).toBe(0);
    expect(peckDamage('rudi', { ...ctx, inFridgeLight: true })).toBe(1);
    expect(peckDamage('rudi', { ...ctx, stunned: true })).toBe(2);
    expect(peckDamage('teddy', { ...ctx, behind: true })).toBe(2);
    expect(peckDamage('teddy', { ...ctx, behind: true, stunned: true, base: 2 })).toBe(8);
    expect(hitsBack(0, 0, 1)).toBe(true); // target faces +z, hit pushes it along +z
    expect(hitsBack(0, 0, -1)).toBe(false);
  });

  it('a sock dies after 3 pecks, with flash, bar and knockback distance ~ knock', () => {
    const s = createSpook(5, 5, 'socke');
    expect(s.hp).toBe(ENEMY_HP.socke);
    expect(applyHit(s, 1, 1, 0, 1.5)).toBe('hurt');
    expect(s.flash).toBeGreaterThan(0);
    expect(s.bar).toBe(3);
    expect(damageStage(s)).toBe(1);
    const x0 = s.x;
    for (let i = 0; i < 120; i++) stepHealth(s, 1 / 60, s, () => true);
    expect(s.x - x0).toBeGreaterThan(1.3);
    expect(s.x - x0).toBeLessThan(1.8);
    expect(applyHit(s, 1, 1, 0, 1.5)).toBe('hurt');
    expect(damageStage(s)).toBe(2);
    expect(applyHit(s, 1, 1, 0, 1.5)).toBe('defeated');
    expect(KNOCK_DECAY).toBeGreaterThan(0);
  });

  it('knockback stops at walls', () => {
    const h: Health = { hp: 3, maxHp: 3, flash: 0, bar: 0, kbx: 0, kbz: 0 };
    const pos = { x: 0, z: 0 };
    applyHit(h, 1, 1, 0, 2);
    for (let i = 0; i < 60; i++) stepHealth(h, 1 / 60, pos, (x) => x < 0.5);
    expect(pos.x).toBeLessThan(0.5);
    expect(h.kbx).toBe(0);
  });

  it('stunned and frozen spooks do not move or catch', () => {
    const s = createSpook(0, 0, 'socke');
    s.mode = 'chase';
    s.timer = 5;
    s.stun = 1.5;
    const input = {
      dt: 0.1,
      chickenX: 0.2,
      chickenZ: 0,
      chickenMoving: true,
      canMove: () => true,
      rand: () => 0.5,
    };
    expect(stepSpook(s, input)).toBeNull();
    expect(s.x).toBe(0);
    s.stun = 0;
    s.freeze = 0.5;
    expect(stepSpook(s, input)).toBeNull();
    s.freeze = 0;
    expect(stepSpook(s, input)).toBe('caught');
  });

  it('gone spooks are inert', () => {
    const s = createSpook(0, 0, 'socke');
    s.gone = true;
    expect(
      stepSpook(s, {
        dt: 0.1,
        chickenX: 0,
        chickenZ: 0,
        chickenMoving: true,
        canMove: () => true,
        rand: () => 0.5,
      }),
    ).toBeNull();
  });
});

describe('kill streaks', () => {
  it('2 kills in 3 s = Doppel +20, 3 = Dreifach +50, a pause resets', () => {
    const st = createStreak();
    expect(registerKill(st, 10)).toBe(0);
    expect(registerKill(st, 12)).toBe(20);
    expect(registerKill(st, 14.5)).toBe(50);
    expect(registerKill(st, 30)).toBe(0);
  });
});

describe('feather drops', () => {
  it('burst out, land, and fly into the chicken once it is within the magnet radius', () => {
    const d = createDrop();
    launchDrop(d, 0, 0, 3, () => 0.5);
    let collected = false;
    for (let i = 0; i < 120 && !collected; i++) collected = stepDrop(d, 1 / 60, 50, 50, () => true);
    expect(collected).toBe(false);
    expect(d.y).toBeLessThan(0.1); // landed
    const cx = d.x + DROP.magnet - 0.2;
    for (let i = 0; i < 120 && !collected; i++)
      collected = stepDrop(d, 1 / 60, cx, d.z, () => true);
    expect(collected).toBe(true);
    expect(d.active).toBe(false);
  });

  it('expires after its life time', () => {
    const d = createDrop();
    launchDrop(d, 0, 0, 1, () => 0.1);
    for (let t = 0; t < DROP.life + 1; t += 0.1) stepDrop(d, 0.1, 99, 99, () => true);
    expect(d.active).toBe(false);
  });
});
