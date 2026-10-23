// Pure spook state machines (no three). Positions are grid/world x,z in metres.
// The FSM mutates its state object in place so the game loop allocates nothing per frame.
// Kinds: 'socke' (wanders, hears, chases), 'rudi' (vacuum hunter, moves only while noise is
// recent), 'hand' (static sofa ambush). Peaceful spooks follow the chicken ('follow') and
// settle somewhere ('rest').

import type { SpookKind } from './types';

export type SpookMode = 'wander' | 'alert' | 'chase' | 'return' | 'dormant' | 'follow' | 'rest';

export interface SpookState {
  kind: SpookKind;
  mode: SpookMode;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  /** Mode-specific countdown in seconds. */
  timer: number;
  /** Facing angle (radians, atan2(dx, dz)). */
  heading: number;
  /** Seconds during which the spook cannot catch again. */
  cooldown: number;
  /** Rudi: seconds since the last noise it heard. */
  noiseAge: number;
  /** Hand: the current emerge is the scripted scare and cannot catch. */
  scare: boolean;
  /** Pacified by a scream in light; stays true through settle (finale, Korb). */
  peaceful: boolean;
}

export interface SpookInput {
  dt: number;
  chickenX: number;
  chickenZ: number;
  /** True if the chicken is moving (hop noise); heard only within `noticeRadius`. */
  chickenMoving: boolean;
  /** Returns true if a point is free for the spook (walls block). */
  canMove: (x: number, z: number) => boolean;
  /** Random in [0, 1). Injected for deterministic tests. */
  rand: () => number;
  /** Multiplier on hop hearing distance (Flinke Füße = 0.5). Default 1. */
  hopNoise?: number;
}

export const SPOOK = {
  wanderSpeed: 0.7,
  /** >= 1.1x the chicken's 3.2 m/s, so running away alone does not work. */
  chaseSpeed: 3.6,
  returnSpeed: 1.3,
  wanderRadius: 4,
  /** Pause (turning towards the sound) before chasing. */
  alertTime: 0.6,
  /** Give up a chase after this long. */
  chaseTimeout: 10,
  /** Linger at the heard position before returning. */
  lingerTime: 2.4,
  /** While chasing, a sock that is this close locks on to the chicken itself. */
  huntRadius: 3.5,
  catchRadius: 0.6,
  /** Passive hearing of hop noise. */
  noticeRadius: 2,
  catchCooldown: 2.5,
  arriveEps: 0.25,
  radius: 0.3,
} as const;

export const RUDI = {
  speed: 3.6,
  /** Hop hearing distance while dormant-awake / idle. */
  hearRadius: 5,
  /** Once alerted, Rudi hears every hop within this distance (the whole kitchen). */
  alertedHearRadius: 14,
  /** Rudi only drives while the last noise is younger than this. */
  noiseMemory: 1.1,
  /** Gives up and drives home after this much silence. */
  giveUp: 9,
  catchCooldown: 3,
} as const;

export const HAND = {
  /** Grabs when the chicken comes this close. */
  grabRadius: 1.5,
  /** Time to emerge before the grab lands. */
  emergeTime: 0.45,
  /** Arm stays out this long. */
  grabTime: 0.5,
  cooldown: 2.2,
} as const;

export const FOLLOW = {
  speed: 2.8,
  /** Peaceful spooks keep this distance behind the chicken. */
  distance: 1.3,
} as const;

export function createSpook(x: number, z: number, kind: SpookKind = 'socke'): SpookState {
  return {
    kind,
    mode: kind === 'rudi' ? 'dormant' : 'wander',
    x,
    z,
    homeX: x,
    homeZ: z,
    targetX: x,
    targetZ: z,
    timer: 0,
    heading: 0,
    cooldown: 0,
    noiseAge: Infinity,
    scare: false,
    peaceful: false,
  };
}

const isPeaceful = (s: SpookState): boolean => s.mode === 'follow' || s.mode === 'rest';

