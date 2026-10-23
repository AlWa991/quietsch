import * as THREE from 'three';
import { isBlocked, type CollisionGrid } from './collision';

/** Fixed 3/4 view offset from the look-at target (camera sits south and above), 15 % closer than P1. */
const OFFSET = new THREE.Vector3(0, 9.5, 6.3);
const FOLLOW = 5;
const LOOK_AHEAD = 0.45;
const BASE_FOV = 40;

export interface CameraRig {
  /** `grid` limits the look-ahead so it never runs past a wall. */
  update(dt: number, tx: number, tz: number, vx: number, vz: number, grid?: CollisionGrid): void;
  snap(tx: number, tz: number): void;
  shake(amount: number, seconds: number): void;
  /** FOV punch (degrees, negative = zoom in), decays quickly. */
  punch(deg: number): void;
  /** Freeze-frame close-up on (x, z) for `seconds` (zoomed in), then glide back. */
  closeUp(x: number, z: number, seconds: number): void;
}

export function createCameraRig(camera: THREE.PerspectiveCamera): CameraRig {
  const target = new THREE.Vector3();
  let shakeAmt = 0;
  let shakeTime = 0;
  let shakeDur = 1;
  let fovKick = 0;
  let closeT = 0;
  let close = 0;
  const closeAt = new THREE.Vector2();

  const apply = (): void => {
    camera.position.copy(target).add(OFFSET);
    if (shakeTime > 0) {
      const k = (shakeTime / shakeDur) * shakeAmt;
      camera.position.x += (Math.random() * 2 - 1) * k;
      camera.position.y += (Math.random() * 2 - 1) * k * 0.5;
      camera.position.z += (Math.random() * 2 - 1) * k;
    }
    camera.lookAt(target);
  };

  return {
    update(dt, tx, tz, vx, vz, grid) {
      const k = 1 - Math.exp(-FOLLOW * dt);
      // Walk the look-ahead out in small steps and stop at the first blocked cell.
      let ahead = LOOK_AHEAD;
      if (grid) {
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const f = (LOOK_AHEAD * i) / steps;
          if (isBlocked(grid, tx + vx * f, tz + vz * f)) {
            ahead = (LOOK_AHEAD * (i - 1)) / steps;
            break;
          }
        }
      }
      closeT = Math.max(0, closeT - dt);
      close += ((closeT > 0 ? 1 : 0) - close) * (1 - Math.exp(-14 * dt));
      const gx = tx + vx * ahead + (closeAt.x - tx) * close;
      const gz = tz + vz * ahead + (closeAt.y - tz) * close;
      const kk = closeT > 0 ? 1 - Math.exp(-14 * dt) : k;
      target.x += (gx - target.x) * kk;
      target.z += (gz - target.z) * kk;
      target.y = 0;
      shakeTime = Math.max(0, shakeTime - dt);
      fovKick *= Math.exp(-dt * 7);
      const fov = BASE_FOV + fovKick - 16 * close;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      apply();
    },
    snap(tx, tz) {
      target.set(tx, 0, tz);
      apply();
    },
    shake(amount, seconds) {
      shakeAmt = Math.max(amount, shakeTime > 0 ? shakeAmt : 0);
      shakeTime = seconds;
      shakeDur = seconds;
    },
    punch(deg) {
      fovKick += deg;
    },
    closeUp(x, z, seconds) {
      closeAt.set(x, z);
      closeT = seconds;
    },
  };
}
