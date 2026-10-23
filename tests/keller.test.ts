import { describe, expect, it } from 'vitest';
import {
  canOpenHollow,
  grantHat,
  HOLLOW_COOLDOWN,
  HOLLOW_LOCK_FLAG,
  hearHollow,
  KELLER_FLAG,
  openDonation,
  openHollow,
  openOnce,
  secretFound,
  type Flags,
} from '@/core/keller';
import { parseHouseMap } from '@/core/grid';
import { GridCell } from '@/core/types';
import {
  CUTAWAY_ROW,
  HOLLOW_CELL,
  HOUSE_ASCII,
  HOUSE_ROOMS,
  INTERACTABLES,
  roomIdAt,
} from '@/world/house-map';

describe('keller: hollow wall', () => {
  it('stays mute before lock 1 (mission 1) is open', () => {
    const f: Flags = {};
    expect(hearHollow(f, false, 5, -10)).toBe('ignored');
    expect(f[KELLER_FLAG.heard]).toBeUndefined();
    expect(canOpenHollow(f)).toBe(false);
    f[HOLLOW_LOCK_FLAG] = true;
    expect(hearHollow(f, false, 6, -10)).toBe('hohl');
    expect(canOpenHollow(f)).toBe(true);
  });

  it('sounds hollow on a scream and unlocks E', () => {
    const f: Flags = { [HOLLOW_LOCK_FLAG]: true };
    expect(canOpenHollow(f)).toBe(false);
    expect(hearHollow(f, false, 5, -10)).toBe('hohl');
    expect(f[KELLER_FLAG.heard]).toBe(true);
    expect(canOpenHollow(f)).toBe(true);
  });

  it('ignores toy box echoes and bait squeaks', () => {
    const f: Flags = { [HOLLOW_LOCK_FLAG]: true };
    expect(hearHollow(f, true, 5, -10)).toBe('ignored');
    expect(canOpenHollow(f)).toBe(false);
  });

  it('rate-limits the reaction', () => {
    const f: Flags = { [HOLLOW_LOCK_FLAG]: true };
    expect(hearHollow(f, false, 5, -10)).toBe('hohl');
    expect(hearHollow(f, false, 5 + HOLLOW_COOLDOWN / 2, 5)).toBe('cooldown');
    expect(hearHollow(f, false, 5 + HOLLOW_COOLDOWN, 5)).toBe('hohl');
  });

  it('opens once and stays silent afterwards', () => {
    const f: Flags = { [HOLLOW_LOCK_FLAG]: true };
    expect(openHollow(f)).toBe(false);
    hearHollow(f, false, 0, -10);
    expect(openHollow(f)).toBe(true);
    expect(openHollow(f)).toBe(false);
    expect(canOpenHollow(f)).toBe(false);
    expect(hearHollow(f, false, 20, 0)).toBe('ignored');
  });
});

describe('keller: rewards', () => {
  it('Spendenkarton and chest pay exactly once', () => {
    const f: Flags = {};
    expect(secretFound(f)).toBe(false);
    expect(openDonation(f)).toBe(true);
    expect(openDonation(f)).toBe(false);
    expect(secretFound(f)).toBe(true);
    expect(openOnce(f, KELLER_FLAG.chest)).toBe(true);
    expect(openOnce(f, KELLER_FLAG.chest)).toBe(false);
  });

  it('grants and wears the crown without duplicates', () => {
    expect(grantHat(['hexenhut'], 'krone')).toEqual({ hats: ['hexenhut', 'krone'], hat: 'krone' });
    expect(grantHat(['krone'], 'krone')).toEqual({ hats: ['krone'], hat: 'krone' });
  });
});

describe('keller: map', () => {
  const map = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);

  it('has exactly one hollow cell between Flur and Keller', () => {
    const hollow = map.cells.flatMap((row, y) =>
      row.flatMap((c, x) => (c === GridCell.Hollow ? [{ x, y }] : [])),
    );
    expect(hollow).toEqual([{ x: HOLLOW_CELL.x, y: HOLLOW_CELL.y }]);
    expect(roomIdAt(HOLLOW_CELL.x + 0.5, HOLLOW_CELL.y - 0.5)).toBe('flur');
    expect(roomIdAt(HOLLOW_CELL.x + 0.5, HOLLOW_CELL.y + 1.5)).toBe('keller');
    expect(HOLLOW_CELL.y).toBe(CUTAWAY_ROW);
  });

  it('Keller interactables sit on T cells inside the Keller and a sock guards it', () => {
    for (const def of INTERACTABLES.filter((d) => d.room === 'keller')) {
      expect(map.cells[def.cell.y]?.[def.cell.x]).toBe(GridCell.Interactable);
      expect(roomIdAt(def.cell.x + 0.5, def.cell.y + 0.5)).toBe('keller');
    }
    const spooks = map.cells.flatMap((row, y) =>
      row.flatMap((c, x) => (c === GridCell.SpookSpawn ? [{ x, y }] : [])),
    );
    expect(spooks.filter((c) => roomIdAt(c.x + 0.5, c.y + 0.5) === 'keller')).toHaveLength(1);
  });
});
