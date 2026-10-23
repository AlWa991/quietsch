// Pure economy rules (no three, no DOM): XP and ranks, catch penalty, shop, upgrade stats, stars.

import { SONAR } from './sonar';

/** Cumulative XP needed to reach each rank (index 0 = rank 1 Küken ... index 4 = rank 5 Legende). */
export const RANK_XP = [0, 250, 700, 1400, 2400] as const;
export const MAX_RANK = RANK_XP.length;

/** Rewards for finishing a mission. */
export const MISSION_REWARD = { feathers: 50, xp: 100 } as const;

/** Base share of carried feathers lost when caught. */
export const CATCH_LOSS = 0.3;
export const CATCH_LOSS_THICK_SKIN = 0.15;

export const BASE_HEARTS = 3;
/** Seconds at the Korb to refill all hearts from zero. */
export const HEART_REGEN_SECONDS = 10;

/** Rank (1..MAX_RANK) for a total XP value. */
export function rankForXp(xp: number): number {
  let rank = 1;
  for (let i = 0; i < RANK_XP.length; i++) {
    if (xp >= (RANK_XP[i] ?? Infinity)) rank = i + 1;
  }
  return rank;
}

/** Progress 0..1 from the current rank towards the next; 1 at max rank. */
export function rankProgress(xp: number): number {
  const rank = rankForXp(xp);
  const cur = RANK_XP[rank - 1] ?? 0;
  const next = RANK_XP[rank];
  if (next === undefined) return 1;
  return Math.min(1, Math.max(0, (xp - cur) / (next - cur)));
}

export interface XpResult {
  xp: number;
  rank: number;
  /** Number of ranks gained by this award (0 if none). */
  ranksGained: number;
}

/** Add XP (negative amounts are ignored) and report rank-ups. */
export function addXp(xp: number, amount: number): XpResult {
  const before = rankForXp(xp);
  const next = xp + Math.max(0, amount);
  const rank = rankForXp(next);
  return { xp: next, rank, ranksGained: rank - before };
}

export interface CatchResult {
  hearts: number;
  feathers: number;
  lost: number;
  /** True when this catch emptied the last heart. */
  panic: boolean;
}

/** Apply one catch: -1 heart (min 0), lose a share of carried feathers (rounded down). */
export function applyCatch(hearts: number, feathers: number, lossShare: number): CatchResult {
  const lost = Math.floor(Math.max(0, feathers) * lossShare);
  const h = Math.max(0, hearts - 1);
  return { hearts: h, feathers: feathers - lost, lost, panic: h === 0 };
}

/** Fractional hearts regenerated per second at the Korb. */
export function heartRegenRate(maxHearts: number): number {
  return maxHearts / HEART_REGEN_SECONDS;
}

export type ShopItemId =
  'lunge' | 'fuesse' | 'mut' | 'haut' | 'koeder' | 'hexenhut' | 'kuerbis' | 'krone';

export type ShopItemKind = 'upgrade' | 'hat' | 'bait';

export interface ShopItem {
  id: ShopItemId;
  name: string;
  price: number;
  text: string;
  kind: ShopItemKind;
  /** Found in the Keller (P4), never listed in the shop. */
  secret?: boolean;
}

/** Items, prices and flavour texts from GDD "Shop „Bellos Korb“". */
export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'lunge',
    name: 'Große Lunge',
    price: 80,
    text: 'Längerer Schrei. Die Nachbarn haben sich schon beschwert.',
    kind: 'upgrade',
  },
  {
    id: 'fuesse',
    name: 'Flinke Füße',
    price: 60,
    text: 'Schneller über das Parkett. Quietscht dabei nur halb so viel.',
    kind: 'upgrade',
  },
  {
    id: 'mut',
    name: 'Mut',
    price: 120,
    text: 'Ein zusätzliches Herz. Mut heißt, trotzdem zu schreien.',
    kind: 'upgrade',
  },
  {
    id: 'haut',
    name: 'Dicke Haut',
    price: 100,
    text: 'Weniger Federverlust beim Fangen. Gummi hat auch Vorteile.',
    kind: 'upgrade',
  },
  {
    id: 'koeder',
    name: 'Köder: Quietschball',
    price: 150,
    text: 'Neue Taste (Shift). Wirft einen Ball, der alles ablenkt.',
    kind: 'bait',
  },
  {
    id: 'hexenhut',
    name: 'Hexenhut',
    price: 40,
    text: 'Kosmetisch. Sieht gruselig aus, ist aber nur Deko.',
    kind: 'hat',
  },
  {
    id: 'kuerbis',
    name: 'Kürbis-Kopf',
    price: 40,
    text: 'Kosmetisch. Halloween braucht Kürbisse.',
    kind: 'hat',
  },
  {
    id: 'krone',
    name: 'Krone',
    price: 250,
    text: 'Kosmetisch. Für Legenden, die im Keller gefunden wurden.',
    kind: 'hat',
    secret: true,
  },
];

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

