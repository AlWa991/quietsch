import { describe, expect, it } from 'vitest';
import {
  CATCH_LOSS,
  CATCH_LOSS_THICK_SKIN,
  MISSION_REWARD,
  RANK_XP,
  SHOP_ITEMS,
  addXp,
  applyCatch,
  buy,
  canBuy,
  heartRegenRate,
  playerStats,
  rankForXp,
  rankProgress,
  roomStars,
  toggleHat,
  type Wallet,
} from '@/core/economy';
import { SONAR, comboBonus } from '@/core/sonar';
import { KELLER_REWARD } from '@/core/keller';
import { INTERACTABLES } from '@/world/house-map';

const wallet = (over: Partial<Wallet> = {}): Wallet => ({
  feathers: 1000,
  upgrades: {},
  hats: [],
  hat: null,
  ...over,
});

describe('ranks', () => {
  it('maps xp thresholds to ranks Küken..Legende', () => {
    expect(RANK_XP).toEqual([0, 250, 700, 1400, 2400]);
    expect(rankForXp(0)).toBe(1);
    expect(rankForXp(249)).toBe(1);
    expect(rankForXp(250)).toBe(2);
    expect(rankForXp(700)).toBe(3);
    expect(rankForXp(1400)).toBe(4);
    expect(rankForXp(2400)).toBe(5);
    expect(rankForXp(99999)).toBe(5);
  });

  it('reports progress towards the next rank and 1 at max', () => {
    expect(rankProgress(0)).toBe(0);
    expect(rankProgress(125)).toBeCloseTo(0.5);
    expect(rankProgress(2400)).toBe(1);
    expect(rankProgress(5000)).toBe(1);
  });

  it('addXp counts rank-ups and ignores negative amounts', () => {
    expect(addXp(240, 20)).toEqual({ xp: 260, rank: 2, ranksGained: 1 });
    expect(addXp(0, 1500)).toEqual({ xp: 1500, rank: 4, ranksGained: 3 });
    expect(addXp(300, -50)).toEqual({ xp: 300, rank: 2, ranksGained: 0 });
  });
});

describe('catch penalty', () => {
  it('loses one heart and floor(feathers * share)', () => {
    const r = applyCatch(3, 99, CATCH_LOSS);
    expect(r.hearts).toBe(2);
    expect(r.lost).toBe(29);
    expect(r.feathers).toBe(70);
    expect(r.panic).toBe(false);
  });

  it('never goes below zero hearts and panics at 0', () => {
    expect(applyCatch(1, 10, CATCH_LOSS).panic).toBe(true);
    const r = applyCatch(0, 10, CATCH_LOSS);
    expect(r.hearts).toBe(0);
    expect(r.panic).toBe(true);
  });

  it('thick skin loses less; zero feathers lose nothing', () => {
    expect(applyCatch(3, 100, CATCH_LOSS_THICK_SKIN).lost).toBe(15);
    expect(applyCatch(3, 0, CATCH_LOSS).lost).toBe(0);
  });

  it('regenerates a full heart bar in ten seconds', () => {
    expect(heartRegenRate(3)).toBeCloseTo(0.3);
    expect(heartRegenRate(4) * 10).toBeCloseTo(4);
  });
});

describe('shop', () => {
  it('uses the GDD prices', () => {
    const prices = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i.price]));
    expect(prices).toEqual({
      lunge: 80,
      fuesse: 60,
      mut: 120,
      haut: 100,
      koeder: 150,
      hexenhut: 40,
      kuerbis: 40,
      krone: 250,
    });
  });

  it('canBuy reports unknown, funds and owned', () => {
    expect(canBuy(wallet(), 'nope')).toBe('unknown');
    expect(canBuy(wallet({ feathers: 79 }), 'lunge')).toBe('funds');
    expect(canBuy(wallet({ upgrades: { lunge: 1 } }), 'lunge')).toBe('owned');
    expect(canBuy(wallet({ hats: ['krone'] }), 'krone')).toBe('owned');
    expect(canBuy(wallet({ feathers: 80 }), 'lunge')).toBeNull();
  });

  it('buy returns a new wallet and leaves the input untouched', () => {
    const w = wallet({ feathers: 200 });
    const r = buy(w, 'lunge');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.wallet.feathers).toBe(120);
    expect(r.wallet.upgrades.lunge).toBe(1);
    expect(w).toEqual(wallet({ feathers: 200 }));
    expect(r.wallet.upgrades).not.toBe(w.upgrades);
  });

  it('wears a hat on purchase and rejects repeat or poor purchases', () => {
    const r = buy(wallet(), 'hexenhut');
    expect(r.ok && r.wallet.hat).toBe('hexenhut');
    expect(r.ok && r.wallet.hats).toEqual(['hexenhut']);
    expect(buy(wallet({ upgrades: { mut: 1 } }), 'mut')).toEqual({ ok: false, error: 'owned' });
    expect(buy(wallet({ feathers: 5 }), 'krone')).toEqual({ ok: false, error: 'funds' });
    expect(buy(wallet(), 'x')).toEqual({ ok: false, error: 'unknown' });
  });

  it('toggleHat takes off, puts on and ignores unowned hats', () => {
    const w = wallet({ hats: ['krone', 'kuerbis'], hat: 'krone' });
    expect(toggleHat(w, 'krone')).toBeNull();
    expect(toggleHat(w, 'kuerbis')).toBe('kuerbis');
    expect(toggleHat(w, 'hexenhut')).toBe('krone');
  });
});

