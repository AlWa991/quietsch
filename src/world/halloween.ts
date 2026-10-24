import type * as THREE from 'three';
import type { RevealSystem } from '@/render/reveal';

/** Wiring the lead provides; the Halloween layer owns everything else (P7 §7). */
export interface HalloweenHooks {
  scene: THREE.Scene;
  reveal: RevealSystem;
  /** #ui root, for the candy HUD counter. */
  root: HTMLElement;
  /** A candy was picked up at (x, z): the lead heals 1 heart. */
  onCandy(x: number, z: number): void;
}

export interface Halloween {
  /** Per frame; must not allocate. `dt` is 0 while paused. */
  update(dt: number, time: number, chickenX: number, chickenZ: number): void;
  /** Lightning flash (bats cross the windows). */
  onFlash(): void;
  /** Candies collected this run. */
  readonly candies: number;
}

/** Stub; replaced by the Halloween worker. */
export function installHalloween(hooks: HalloweenHooks): Halloween {
  void hooks;
  return { update: () => undefined, onFlash: () => undefined, candies: 0 };
}
