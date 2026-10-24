// Pure combat rules (no three, no DOM): peck combo, damage, knockback, kill streaks, feather drops.
// Every function mutates small state objects in place so the game loop allocates nothing.

import type { SpookKind } from './types';

export const PECK = {
  /** Duration of one beak swing (s). */
  swing: 0.25,
  /** The hit lands this far into the swing (s). */
  impact: 0.08,
  /** After a swing, a new press within this window continues the combo (s). */
  comboWindow: 0.4,
  /** Pause after the third hit before a new combo can start (s). */
  recover: 0.22,
  /** Reach from the chicken centre (m). */
  range: 1.2,
  /** Half-angle of the hit cone (cos). 0.35 ~ 70 degrees to each side. */
  coneCos: 0.35,
  /**
   * Knockback on enemies (m). Hits 1-2 nudge so the combo stays in reach; the finisher throws
   * the full 1.5 m of the spec.
   */
  knockback: 0.4,
  finisherKnock: 1.5,
  /** The chicken steps into each peck (m). */
  lunge: 0.3,
  damage: 1,
  /** Hitstop on impact (s); the finisher holds a little longer. */
  hitstop: 0.06,
  finisherHitstop: 0.1,
} as const;

export const PLAYER_HIT = {
  /** Invulnerability after being hit (s, simulation time). */
  grace: 1,
  /** Knockback on the chicken (m). */
  knockback: 1.4,
  hitstop: 0.12,
} as const;

/** Hit points per enemy kind (P7 table). */
export const ENEMY_HP: Record<SpookKind, number> = {
  socke: 3,
  hand: 2,
  rudi: 8,
  teddy: 5,
  kuerbis: 2,
  spinne: 2,
};

/** Feathers dropped on defeat (physical pickups). Balanced for ~700 per run (P7 §5). */
export const ENEMY_FEATHERS: Record<SpookKind, number> = {
  socke: 8,
  hand: 10,
  rudi: 80,
  teddy: 15,
  kuerbis: 6,
  spinne: 8,
};

/** XP on defeat. */
export const ENEMY_XP: Record<SpookKind, number> = {
  socke: 10,
  hand: 12,
  rudi: 60,
  teddy: 20,
  kuerbis: 8,
  spinne: 10,
};

/** Hand: retreats into its sofa for this long after being beaten (s). */
export const HAND_RETREAT = 10;

export const STREAK = {
  /** Kills within this window chain into a streak (s). */
  window: 3,
  double: 20,
  triple: 50,
} as const;

export const DROP = {
  /** Feathers fly towards the chicken from this distance (m). */
  magnet: 1.5,
  pickup: 0.45,
  gravity: 14,
  bounce: 0.35,
  friction: 3.2,
  magnetAccel: 28,
  /** Uncollected feathers fade out after this long (s). */
  life: 25,
} as const;

// --- Peck combo ------------------------------------------------------------------------

export interface ComboState {
  /** 0 = idle, 1..3 = current swing in the combo. */
  step: number;
  /** Time into the current swing (s); -1 when no swing is running. */
  t: number;
  /** Time left to chain the next swing after the current one ended. */
  window: number;
  /** Recovery after the finisher. */
  recover: number;
  /** A press during a swing is buffered and starts the next swing when this one ends. */
  queued: boolean;
  /** The current swing already resolved its impact. */
  landed: boolean;
  /** Swings started so far (the view animates each new one once). */
  starts: number;
}

export function createCombo(): ComboState {
  return { step: 0, t: -1, window: 0, recover: 0, queued: false, landed: false, starts: 0 };
}

/** Peck button pressed. Returns the swing number started (1..3), or 0 if buffered/blocked. */
export function pressPeck(c: ComboState): number {
  if (c.recover > 0) return 0;
  if (c.t >= 0) {
    if (c.step < 3) c.queued = true;
    return 0;
  }
  c.step = c.window > 0 && c.step < 3 ? c.step + 1 : 1;
  c.t = 0;
  c.window = 0;
  c.landed = false;
  c.starts++;
  return c.step;
}

/**
 * Advance the combo. Returns the swing number whose impact frame is reached this tick (1..3),
 * otherwise 0. A buffered press starts the next swing as soon as the current one ends.
 */