describe('playerStats', () => {
  it('has base values without upgrades', () => {
    expect(playerStats({})).toEqual({
      maxRadius: SONAR.maxRadius,
      maxHold: SONAR.maxHold,
      speedMul: 1,
      hopNoise: 1,
      maxHearts: 3,
      lossShare: CATCH_LOSS,
    });
  });

  it('applies each upgrade', () => {
    const s = playerStats({ lunge: 1, fuesse: 1, mut: 1, haut: 1 });
    expect(s.maxRadius).toBe(18);
    expect(s.maxHold).toBe(1.2);
    expect(s.speedMul).toBe(1.25);
    expect(s.hopNoise).toBe(0.5);
    expect(s.maxHearts).toBe(4);
    expect(s.lossShare).toBe(0.15);
  });
});

describe('roomStars', () => {
  it('gives 0 for an unfinished room and up to 3 for a clean fast one', () => {
    expect(roomStars({ time: 10, caught: 0, done: false })).toBe(0);
    expect(roomStars({ time: 500, caught: 2, done: true })).toBe(1);
    expect(roomStars({ time: 100, caught: 2, done: true })).toBe(2);
    expect(roomStars({ time: 500, caught: 0, done: true })).toBe(2);
    expect(roomStars({ time: 100, caught: 0, done: true })).toBe(3);
  });
});

describe('shop listing', () => {
  it('keeps the Krone out of the shop until the Keller exists', () => {
    expect(SHOP_ITEMS.find((i) => i.id === 'krone')?.secret).toBe(true);
    expect(SHOP_ITEMS.filter((i) => !i.secret).map((i) => i.id)).not.toContain('krone');
  });
});

describe('feather income of a typical run (playtest-2 #7)', () => {
  /** Solid furniture per room from world/builder FURNITURE (rugs/cushions pay nothing). */
  const FURNITURE_PROPS: Record<string, number> = {
    flur: 8,
    kinderzimmer: 8,
    kueche: 12,
    wohnzimmer: 13,
    keller: 4,
  };
  const propsIn = (room: string): number =>
    (FURNITURE_PROPS[room] ?? 0) + INTERACTABLES.filter((i) => i.room === room).length;
  /**
   * First long scream per room reveals most of it as one combo, then a few shorter screams
   * pick up the rest. Counts are first-time reveals per scream.
   */
  const SCREAMS: Record<string, number[]> = {
    flur: [7, 2, 1, 1],
    kinderzimmer: [9, 3, 2, 1],
    kueche: [8, 4, 2, 1],
    wohnzimmer: [9, 3, 2, 1],
    keller: [5, 1],
  };
  const income = (rooms: string[]): number => {
    let f = 0;
    for (const room of rooms) {
      const screams = SCREAMS[room] ?? [];
      expect(screams.reduce((a, b) => a + b, 0)).toBe(propsIn(room));
      for (const n of screams) f += n * SONAR.featherBase + comboBonus(n);
    }
    return f;
  };

  it('a full run incl. Keller earns 450-550 feathers (shop ~590: choose ~3 items)', () => {
    const missions = 3 * MISSION_REWARD.feathers;
    const wrongBox = -10;
    const total =
      income(['flur', 'kinderzimmer', 'kueche', 'wohnzimmer', 'keller']) +
      missions +
      KELLER_REWARD.chestFeathers +
      wrongBox;
    expect(total).toBeGreaterThanOrEqual(450);
    expect(total).toBeLessThanOrEqual(550);
    const shop = SHOP_ITEMS.filter((i) => !i.secret).reduce((a, i) => a + i.price, 0);
    expect(total).toBeLessThan(shop);
  });

  it('the first scream in a room is worth at most 2·n + 40', () => {
    expect(9 * SONAR.featherBase + comboBonus(9)).toBe(58);
    expect(comboBonus(15)).toBe(40);
  });

  it('a run ends around rank Hahn (XP = feathers + 100/mission + 100 ending)', () => {
    const xp = 520 + 3 * MISSION_REWARD.xp + 100;
    expect(rankForXp(xp)).toBe(3);
  });
});
