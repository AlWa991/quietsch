// Shared types for all feature modules. Keep this file framework-free (no three import).

import type { RoomRecord } from './economy';
import type { MissionsState } from './missions';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One character per grid cell in the ASCII house map. */
export enum GridCell {
  Wall = '#',
  Floor = '.',
  Door = 'D',
  /** Korb / hub spawn: the chicken's home basket. */
  Korb = 'K',
  ChickenSpawn = 'C',
  SpookSpawn = 'S',
  LightSource = 'L',
  /** Interactable placeholder, replaced by real objects later. */
  Interactable = 'T',
  Void = ' ',
}

export interface RoomDef {
  id: string;
  name: string;
  /** Interior bounds in cell coordinates. */
  bounds: { x: number; y: number; w: number; h: number };
}

export interface HouseMap {
  width: number;
  height: number;
  /** Indexed as cells[y][x]. */
  cells: GridCell[][];
  rooms: RoomDef[];
}

export type SpookKind = 'socke' | 'hand' | 'rudi';

/** Events flowing through the UI store; systems emit, UI/audio listen. */
export type GameEvent =
  | { type: 'sonar'; origin: Vec2; strength: number }
  | { type: 'reveal'; objectId: string }
  | { type: 'feathers'; amount: number; at?: Vec2 }
  | { type: 'ghostlight'; amount: number }
  | { type: 'heart-lost'; by: SpookKind | 'unknown' }
  | { type: 'caught'; by: SpookKind }
  | { type: 'pickup'; itemId: string }
  | { type: 'mission-progress'; missionId: string; progress: number; goal: number }
  | { type: 'mission-complete'; missionId: string }
  | { type: 'story-card'; cardId: string }
  | { type: 'lock-opened'; lockId: string }
  | { type: 'rank-up'; rank: number }
  | { type: 'ending'; endingId: string };

export interface GameState {
  feathers: number;
  ghostlights: number;
  hearts: number;
  maxHearts: number;
  xp: number;
  rank: number;
  /** Stars earned per room id. */
  stars: Record<string, number>;
  /** Upgrade id -> level. */
  upgrades: Record<string, number>;
  hats: string[];
  /** Worn hat id or null. */
  hat: string | null;
  locksOpened: number;
  flags: Record<string, boolean>;
  /** Total feathers ever earned (results screen). */
  feathersEarned: number;
  /** Play time in seconds (title and modals excluded). */
  time: number;
  /** Per-room records for stars, keyed by room id. */
  rooms: Record<string, RoomRecord>;
  missions: MissionsState;
  /** Revealable ids that already paid their first-reveal feathers (survives reloads). */
  revealed: string[];
}
