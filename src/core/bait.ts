// Pure Köder (squeaky ball) rules, no three. The ball flies in an arc, bounces once and then
// squeaks BAIT.squeaks times; every squeak is a noise source spooks hear like a scream origin.
// The state is mutated in place so the game loop allocates nothing per frame.

export const BAIT = {
  /** Seconds between two throws. */
  cooldown: 2,
  /** Max throw distance (m); shorter when a wall is in the way. */
  range: 5,
  flight: 0.55,
  arcHeight: 1.3,
  bounceTime: 0.3,
  bounceHeight: 0.28,
  /** Squeaks after landing, spread evenly over `duration` seconds. */
  squeaks: 3,
  duration: 4,
  /** Hearing radius of one squeak (m). */
  radius: 6,
  /** Ball radius (m), also the rest height. */
  ballRadius: 0.13,
  step: 0.25,
} as const;

export type BaitPhase = 'idle' | 'flying' | 'bouncing' | 'squeaking';

export interface BaitState {
  phase: BaitPhase;
  /** Seconds in the current phase. */
  t: number;
  fromX: number;
  fromZ: number;
  /** Landing point = squeak origin. */
  toX: number;
  toZ: number;
  x: number;
  y: number;
  z: number;
  squeaksDone: number;
  cooldown: number;
}

export function createBait(): BaitState {
  return {
    phase: 'idle',
    t: 0,
    fromX: 0,
    fromZ: 0,
    toX: 0,
    toZ: 0,
    x: 0,
    y: 0,
    z: 0,
    squeaksDone: 0,
    cooldown: 0,
  };
}

/** Cooldown progress 0..1 for the HUD (1 = ready). */
export function baitReady(s: BaitState): number {
  return 1 - Math.min(1, Math.max(0, s.cooldown / BAIT.cooldown));
}

/**
 * Throw from (x, z) along `facing` (radians, atan2(dx, dz)). The landing point is the last free
 * point before a wall, up to BAIT.range. Returns false while on cooldown. Replaces a ball that
 * is still squeaking.
 */
export function throwBait(
  s: BaitState,
  x: number,
  z: number,
  facing: number,
  canMove: (x: number, z: number) => boolean,
): boolean {
  if (s.cooldown > 0) return false;
  const dx = Math.sin(facing);
  const dz = Math.cos(facing);
  let land = 0;
  for (let d = BAIT.step; d <= BAIT.range + 1e-6; d += BAIT.step) {
    if (!canMove(x + dx * d, z + dz * d)) break;
    land = d;
  }
  s.phase = 'flying';
  s.t = 0;
  s.fromX = x;
  s.fromZ = z;
  s.toX = x + dx * land;
  s.toZ = z + dz * land;
  s.x = x;
  s.z = z;
  s.y = 0.6;
  s.squeaksDone = 0;
  s.cooldown = BAIT.cooldown;
  return true;
}

/** Second of the squeak with index i after landing. */
export function squeakTime(i: number): number {
  return (i * BAIT.duration) / BAIT.squeaks;
}

/** Advance one tick. Returns true on a tick where the ball squeaks (at most one per tick). */
export function stepBait(s: BaitState, dt: number): boolean {
  s.cooldown = Math.max(0, s.cooldown - dt);
  if (s.phase === 'idle') return false;
  s.t += dt;
  if (s.phase === 'flying') {
    const p = Math.min(1, s.t / BAIT.flight);
    s.x = s.fromX + (s.toX - s.fromX) * p;
    s.z = s.fromZ + (s.toZ - s.fromZ) * p;
    // Parabola from hand height (0.6) down to the floor, peaking at arcHeight.
    s.y = BAIT.ballRadius + (0.6 - BAIT.ballRadius) * (1 - p) + BAIT.arcHeight * 4 * p * (1 - p);
    if (p >= 1) {
      s.phase = 'bouncing';
      s.t = 0;
    }
    return false;
  }
  if (s.phase === 'bouncing') {
    const q = Math.min(1, s.t / BAIT.bounceTime);
    s.y = BAIT.ballRadius + BAIT.bounceHeight * 4 * q * (1 - q);
    if (q >= 1) {
      s.phase = 'squeaking';
      s.t = 0;
      s.y = BAIT.ballRadius;
    }
    return false;
  }
  // squeaking
  if (s.squeaksDone < BAIT.squeaks && s.t >= squeakTime(s.squeaksDone)) {
    s.squeaksDone++;
    return true;
  }
  if (s.t >= BAIT.duration) s.phase = 'idle';
  return false;
}
