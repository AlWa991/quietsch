import * as THREE from 'three';
import { createSpook, type SpookState } from '@/core/spook-fsm';
import type { RevealSystem, Revealable } from '@/render/reveal';

// Socken-Geist: a sheet ghost with a jagged hem and sock-cuff stripes. Shared geometry.
const profile = [
  new THREE.Vector2(0.0, 1.1),
  new THREE.Vector2(0.16, 1.07),
  new THREE.Vector2(0.27, 0.97),
  new THREE.Vector2(0.31, 0.8),
  new THREE.Vector2(0.31, 0.55),
  new THREE.Vector2(0.36, 0.3),
  new THREE.Vector2(0.46, 0.08),
];
const SEGMENTS = 12;
const bodyGeo = new THREE.LatheGeometry(profile, SEGMENTS);
{
  // Jagged, flared hem: displace the lowest ring of vertices.
  const pos = bodyGeo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0.1) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.12 * Math.cos(a * 6);
    pos.setXYZ(i, x * k, y - 0.07 * Math.max(0, Math.cos(a * 6)), z * k);
  }
  bodyGeo.computeVertexNormals();
}
const stripeGeo = new THREE.CylinderGeometry(0.318, 0.318, 0.06, SEGMENTS, 1, true);
const eyeGeo = new THREE.SphereGeometry(0.055, 6, 4);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true });

export interface Spook {
  readonly state: SpookState;
  readonly object: THREE.Group;
  readonly reveal: Revealable;
  /** Distance to the chicken last frame. */
  dist: number;
  update(dt: number, time: number, chickenX: number, chickenZ: number): void;
}

export function createSpookEntity(x: number, z: number, reveal: RevealSystem): Spook {
  const state = createSpook(x, z);
  const object = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe8eef8,
    emissive: 0xb8d4f0,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const stripeMat = new THREE.MeshBasicMaterial({
    color: 0xff4d6d,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const inner = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  const stripeA = new THREE.Mesh(stripeGeo, stripeMat);
  const stripeB = new THREE.Mesh(stripeGeo, stripeMat);
  stripeA.position.y = 0.66;
  stripeB.position.y = 0.56;
  stripeA.userData.noReveal = true;
  stripeB.userData.noReveal = true;
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.11, 0.78, 0.29);
  eyeR.position.set(0.11, 0.78, 0.29);
  eyeL.userData.noReveal = true;
  eyeR.userData.noReveal = true;
  inner.add(body, stripeA, stripeB, eyeL, eyeR);
  object.add(inner);
  object.position.set(x, 0, z);
  const rev = reveal.add(object, 'spook', 'socke');

  const self: Spook = {
    state,
    object,
    reveal: rev,
    dist: Infinity,
    update(_dt, time, cx, cz) {
      object.position.set(state.x, 0.12 + Math.sin(time * 2.3) * 0.07, state.z);
      object.rotation.y = state.heading;
      inner.rotation.z = Math.sin(time * 1.7) * 0.08;
      inner.rotation.x = state.mode === 'chase' ? 0.25 : 0;
      const pulse = 1 + Math.sin(time * 3.1) * 0.04;
      inner.scale.set(pulse, 2 - pulse, pulse);
      reveal.setBounds(rev, state.x, state.z, 0.35);

      self.dist = Math.hypot(cx - state.x, cz - state.z);
      // Visible only when revealed or inside the chicken's glow.
      const glow = Math.min(1, Math.max(0, (3 - self.dist) / 1.6));
      const v = Math.max(reveal.visibility(rev), glow);
      bodyMat.opacity = 0.7 * v;
      stripeMat.opacity = 0.75 * v;
      eyeMat.opacity = v;
      object.visible = v > 0.01;
    },
  };
  return self;
}
