// Pure sonar math (no three). Distances in metres (1 grid cell = 1 m), times in seconds.

export const SONAR = {
  /** Holds shorter than this count as a tap (squeak). */
  tapThreshold: 0.18,
  /** Hold time at which the scream reaches its maximum radius. */
  maxHold: 1.5,
  tapRadius: 4,
  maxRadius: 14,
  /** Ring front speed in m/s. */
  speed: 14,
  /** Seconds the ring lingers (fading) after reaching its max radius. */
  fadeOut: 0.45,
  /** Base feathers per first-time prop reveal. */
  featherBase: 2,
  /** Combo multiplier cap. */
  maxMultiplier: 5,
} as const;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Max ring radius for a given hold duration. Tap = small fixed ring, hold grows linearly. */
export function sonarRadius(holdSeconds: number): number {
  if (!(holdSeconds >= SONAR.tapThreshold)) return SONAR.tapRadius;
  const t = clamp((holdSeconds - SONAR.tapThreshold) / (SONAR.maxHold - SONAR.tapThreshold), 0, 1);
  return SONAR.tapRadius + (SONAR.maxRadius - SONAR.tapRadius) * t;
}

/** Charge in 0..1 while the key is held (for UI / squash). */
export function sonarCharge(holdSeconds: number): number {
  return clamp(holdSeconds / SONAR.maxHold, 0, 1);
}

/** Ring front radius after `elapsed` seconds, capped at `maxRadius`. */
export function ringFront(elapsed: number, maxRadius: number, speed: number = SONAR.speed): number {
  return Math.min(Math.max(0, elapsed) * speed, maxRadius);
}

/** Total lifetime of a ring (expansion + fade). */
export function ringLifetime(maxRadius: number, speed: number = SONAR.speed): number {
  return maxRadius / speed + SONAR.fadeOut;
}

/** Ring visual alpha: full while expanding, then fades out. */
export function ringAlpha(elapsed: number, maxRadius: number, speed: number = SONAR.speed): number {
  const expand = maxRadius / speed;
  if (elapsed <= expand) return 1;
  return clamp(1 - (elapsed - expand) / SONAR.fadeOut, 0, 1);
}

/** True when the ring front passed `dist` during this frame (prevFront, front]. */
export function crossed(dist: number, prevFront: number, front: number): boolean {
  return dist > prevFront && dist <= front;
}

/** Distance from point (px, pz) to an axis-aligned rect; 0 when inside. */
export function distToRect(
  px: number,
  pz: number,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): number {
  const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
  const dz = pz < minZ ? minZ - pz : pz > maxZ ? pz - maxZ : 0;
  return Math.hypot(dx, dz);
}

/** Combo multiplier for `count` first-time reveals within one scream. */
export function comboMultiplier(count: number): number {
  return count <= 1 ? 1 : Math.min(count, SONAR.maxMultiplier);
}

/** Extra feathers awarded at the end of a scream on top of the per-object base feathers. */
export function comboBonus(count: number, base: number = SONAR.featherBase): number {
  return base * count * (comboMultiplier(count) - 1);
}
