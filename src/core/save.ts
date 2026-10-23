// Versioned localStorage save. The serialiser is pure; storage is injected for tests.

import { ECHO_BOXES, type MissionsState } from './missions';
import type { GameState } from './types';
import type { RoomRecord } from './economy';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'quietsch.save';

/** The subset of the Web Storage API the save uses. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveFile {
  v: number;
  savedAt: string;
  state: GameState;
}

export function serialize(state: GameState, now: Date = new Date()): string {
  const file: SaveFile = { v: SAVE_VERSION, savedAt: now.toISOString(), state };
  return JSON.stringify(file);
}

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown): boolean => v === true;

function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v))
    if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  return out;
}

function boolRecord(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) if (typeof x === 'boolean') out[k] = x;
  return out;
}

function rooms(v: unknown): Record<string, RoomRecord> {
  const out: Record<string, RoomRecord> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    if (!isObj(x)) continue;
    out[k] = { time: num(x.time, 0), caught: num(x.caught, 0), done: bool(x.done) };
  }
  return out;
}

function missions(v: unknown, fallback: MissionsState): MissionsState {
  if (!isObj(v)) return fallback;
  const e = isObj(v.echo) ? v.echo : {};
  const j = isObj(v.jaeger) ? v.jaeger : {};
  const u = isObj(v.uhr) ? v.uhr : {};
  const answer = Math.floor(num(e.answer, fallback.echo.answer));
  const opened = Array.isArray(e.opened) ? e.opened : [];
  return {
    echo: {
      done: bool(e.done),
      answer: answer >= 0 && answer < ECHO_BOXES ? answer : fallback.echo.answer,
      opened: Array.from({ length: ECHO_BOXES }, (_, i) => opened[i] === true),
    },
    jaeger: { done: bool(j.done), power: bool(j.power), flashlight: bool(j.flashlight) },
    uhr: { done: bool(u.done), count: Math.max(0, Math.min(3, Math.floor(num(u.count, 0)))) },
  };
}

/**
 * Parse a save. Returns null for missing, corrupt or other-version data. Missing fields fall
 * back to `defaults`, so older saves of the same version never crash the game.
 */
export function deserialize(raw: string | null, defaults: GameState): GameState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed) || parsed.v !== SAVE_VERSION || !isObj(parsed.state)) return null;
  const s = parsed.state;
  const hats = Array.isArray(s.hats)
    ? s.hats.filter((h): h is string => typeof h === 'string')
    : [];
  const maxHearts = Math.max(1, Math.floor(num(s.maxHearts, defaults.maxHearts)));
  return {
    feathers: Math.max(0, num(s.feathers, defaults.feathers)),
    ghostlights: Math.max(0, num(s.ghostlights, defaults.ghostlights)),
    maxHearts,
    hearts: Math.min(maxHearts, Math.max(0, num(s.hearts, maxHearts))),
    xp: Math.max(0, num(s.xp, defaults.xp)),
    rank: Math.max(1, Math.floor(num(s.rank, defaults.rank))),
    stars: numRecord(s.stars),
    upgrades: numRecord(s.upgrades),
    hats,
    hat: typeof s.hat === 'string' && hats.includes(s.hat) ? s.hat : null,
    locksOpened: Math.max(0, Math.min(3, Math.floor(num(s.locksOpened, 0)))),
    flags: boolRecord(s.flags),
    feathersEarned: Math.max(0, num(s.feathersEarned, 0)),
    time: Math.max(0, num(s.time, 0)),
    rooms: rooms(s.rooms),
    missions: missions(s.missions, defaults.missions),
  };
}

export function saveGame(storage: SaveStorage, state: GameState): boolean {
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false; // quota / private mode: the game keeps running without saves
  }
}

export function loadGame(storage: SaveStorage, defaults: GameState): GameState | null {
  try {
    return deserialize(storage.getItem(SAVE_KEY), defaults);
  } catch {
    return null;
  }
}

export function clearSave(storage: SaveStorage): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // ignore: storage unavailable
  }
}