/** Minimal state slice the shop reads and writes. */
export interface Wallet {
  feathers: number;
  upgrades: Record<string, number>;
  hats: string[];
  hat: string | null;
}

export type BuyError = 'unknown' | 'owned' | 'funds';

export function isOwned(w: Wallet, id: string): boolean {
  return (w.upgrades[id] ?? 0) > 0 || w.hats.includes(id);
}

export function canBuy(w: Wallet, id: string): BuyError | null {
  const item = shopItem(id);
  if (!item) return 'unknown';
  if (isOwned(w, id)) return 'owned';
  if (w.feathers < item.price) return 'funds';
  return null;
}

/** Buy an item. Returns a new wallet (input untouched) or the reason it failed. Hats are worn on purchase. */
export function buy(
  w: Wallet,
  id: string,
): { ok: true; wallet: Wallet } | { ok: false; error: BuyError } {
  const error = canBuy(w, id);
  const item = shopItem(id);
  if (error || !item) return { ok: false, error: error ?? 'unknown' };
  const wallet: Wallet = {
    feathers: w.feathers - item.price,
    upgrades: { ...w.upgrades },
    hats: [...w.hats],
    hat: w.hat,
  };
  if (item.kind === 'hat') {
    wallet.hats.push(item.id);
    wallet.hat = item.id;
  } else {
    wallet.upgrades[item.id] = 1;
  }
  return { ok: true, wallet };
}

/** Toggle wearing an owned hat. Unowned hats are ignored. */
export function toggleHat(w: Wallet, id: string): string | null {
  if (!w.hats.includes(id)) return w.hat;
  return w.hat === id ? null : id;
}

export interface PlayerStats {
  /** Scream radius at full charge (m). */
  maxRadius: number;
  /** Hold time to reach full charge (s); lower = faster charge. */
  maxHold: number;
  speedMul: number;
  /** Multiplier on how far spooks hear hopping. */
  hopNoise: number;
  maxHearts: number;
  lossShare: number;
}

/** Gameplay stats derived from bought upgrades. */
export function playerStats(upgrades: Record<string, number>): PlayerStats {
  const has = (id: ShopItemId): boolean => (upgrades[id] ?? 0) > 0;
  return {
    maxRadius: has('lunge') ? 18 : SONAR.maxRadius,
    maxHold: has('lunge') ? 1.2 : SONAR.maxHold,
    speedMul: has('fuesse') ? 1.25 : 1,
    hopNoise: has('fuesse') ? 0.5 : 1,
    maxHearts: BASE_HEARTS + (has('mut') ? 1 : 0),
    lossShare: has('haut') ? CATCH_LOSS_THICK_SKIN : CATCH_LOSS,
  };
}

export interface RoomRecord {
  /** Seconds spent in the room while its mission was open. */
  time: number;
  caught: number;
  done: boolean;
}

/** Par time per room for the "unter Zeit" star (seconds). */
export const ROOM_PAR_SECONDS = 240;

/** 0..3 stars: mission done, under par time (only with mission done), never caught. */
export function roomStars(r: RoomRecord, par: number = ROOM_PAR_SECONDS): number {
  if (!r.done) return 0;
  let s = 1;
  if (r.time <= par) s++;
  if (r.caught === 0) s++;
  return s;
}