/** Sonar heard (ring passed the spook). Starts or redirects a chase towards the sound origin. */
export function hearSound(s: SpookState, originX: number, originZ: number): void {
  if (s.kind === 'hand' || isPeaceful(s) || s.mode === 'dormant') return;
  if (s.kind === 'rudi') {
    s.targetX = originX;
    s.targetZ = originZ;
    s.noiseAge = 0;
    if (s.mode !== 'chase') {
      s.mode = 'chase';
      s.timer = 0;
    }
    return;
  }
  s.targetX = originX;
  s.targetZ = originZ;
  s.heading = Math.atan2(originX - s.x, originZ - s.z);
  if (s.mode === 'chase') {
    s.timer = SPOOK.chaseTimeout;
    return;
  }
  s.mode = 'alert';
  s.timer = SPOOK.alertTime;
}

/** Move towards (tx, tz); slides along an axis when blocked. Returns remaining distance. */
function moveTowards(
  s: SpookState,
  tx: number,
  tz: number,
  speed: number,
  input: SpookInput,
): number {
  const dx = tx - s.x;
  const dz = tz - s.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-6) return 0;
  const step = Math.min(dist, speed * input.dt);
  const nx = s.x + (dx / dist) * step;
  const nz = s.z + (dz / dist) * step;
  s.heading = Math.atan2(dx, dz);
  if (input.canMove(nx, nz)) {
    s.x = nx;
    s.z = nz;
  } else if (input.canMove(nx, s.z)) {
    s.x = nx;
  } else if (input.canMove(s.x, nz)) {
    s.z = nz;
  }
  return Math.hypot(tx - s.x, tz - s.z);
}

function pickWanderTarget(s: SpookState, input: SpookInput): void {
  for (let i = 0; i < 6; i++) {
    const a = input.rand() * Math.PI * 2;
    const r = input.rand() * SPOOK.wanderRadius;
    const x = s.homeX + Math.cos(a) * r;
    const z = s.homeZ + Math.sin(a) * r;
    if (input.canMove(x, z)) {
      s.targetX = x;
      s.targetZ = z;
      break;
    }
  }
  s.timer = 2 + input.rand() * 3;
}

/** Rudi wakes up (power on). */
export function wakeRudi(s: SpookState): void {
  if (s.mode === 'dormant') s.mode = 'wander';
}

/** Scripted scare: the hand bursts out without being able to catch. */
export function popHand(s: SpookState): void {
  if (s.kind !== 'hand' || isPeaceful(s)) return;
  s.mode = 'alert';
  s.timer = 0.05;
  s.scare = true;
}

/** Spook becomes peaceful and follows the chicken. */
export function pacify(s: SpookState): void {
  s.mode = 'follow';
  s.scare = false;
  s.peaceful = true;
}

/** Peaceful spook settles at (x, z) and idles there. */
export function settle(s: SpookState, x: number, z: number): void {
  s.mode = 'rest';
  s.homeX = x;
  s.homeZ = z;
}

export type SpookEvent = 'caught' | null;

/** Advance one tick. Returns 'caught' on the tick the spook catches the chicken, else null. */
export function stepSpook(s: SpookState, input: SpookInput): SpookEvent {
  if (s.mode === 'follow' || s.mode === 'rest') return stepPeaceful(s, input);
  if (s.kind === 'rudi') return stepRudi(s, input);
  if (s.kind === 'hand') return stepHand(s, input);
  return stepSocke(s, input);
}

function stepPeaceful(s: SpookState, input: SpookInput): SpookEvent {
  if (s.mode === 'rest') {
    moveTowards(s, s.homeX, s.homeZ, SPOOK.returnSpeed, input);
    return null;
  }
  const dx = s.x - input.chickenX;
  const dz = s.z - input.chickenZ;
  const d = Math.hypot(dx, dz);
  if (d > FOLLOW.distance) {
    // Aim at the point FOLLOW.distance away from the chicken on our side.
    const k = FOLLOW.distance / d;
    moveTowards(s, input.chickenX + dx * k, input.chickenZ + dz * k, FOLLOW.speed, input);
  }
  return null;
}

