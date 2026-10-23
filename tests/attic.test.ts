import { describe, expect, it } from 'vitest';
import {
  ATTIC_STARS,
  atticUnlocked,
  COLLAR,
  createCollar,
  stepCollar,
  totalStars,
  wearCollar,
} from '@/core/attic';
import { createSpook, popHand, stepSpook, wakeRudi, type SpookInput } from '@/core/spook-fsm';
import { parseHouseMap } from '@/core/grid';
import { GridCell } from '@/core/types';
import {
  ATTIC_ARRIVAL,
  HOUSE_ASCII,
  HOUSE_ROOMS,
  INTERACTABLES,
  LADDER_ARRIVAL,
  roomIdAt,
} from '@/world/house-map';

const room = (
  done: boolean,
  time = 10,
  caught = 0,
): { done: boolean; time: number; caught: number } => ({
  done,
  time,
  caught,
});

describe('dachboden: 7-star gate', () => {
  it('sums stars of the three mission rooms only', () => {
    expect(totalStars({})).toBe(0);
    expect(
      totalStars({
        kinderzimmer: room(true),
        kueche: room(true, 999),
        wohnzimmer: room(true, 10, 2),
        keller: room(true),
      }),
    ).toBe(3 + 2 + 2);
  });

  it('opens at exactly 7 stars', () => {
    expect(ATTIC_STARS).toBe(7);
    expect(atticUnlocked(6)).toBe(false);
    expect(atticUnlocked(7)).toBe(true);
    expect(atticUnlocked(9)).toBe(true);
  });
});

describe('dachboden: Bellos Halsband', () => {
  it('needs the collar, lasts 20 s, then recharges', () => {
    const c = createCollar();
    expect(wearCollar(c, false)).toBe(false);
    expect(wearCollar(c, true)).toBe(true);
    expect(wearCollar(c, true)).toBe(false);
    let off = 0;
    for (let t = 0; t < COLLAR.active + 0.5; t += 0.1) if (stepCollar(c, 0.1)) off++;
    expect(off).toBe(1);
    expect(c.active).toBe(0);
    expect(wearCollar(c, true)).toBe(false);
    for (let t = 0; t < COLLAR.recharge + 0.5; t += 0.1) stepCollar(c, 0.1);
    expect(wearCollar(c, true)).toBe(true);
  });

  it('while worn, no spook kind catches or grabs the chicken', () => {
    const inp: SpookInput = {
      dt: 0.05,
      chickenX: 0,
      chickenZ: 0,
      chickenMoving: true,
      canMove: () => true,
      rand: () => 0.5,
      ignore: true,
    };
    const sock = createSpook(0.3, 0);
    const rudi = createSpook(0.3, 0, 'rudi');
    wakeRudi(rudi);
    const hand = createSpook(0.5, 0, 'hand');
    popHand(hand);
    hand.scare = false;
    for (const s of [sock, rudi, hand]) {
      let caught = 0;
      for (let i = 0; i < 200; i++) if (stepSpook(s, inp) === 'caught') caught++;
      expect(caught).toBe(0);
    }
    // Without the collar the same sock catches at once.
    const sock2 = createSpook(0.3, 0);
    expect(stepSpook(sock2, { ...inp, ignore: false })).toBe('caught');
  });
});

describe('dachboden: map', () => {
  const map = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);

  it('is an island: no walkable cell touches the house', () => {
    const b = HOUSE_ROOMS.find((r) => r.id === 'dachboden')?.bounds;
    if (!b) throw new Error('no dachboden');
    for (let y = b.y - 1; y <= b.y + b.h; y++) {
      for (const x of [b.x - 1, b.x + b.w]) expect(map.cells[y]?.[x]).toBe(GridCell.Wall);
    }
    expect(roomIdAt(ATTIC_ARRIVAL.x, ATTIC_ARRIVAL.z)).toBe('dachboden');
    expect(roomIdAt(LADDER_ARRIVAL.x, LADDER_ARRIVAL.z)).toBe('flur');
  });

  it('ladder sits in the Flur, collar and story bed in the Dachboden', () => {
    const at = (id: string): string | null => {
      const d = INTERACTABLES.find((i) => i.id === id);
      return d ? roomIdAt(d.cell.x + 0.5, d.cell.y + 0.5) : null;
    };
    expect(at('ladder')).toBe('flur');
    expect(at('collar')).toBe('dachboden');
    expect(at('dogbed')).toBe('dachboden');
    expect(at('hatch')).toBe('dachboden');
    for (const d of INTERACTABLES) {
      const c = map.cells[d.cell.y]?.[d.cell.x];
      expect(c === GridCell.Interactable || c === GridCell.Hollow).toBe(true);
    }
  });
});
