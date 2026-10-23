import * as THREE from 'three';

/** Fixed 3/4 view offset from the look-at target (camera sits south and above). */
const OFFSET = new THREE.Vector3(0, 11.2, 7.4);
const FOLLOW = 5;
const LOOK_AHEAD = 0.45;
const BASE_FOV = 40;

export interface CameraRig {
  update(dt: number, tx: number, tz: number, vx: number, vz: number): void;
  snap(tx: number, tz: number): void;
  shake(amount: number, seconds: number): void;
  /** FOV punch (degrees, negative = zoom in), decays quickly. */
  punch(deg: number): void;
}

export function createCameraRig(camera: THREE.PerspectiveCamera): CameraRig {
  const target = new THREE.Vector3();
  let shakeAmt = 0;
  let shakeTime = 0;
  let shakeDur = 1;
  let fovKick = 0;

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
    update(dt, tx, tz, vx, vz) {
      const k = 1 - Math.exp(-FOLLOW * dt);
      target.x += (tx + vx * LOOK_AHEAD - target.x) * k;
      target.z += (tz + vz * LOOK_AHEAD - target.z) * k;
      target.y = 0;
      shakeTime = Math.max(0, shakeTime - dt);
      fovKick *= Math.exp(-dt * 7);
      const fov = BASE_FOV + fovKick;
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
  };
}
