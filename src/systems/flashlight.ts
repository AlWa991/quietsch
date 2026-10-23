import * as THREE from 'three';

/** Seconds of light from a full battery. */
const BATTERY_SECONDS = 25;
/** Seconds to fully recharge in the Korb. */
const RECHARGE_SECONDS = 4;
const RANGE = 7;
const HALF_ANGLE = 0.42;
const COS_HALF = Math.cos(HALF_ANGLE);

export interface Flashlight {
  readonly on: boolean;
  /** 0..1 */
  readonly battery: number;
  owned: boolean;
  /** Toggle; returns the new on-state (false when empty or not owned). */
  toggle(): boolean;
  /** Returns true on the frame the battery runs empty. */
  update(dt: number, atKorb: boolean, time: number): boolean;
  /** Is (x, z) inside the lit cone? */
  lights(x: number, z: number, cx: number, cz: number, facing: number): boolean;
}

/** SpotLight cone attached to the chicken. Light does not make noise: spooks ignore it. */
export function createFlashlight(parent: THREE.Object3D): Flashlight {
  const spot = new THREE.SpotLight(0xfff1c8, 0, RANGE + 2, HALF_ANGLE, 0.45, 1.2);
  spot.position.set(0, 0.55, 0.2);
  const target = new THREE.Object3D();
  target.position.set(0, 0, 4);
  parent.add(spot, target);
  spot.target = target;
  let on = false;
  let battery = 1;

  return {
    get on() {
      return on;
    },
    get battery() {
      return battery;
    },
    owned: false,
    toggle() {
      if (!this.owned) return false;
      on = !on && battery > 0.02;
      return on;
    },
    update(dt, atKorb, time) {
      let emptied = false;
      if (on) {
        battery = Math.max(0, battery - dt / BATTERY_SECONDS);
        if (battery === 0) {
          on = false;
          emptied = true;
        }
      }
      if (atKorb) battery = Math.min(1, battery + dt / RECHARGE_SECONDS);
      // Flicker when the battery is low.
      const flicker = battery < 0.2 ? 0.6 + 0.4 * Math.abs(Math.sin(time * 23)) : 1;
      spot.intensity = on ? 9 * flicker : 0;
      return emptied;
    },
    lights(x, z, cx, cz, facing) {
      if (!on) return false;
      const dx = x - cx;
      const dz = z - cz;
      const d = Math.hypot(dx, dz);
      if (d > RANGE || d < 1e-3) return d < 1e-3 && on;
      return (dx * Math.sin(facing) + dz * Math.cos(facing)) / d >= COS_HALF;
    },
  };
}
