// Pure Dachboden rules (no three): the 7-star ladder gate and Bellos Halsband.

import { roomStars, type RoomRecord } from './economy';
import { MISSION_IDS, MISSION_ROOM } from './missions';

/** Stars needed for the ladder (GDD: "7 Sterne öffnen den Dachboden"). */
export const ATTIC_STARS = 7;

export const ATTIC_FLAG = {
  collar: 'attic:collar',
  chest: 'attic:chest',
} as const;

/** Sum of room stars over the three mission rooms (max 9). */
export function totalStars(rooms: Record<string, RoomRecord>): number {
  let n = 0;
  for (const id of MISSION_IDS) {
    const r = rooms[MISSION_ROOM[id]];
    if (r) n += roomStars(r);
  }
  return n;
}

export function atticUnlocked(stars: number): boolean {
  return stars >= ATTIC_STARS;
}

export const COLLAR = {
  /** Seconds the spooks ignore the chicken. */
  active: 20,
  /** Seconds until it can be put on again after it came off. */
  recharge: 40,
} as const;

export interface CollarState {
  /** Remaining active seconds (0 = off). */
  active: number;
  /** Remaining recharge seconds (0 = ready). */
  cooldown: number;
}

export function createCollar(): CollarState {
  return { active: 0, cooldown: 0 };
}

/** Put the collar on. Only when owned, off and recharged. Mutates `s`. */
export function wearCollar(s: CollarState, owned: boolean): boolean {
  if (!owned || s.active > 0 || s.cooldown > 0) return false;
  s.active = COLLAR.active;
  return true;
}

/** Advance; returns true on the tick the collar comes off. */
export function stepCollar(s: CollarState, dt: number): boolean {
  if (s.active > 0) {
    s.active = Math.max(0, s.active - dt);
    if (s.active === 0) {
      s.cooldown = COLLAR.recharge;
      return true;
    }
    return false;
  }
  s.cooldown = Math.max(0, s.cooldown - dt);
  return false;
}
