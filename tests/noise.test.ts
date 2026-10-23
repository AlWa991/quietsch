import { describe, expect, it } from 'vitest';
import { canPacify, LIGHT, noiseReaction, PACIFY_LIGHTS, peacefulCount } from '@/core/noise';
import {
  createSpook,
  hearSound,
  pacify,
  settle,
  stepSpook,
  wakeRudi,
  type SpookInput,
} from '@/core/spook-fsm';

const input = (over: Partial<SpookInput> = {}): SpookInput => ({
  dt: 0.05,
  chickenX: 0,
  chickenZ: 0,
  chickenMoving: false,
  canMove: () => true,
  rand: () => 0.5,
  ...over,
});

describe('peaceful rules', () => {
  it('socks calm down in any light', () => {
    for (const l of Object.values(LIGHT)) expect(canPacify('socke', 'wander', l)).toBe(true);
    expect(canPacify('socke', 'wander', 0)).toBe(false);
  });

  it('Rudi only in fridge light or the flashlight cone', () => {
    expect(canPacify('rudi', 'chase', LIGHT.fridge)).toBe(true);
    expect(canPacify('rudi', 'chase', LIGHT.torch)).toBe(true);
    expect(canPacify('rudi', 'chase', LIGHT.lightning | LIGHT.night)).toBe(false);
    expect(canPacify('rudi', 'dormant', LIGHT.fridge)).toBe(false);
  });

  it('hands only in lightning', () => {
    expect(canPacify('hand', 'wander', LIGHT.lightning)).toBe(true);
    expect(canPacify('hand', 'wander', LIGHT.torch | LIGHT.fridge | LIGHT.night)).toBe(false);
    expect(PACIFY_LIGHTS.hand).toBe(LIGHT.lightning);
  });

  it('already peaceful spooks are not pacified twice', () => {
    expect(canPacify('socke', 'follow', LIGHT.night)).toBe(false);
    expect(canPacify('socke', 'rest', LIGHT.night)).toBe(false);
  });
});

describe('noise reaction', () => {
  it('a scream in light pacifies, in the dark it attracts', () => {
    expect(noiseReaction('socke', 'wander', 'scream', LIGHT.night)).toBe('pacify');
    expect(noiseReaction('socke', 'wander', 'scream', 0)).toBe('hear');
    expect(noiseReaction('rudi', 'wander', 'scream', LIGHT.fridge)).toBe('pacify');
    expect(noiseReaction('hand', 'wander', 'scream', LIGHT.lightning)).toBe('pacify');
  });

  it('echoes never pacify, hands never walk to a noise', () => {
    expect(noiseReaction('socke', 'wander', 'echo', LIGHT.night)).toBe('hear');
    expect(noiseReaction('hand', 'wander', 'scream', 0)).toBe('ignore');
    expect(noiseReaction('hand', 'wander', 'echo', LIGHT.lightning)).toBe('ignore');
  });

  it('sleeping Rudi and peaceful spooks ignore noise', () => {
    expect(noiseReaction('rudi', 'dormant', 'scream', LIGHT.fridge)).toBe('ignore');
    expect(noiseReaction('socke', 'follow', 'scream', 0)).toBe('ignore');
  });
});

describe('peaceful spooks in the fsm', () => {
  it('peaceful Rudi follows the chicken and never catches', () => {
    const r = createSpook(5, 0, 'rudi');
    wakeRudi(r);
    hearSound(r, 0, 0);
    pacify(r);
    const inp = input({ chickenMoving: true });
    let caught = 0;
    for (let i = 0; i < 100; i++) if (stepSpook(r, inp) === 'caught') caught++;
    expect(caught).toBe(0);
    expect(r.mode).toBe('follow');
    expect(Math.hypot(r.x, r.z)).toBeLessThan(1.6);
  });

  it('peaceful hand never grabs, even right next to the chicken', () => {
    const h = createSpook(0.5, 0, 'hand');
    pacify(h);
    let caught = 0;
    for (let i = 0; i < 100; i++) if (stepSpook(h, input()) === 'caught') caught++;
    expect(caught).toBe(0);
  });

  it('the peaceful flag survives settling (finale, Korb) and is counted', () => {
    const a = createSpook(0, 0, 'socke');
    const b = createSpook(1, 0, 'socke');
    pacify(a);
    settle(a, 3, 3);
    settle(b, 4, 4);
    expect(a.peaceful).toBe(true);
    expect(b.peaceful).toBe(false);
    expect(peacefulCount([a, b])).toEqual({ n: 1, m: 2 });
  });
});