function stepRudi(s: SpookState, input: SpookInput): SpookEvent {
  const { dt } = input;
  s.cooldown = Math.max(0, s.cooldown - dt);
  if (s.mode === 'dormant') return null;
  s.noiseAge += dt;
  const toChicken = Math.hypot(input.chickenX - s.x, input.chickenZ - s.z);
  if (s.cooldown === 0 && toChicken <= SPOOK.catchRadius) {
    s.mode = 'return';
    s.cooldown = RUDI.catchCooldown;
    s.noiseAge = Infinity;
    return 'caught';
  }
  const hear =
    (s.mode === 'chase' ? RUDI.alertedHearRadius : RUDI.hearRadius) * (input.hopNoise ?? 1);
  if (input.chickenMoving && toChicken <= hear && s.cooldown === 0) {
    hearSound(s, input.chickenX, input.chickenZ);
  }
  switch (s.mode) {
    case 'chase':
      // Relentless: always drives at the latest noise, but only while it is fresh.
      if (s.noiseAge < RUDI.noiseMemory) moveTowards(s, s.targetX, s.targetZ, RUDI.speed, input);
      if (s.noiseAge > RUDI.giveUp) s.mode = 'return';
      break;
    case 'return': {
      const left = moveTowards(s, s.homeX, s.homeZ, SPOOK.returnSpeed, input);
      if (left < SPOOK.arriveEps) s.mode = 'wander';
      break;
    }
    default:
      break; // 'wander' for Rudi = parked, engine idling
  }
  return null;
}

function stepHand(s: SpookState, input: SpookInput): SpookEvent {
  const { dt } = input;
  s.cooldown = Math.max(0, s.cooldown - dt);
  const toChicken = Math.hypot(input.chickenX - s.x, input.chickenZ - s.z);
  s.heading = Math.atan2(input.chickenX - s.x, input.chickenZ - s.z);
  switch (s.mode) {
    case 'wander':
      if (s.cooldown === 0 && toChicken <= HAND.grabRadius) {
        s.mode = 'alert';
        s.timer = HAND.emergeTime;
        s.scare = false;
      }
      break;
    case 'alert':
      s.timer -= dt;
      if (s.timer <= 0) {
        s.mode = 'chase';
        s.timer = HAND.grabTime;
        if (!s.scare && toChicken <= HAND.grabRadius) {
          s.cooldown = HAND.cooldown + HAND.grabTime;
          return 'caught';
        }
      }
      break;
    case 'chase':
      s.timer -= dt;
      if (s.timer <= 0) {
        s.mode = 'return';
        s.timer = HAND.cooldown;
        s.cooldown = Math.max(s.cooldown, HAND.cooldown);
      }
      break;
    default:
      s.timer -= dt;
      if (s.timer <= 0) {
        s.mode = 'wander';
        s.scare = false;
      }
      break;
  }
  return null;
}

function stepSocke(s: SpookState, input: SpookInput): SpookEvent {
  const { dt } = input;
  s.cooldown = Math.max(0, s.cooldown - dt);
  const toChicken = Math.hypot(input.chickenX - s.x, input.chickenZ - s.z);

  if (s.cooldown === 0 && toChicken <= SPOOK.catchRadius) {
    s.mode = 'return';
    s.cooldown = SPOOK.catchCooldown;
    return 'caught';
  }

  if (
    input.chickenMoving &&
    toChicken <= SPOOK.noticeRadius * (input.hopNoise ?? 1) &&
    (s.mode === 'wander' || s.mode === 'return')
  ) {
    hearSound(s, input.chickenX, input.chickenZ);
  }

  switch (s.mode) {
    case 'wander': {
      s.timer -= dt;
      const left = moveTowards(s, s.targetX, s.targetZ, SPOOK.wanderSpeed, input);
      if (left < SPOOK.arriveEps || s.timer <= 0) pickWanderTarget(s, input);
      break;
    }
    case 'alert':
      s.timer -= dt;
      if (s.timer <= 0) {
        s.mode = 'chase';
        s.timer = SPOOK.chaseTimeout;
      }
      break;
    case 'chase': {
      s.timer -= dt;
      if (toChicken <= SPOOK.huntRadius) {
        s.targetX = input.chickenX;
        s.targetZ = input.chickenZ;
      }
      const left = moveTowards(s, s.targetX, s.targetZ, SPOOK.chaseSpeed, input);
      if (left < SPOOK.arriveEps && s.timer > SPOOK.lingerTime) s.timer = SPOOK.lingerTime;
      if (s.timer <= 0) s.mode = 'return';
      break;
    }
    case 'return': {
      const left = moveTowards(s, s.homeX, s.homeZ, SPOOK.returnSpeed, input);
      if (left < SPOOK.arriveEps) {
        s.mode = 'wander';
        pickWanderTarget(s, input);
      }
      break;
    }
  }
  return null;
}
