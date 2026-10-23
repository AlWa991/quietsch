import * as THREE from 'three';
import { createChicken } from './chicken-model';
import { moveAndSlide, type CollisionGrid } from '@/systems/collision';

const SPEED = 3.2;
const ACCEL = 14;
const HOP_RATE = 3.4; // hops per second
const HOP_HEIGHT = 0.22;
const BODY_HALF = 0.28;
const TURN = 14;

export interface Chicken {
  readonly object: THREE.Group;
  readonly hatAnchor: THREE.Object3D;
  readonly pos: { x: number; z: number };
  readonly vel: { x: number; z: number };
  readonly moving: boolean;
  /** 0..1 scream charge, inflates the chicken while holding. */
  charge: number;
  /** Movement speed multiplier (Flinke Füße). */
  speedMul: number;
  /** Facing angle (radians, atan2(dx, dz)); the beak points along +z at 0. */
  readonly facing: number;
  update(dt: number, axis: { x: number; z: number }, grid: CollisionGrid, time: number): void;
  teleport(x: number, z: number): void;
  /** One-shot squash impulse (e.g. scream release). */
  kick(amount: number): void;
}

export function createChickenEntity(x: number, z: number): Chicken {
  const model = createChicken();
  const object = new THREE.Group();
  // Oversized toy scale (1.6x P1) so the silhouette reads from the 3/4 camera.
  model.group.scale.setScalar(2.08);
  object.add(model.group);

  // X-ray silhouette: drawn only where walls/furniture are in front of the chicken. It renders
  // after the house (renderOrder 5) but before the chicken itself (10), so the chicken never
  // shows its own hidden parts through itself.
  const xray = new THREE.MeshBasicMaterial({
    color: 0x9a7414,
    depthWrite: false,
    depthFunc: THREE.GreaterDepth,
    fog: false,
  });
  const parts: THREE.Mesh[] = [];
  model.group.traverse((o) => {
    if (o instanceof THREE.Mesh) parts.push(o);
  });
  for (const m of parts) {
    m.renderOrder = 10;
    const ghost = new THREE.Mesh(m.geometry, xray);
    ghost.renderOrder = 5;
    ghost.userData.noReveal = true;
    m.add(ghost);
  }

  // Small flickering glow so the chicken is never in total darkness (~2 tiles).
  // Sits well above the head so it lights the floor, not the chicken (no blown-out bloom).
  const glow = new THREE.PointLight(0xffd9a0, 9, 6, 1.4);
  glow.position.set(0, 3.2, 0.8);
  object.add(glow);

  const pos = { x, z };
  const vel = { x: 0, z: 0 };
  let facing = 0;
  let hop = 0;
  let impulse = 0;
  let moving = false;

  const self: Chicken = {
    object,
    hatAnchor: model.hatAnchor,
    pos,
    vel,
    charge: 0,
    speedMul: 1,
    get moving() {
      return moving;
    },
    get facing() {
      return facing;
    },
    update(dt, axis, grid, time) {
      const slow = (1 - self.charge * 0.6) * self.speedMul;
      const k = 1 - Math.exp(-ACCEL * dt);
      vel.x += (axis.x * SPEED * slow - vel.x) * k;
      vel.z += (axis.z * SPEED * slow - vel.z) * k;
      moveAndSlide(grid, pos, vel.x * dt, vel.z * dt, BODY_HALF);

      const speed = Math.hypot(vel.x, vel.z);
      moving = speed > 0.3;
      if (moving) {
        const want = Math.atan2(vel.x, vel.z);
        let d = want - facing;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        facing += d * (1 - Math.exp(-TURN * dt));
      }

      // Hop locomotion: keep hopping until the current hop lands.
      if (moving || hop % 1 > 0.02) hop += dt * HOP_RATE;
      if (!moving && hop % 1 > 0.98) hop = Math.ceil(hop);
      const ph = hop % 1;
      const lift = Math.sin(ph * Math.PI);
      const y = moving || ph > 0.02 ? lift * HOP_HEIGHT : 0;

      // Squash on landing, stretch in the air; inflate while charging the scream.
      let sq = 0;
      if (moving) sq = ph < 0.15 || ph > 0.9 ? 0.22 : -0.14 * lift;
      sq -= self.charge * 0.25;
      impulse *= Math.exp(-dt * 9);
      sq += impulse * Math.sin(time * 40);
      model.squash(sq);
      // Legs dangle and swing while airborne; beak opens with the scream charge.
      model.pose(self.charge, moving ? Math.sin(ph * Math.PI * 2) : 0);

      object.position.set(pos.x, y, pos.z);
      object.rotation.y = facing;
      // Shiver while charging.
      model.group.rotation.z = self.charge > 0 ? Math.sin(time * 55) * 0.06 * self.charge : 0;

      glow.intensity = 9 + Math.sin(time * 13) * 0.35 + Math.sin(time * 31.7) * 0.25;
    },
    teleport(nx, nz) {
      pos.x = nx;
      pos.z = nz;
      vel.x = 0;
      vel.z = 0;
      object.position.set(nx, 0, nz);
    },
    kick(amount) {
      impulse = Math.max(impulse, amount);
    },
  };
  object.position.set(x, 0, z);
  return self;
}