export function stepCombo(c: ComboState, dt: number): number {
  if (c.recover > 0) c.recover = Math.max(0, c.recover - dt);
  if (c.t < 0) {
    if (c.window > 0) {
      c.window = Math.max(0, c.window - dt);
      if (c.window === 0) c.step = 0;
    }
    return 0;
  }
  c.t += dt;
  let impact = 0;
  if (!c.landed && c.t >= PECK.impact) {
    c.landed = true;
    impact = c.step;
  }
  if (c.t >= PECK.swing) {
    c.t = -1;
    if (c.step >= 3) {
      c.step = 0;
      c.recover = PECK.recover;
      c.queued = false;
    } else if (c.queued) {
      c.queued = false;
      c.window = 1;
      pressPeck(c);
    } else {
      c.window = PECK.comboWindow;
    }
  }
  return impact;
}

// --- Hits ------------------------------------------------------------------------------

/** True if (tx, tz) is inside the peck cone of a chicken at (x, z) facing `facing`. */
export function inPeckCone(
  x: number,
  z: number,
  facing: number,
  tx: number,
  tz: number,
  range: number = PECK.range,
  coneCos: number = PECK.coneCos,
): boolean {
  const dx = tx - x;
  const dz = tz - z;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 0.35) return true; // overlapping: always hit
  return (dx * Math.sin(facing) + dz * Math.cos(facing)) / d >= coneCos;
}

export interface HitContext {
  /** Base damage per peck (Scharfer Schnabel = 2). */
  base: number;
  /** Target is stunned (Schallwelle): double damage. */
  stunned: boolean;
  /** Attack comes from behind the target (dot of its heading and the hit direction > 0.3). */
  behind: boolean;
  /** Rudi stands in the fridge light (vulnerable). */
  inFridgeLight: boolean;
}

/** Damage a peck deals to an enemy; 0 = immune ("klonk"). */
export function peckDamage(kind: SpookKind, h: HitContext): number {
  if (kind === 'rudi' && !h.stunned && !h.inFridgeLight) return 0;
  let dmg = h.base;
  if (h.stunned) dmg *= 2;
  if (kind === 'teddy' && h.behind) dmg *= 2;
  return dmg;
}

/** True if a hit from direction (dirX, dirZ) (attacker -> target) lands in the target's back. */
export function hitsBack(heading: number, dirX: number, dirZ: number): boolean {
  const len = Math.hypot(dirX, dirZ) || 1;
  return (Math.sin(heading) * dirX + Math.cos(heading) * dirZ) / len > 0.3;
}

export interface Health {
  hp: number;
  maxHp: number;
  /** Hit flash envelope (s). */
  flash: number;
  /** HP bar visibility (s). */
  bar: number;
  /** Knockback velocity (m/s). */
  kbx: number;
  kbz: number;
}

export type HitResult = 'immune' | 'hurt' | 'defeated';

/** Knockback velocity for a slide of `dist` metres under exponential decay `KNOCK_DECAY`. */
export const KNOCK_DECAY = 10;

/** Apply damage and knockback. (dirX, dirZ) = attacker -> target. */
export function applyHit(
  h: Health,
  dmg: number,
  dirX: number,
  dirZ: number,
  knock: number,
): HitResult {
  h.bar = 3;
  if (dmg <= 0) {
    h.flash = 0.06;
    return 'immune';
  }
  h.hp = Math.max(0, h.hp - dmg);
  h.flash = 0.14;
  const len = Math.hypot(dirX, dirZ) || 1;
  // Exponential decay v(t) = v0 e^(-k t) travels v0 / k in total.
  h.kbx = (dirX / len) * knock * KNOCK_DECAY;
  h.kbz = (dirZ / len) * knock * KNOCK_DECAY;
  return h.hp === 0 ? 'defeated' : 'hurt';
}

/** Damage stage 0 (fresh) .. 2 (almost gone) for wobble and cracks. */
export function damageStage(h: Health): number {
  if (h.hp >= h.maxHp) return 0;
  return h.hp / h.maxHp > 0.5 ? 1 : 2;
}

/**
 * Advance knockback and the flash/bar timers. `move` tries a displacement and returns
 * whether it was applied (walls stop the slide).
 */
