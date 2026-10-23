// Pure Socken-Geist state machine (no three). Positions are grid/world x,z in metres.
// The FSM mutates its state object in place so the game loop allocates nothing per frame.

export type SpookMode = 'wander' | 'alert' | 'chase' | 'return';

export interface SpookState {
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
}

export const SPOOK = {
  wanderSpeed: 0.7,
  chaseSpeed: 2.4,
  returnSpeed: 1.3,
  wanderRadius: 4,
  /** Pause (turning towards the sound) before chasing. */
  alertTime: 0.6,
  /** Give up a chase after this long. */
  chaseTimeout: 7,
  /** Linger at the heard position before returning. */
  lingerTime: 1.4,
  catchRadius: 0.6,
  /** Passive hearing of hop noise. */
  noticeRadius: 2,
  catchCooldown: 2.5,
  arriveEps: 0.25,
  radius: 0.3,
} as const;

export function createSpook(x: number, z: number): SpookState {
  return {
    mode: 'wander',
    x,
    z,
    homeX: x,
    homeZ: z,
    targetX: x,
    targetZ: z,
    timer: 0,
    heading: 0,
    cooldown: 0,
  };
}

/** Sonar heard (ring passed the spook). Starts or redirects a chase towards the sound origin. */
export function hearSound(s: SpookState, originX: number, originZ: number): void {
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

/** Advance one tick. Returns 'caught' on the tick the spook catches the chicken, else null. */
export function stepSpook(s: SpookState, input: SpookInput): 'caught' | null {
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
    toChicken <= SPOOK.noticeRadius &&
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
