import * as THREE from 'three';
import { BAIT, baitReady, createBait, stepBait, throwBait, type BaitState } from '@/core/bait';

export interface BaitSystem {
  readonly state: BaitState;
  /** Cooldown progress 0..1 (1 = ready). */
  readonly ready: number;
  /** Throw from (x, z) along `facing`; false while on cooldown. */
  throw(x: number, z: number, facing: number): boolean;
  /** Advance; returns true on a squeak tick (caller fires the noise at state.toX/toZ). */
  update(dt: number, time: number): boolean;
}

/** The Köder: a small yellow squeaky ball. One ball at a time, mesh reused. */
export function createBaitSystem(
  scene: THREE.Scene,
  canMove: (x: number, z: number) => boolean,
): BaitSystem {
  const state = createBait();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BAIT.ballRadius, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffd23a,
      emissive: 0xffb000,
      emissiveIntensity: 0.7,
      roughness: 0.4,
      flatShading: true,
    }),
  );
  ball.visible = false;
  scene.add(ball);
  let squash = 0;

  return {
    state,
    get ready() {
      return baitReady(state);
    },
    throw(x, z, facing) {
      return throwBait(state, x, z, facing, canMove);
    },
    update(dt, time) {
      const squeak = stepBait(state, dt);
      if (squeak) squash = 1;
      squash = Math.max(0, squash - dt * 4);
      ball.visible = state.phase !== 'idle';
      if (ball.visible) {
        ball.position.set(state.x, state.y, state.z);
        // Squashes on every squeak, spins while flying.
        const k = 1 - 0.35 * Math.sin(squash * Math.PI);
        ball.scale.set(2 - k, k, 2 - k);
        if (state.phase === 'flying') ball.rotation.x = time * 14;
      }
      return squeak;
    },
  };
}