export function stepHealth(
  h: Health,
  dt: number,
  pos: { x: number; z: number },
  canMove: (x: number, z: number) => boolean,
): void {
  h.flash = Math.max(0, h.flash - dt);
  h.bar = Math.max(0, h.bar - dt);
  if (h.kbx === 0 && h.kbz === 0) return;
  const nx = pos.x + h.kbx * dt;
  const nz = pos.z + h.kbz * dt;
  if (canMove(nx, nz)) {
    pos.x = nx;
    pos.z = nz;
  } else if (canMove(nx, pos.z)) {
    pos.x = nx;
    h.kbz = 0;
  } else if (canMove(pos.x, nz)) {
    pos.z = nz;
    h.kbx = 0;
  } else {
    h.kbx = 0;
    h.kbz = 0;
  }
  const k = Math.exp(-KNOCK_DECAY * dt);
  h.kbx *= k;
  h.kbz *= k;
  if (Math.abs(h.kbx) + Math.abs(h.kbz) < 0.05) {
    h.kbx = 0;
    h.kbz = 0;
  }
}

// --- Kill streaks ----------------------------------------------------------------------

export interface StreakState {
  count: number;
  /** Time of the last kill. */
  last: number;
}

export function createStreak(): StreakState {
  return { count: 0, last: -Infinity };
}

/** Register a kill at `time`. Returns the streak bonus in feathers (0, 20 Doppel, 50 Dreifach). */
export function registerKill(s: StreakState, time: number): number {
  s.count = time - s.last <= STREAK.window ? s.count + 1 : 1;
  s.last = time;
  if (s.count === 2) return STREAK.double;
  if (s.count >= 3) return STREAK.triple;
  return 0;
}

// --- Feather drops ---------------------------------------------------------------------

export interface Drop {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  /** Feathers this pickup is worth. */
  value: number;
}

export function createDrop(): Drop {
  return { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, value: 0 };
}

/** Launch a drop from (x, z) with a random burst direction. `rand` in [0, 1). */
export function launchDrop(d: Drop, x: number, z: number, value: number, rand: () => number): void {
  const a = rand() * Math.PI * 2;
  const s = 1.2 + rand() * 2.2;
  d.active = true;
  d.x = x;
  d.y = 0.6;
  d.z = z;
  d.vx = Math.cos(a) * s;
  d.vz = Math.sin(a) * s;
  d.vy = 3 + rand() * 2.5;
  d.age = 0;
  d.value = value;
}

/**
 * Physics + magnet for one drop. Returns true on the tick it is collected by the chicken at
 * (cx, cz). Expired drops deactivate silently.
 */
export function stepDrop(
  d: Drop,
  dt: number,
  cx: number,
  cz: number,
  canMove: (x: number, z: number) => boolean,
): boolean {
  if (!d.active) return false;
  d.age += dt;
  if (d.age > DROP.life) {
    d.active = false;
    return false;
  }
  const dx = cx - d.x;
  const dz = cz - d.z;
  const dist = Math.hypot(dx, dz);
  // Settled for a moment: the magnet pulls it in, ignoring walls (it flies over furniture).
  if (d.age > 0.35 && dist < DROP.magnet) {
    const pull = DROP.magnetAccel * dt * (1.2 - dist / DROP.magnet);
    d.vx += (dx / (dist || 1)) * pull;
    d.vz += (dz / (dist || 1)) * pull;
    d.vy = Math.max(d.vy, 1.2);
    d.x += d.vx * dt;
    d.z += d.vz * dt;
    d.y = Math.min(0.9, d.y + dt * 2);
    if (Math.hypot(cx - d.x, cz - d.z) < DROP.pickup) {
      d.active = false;
      return true;
    }
    return false;
  }
  d.vy -= DROP.gravity * dt;
  d.y += d.vy * dt;
  const nx = d.x + d.vx * dt;
  const nz = d.z + d.vz * dt;
  if (canMove(nx, d.z)) d.x = nx;
  else d.vx = -d.vx * 0.4;
  if (canMove(d.x, nz)) d.z = nz;
  else d.vz = -d.vz * 0.4;
  if (d.y <= 0.05) {
    d.y = 0.05;
    d.vy = Math.abs(d.vy) > 1 ? -d.vy * DROP.bounce : 0;
    const k = Math.exp(-DROP.friction * dt);
    d.vx *= k;
    d.vz *= k;
  }
  return false;
}

/** Split a feather reward into physical pickups (max `maxPieces`, each worth >= 1). */
export function splitDrop(total: number, maxPieces: number): number[] {
  const pieces = Math.max(1, Math.min(maxPieces, total));
  const out: number[] = [];
  const base = Math.floor(total / pieces);
  let rest = total - base * pieces;
  for (let i = 0; i < pieces; i++) {
    out.push(base + (rest > 0 ? 1 : 0));
    if (rest > 0) rest--;
  }
  return out;
}
