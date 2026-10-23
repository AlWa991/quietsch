import * as THREE from 'three';
import { createSpook, type SpookState } from '@/core/spook-fsm';
import type { SpookKind } from '@/core/types';
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

export function createSpookEntity(
  x: number,
  z: number,
  reveal: RevealSystem,
  kind: SpookKind = 'socke',
): Spook {
  if (kind === 'rudi') return createRudi(x, z, reveal);
  if (kind === 'hand') return createHand(x, z, reveal);
  return createSocke(x, z, reveal);
}

/** Peaceful spooks glow warm and stay visible so the player sees the followers. */
const PEACE_TINT = new THREE.Color(0xffd9a0);
const SOCK_EMISSIVE = new THREE.Color(0xb8d4f0);

function createSocke(x: number, z: number, reveal: RevealSystem): Spook {
  const state = createSpook(x, z, 'socke');
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
      // Visible only when revealed or inside the chicken's glow; peaceful ones always faintly.
      const peaceful = state.mode === 'follow' || state.mode === 'rest';
      const glow = Math.min(1, Math.max(0, (3 - self.dist) / 1.6));
      const v = Math.max(reveal.visibility(rev), glow, peaceful ? 0.75 : 0);
      bodyMat.emissive.copy(peaceful ? PEACE_TINT : SOCK_EMISSIVE);
      bodyMat.opacity = 0.7 * v;
      stripeMat.opacity = 0.75 * v;
      eyeMat.opacity = v;
      object.visible = v > 0.01;
    },
  };
  return self;
}

// --- Rudi, the vacuum cleaner ------------------------------------------------------------
const rudiBodyGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.42, 10);
const rudiLidGeo = new THREE.SphereGeometry(0.34, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
const rudiHoseGeo = new THREE.TorusGeometry(0.28, 0.045, 5, 10, Math.PI * 1.1);
const rudiNozzleGeo = new THREE.BoxGeometry(0.42, 0.06, 0.16);
const rudiEyeGeo = new THREE.SphereGeometry(0.07, 8, 6);

function createRudi(x: number, z: number, reveal: RevealSystem): Spook {
  const state = createSpook(x, z, 'rudi');
  const object = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: 0x5a1e24,
    emissive: 0x2a0508,
    emissiveIntensity: 0.6,
    roughness: 0.5,
    flatShading: true,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.8,
    flatShading: true,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2030, toneMapped: false });
  const inner = new THREE.Group();
  const body = new THREE.Mesh(rudiBodyGeo, shell);
  body.position.y = 0.25;
  const lid = new THREE.Mesh(rudiLidGeo, dark);
  lid.position.y = 0.46;
  lid.scale.y = 0.5;
  const hose = new THREE.Mesh(rudiHoseGeo, dark);
  hose.position.set(0, 0.42, 0.22);
  hose.rotation.y = Math.PI / 2;
  const nozzle = new THREE.Mesh(rudiNozzleGeo, dark);
  nozzle.position.set(0, 0.04, 0.55);
  const eye = new THREE.Mesh(rudiEyeGeo, eyeMat);
  eye.position.set(0, 0.36, 0.33);
  eye.userData.noReveal = true;
  inner.add(body, lid, hose, nozzle, eye);
  object.add(inner);
  // Red eye light: the only thing you see of Rudi in the dark.
  const light = new THREE.PointLight(0xff2030, 0, 3.5, 1.6);
  light.position.set(0, 0.5, 0.5);
  object.add(light);
  object.position.set(x, 0, z);
  const rev = reveal.add(object, 'spook', 'rudi');

  const self: Spook = {
    state,
    object,
    reveal: rev,
    dist: Infinity,
    update(_dt, time, cx, cz) {
      const awake = state.mode !== 'dormant';
      const driving = state.mode === 'chase' && state.noiseAge < 1.1;
      object.position.set(state.x, driving ? Math.abs(Math.sin(time * 30)) * 0.02 : 0, state.z);
      object.rotation.y = state.heading;
      inner.rotation.z = driving ? Math.sin(time * 40) * 0.03 : 0;
      reveal.setBounds(rev, state.x, state.z, 0.4);
      self.dist = Math.hypot(cx - state.x, cz - state.z);
      eye.visible = awake;
      light.intensity = !awake ? 0 : state.mode === 'chase' ? 4 + Math.sin(time * 20) : 1.2;
      object.visible = true;
    },
  };
  return self;
}

// --- Hand from the sofa ------------------------------------------------------------------
const palmGeo = new THREE.BoxGeometry(0.26, 0.3, 0.08);
const fingerGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.2, 5);
const armGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.8, 6);

function createHand(x: number, z: number, reveal: RevealSystem): Spook {
  const state = createSpook(x, z, 'hand');
  const object = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: 0x9fb0a0,
    emissive: 0x506a58,
    emissiveIntensity: 0.7,
    roughness: 0.9,
    flatShading: true,
  });
  const arm = new THREE.Group();
  const forearm = new THREE.Mesh(armGeo, skin);
  forearm.position.y = 0.4;
  const palm = new THREE.Mesh(palmGeo, skin);
  palm.position.y = 0.95;
  arm.add(forearm, palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(fingerGeo, skin);
    f.position.set(-0.09 + i * 0.06, 1.18, 0);
    f.rotation.x = 0.35;
    arm.add(f);
  }
  const thumb = new THREE.Mesh(fingerGeo, skin);
  thumb.position.set(0.15, 0.98, 0.02);
  thumb.rotation.z = -0.9;
  arm.add(thumb);
  object.add(arm);
  object.position.set(x, 0, z);
  const rev = reveal.add(object, 'spook', 'hand');
  let rise = 0;

  const self: Spook = {
    state,
    object,
    reveal: rev,
    dist: Infinity,
    update(dt, time, cx, cz) {
      const m = state.mode;
      const want = m === 'alert' ? 0.75 : m === 'chase' ? 1 : 0;
      const speed = m === 'alert' || m === 'chase' ? 9 : 2.5;
      rise += (want - rise) * (1 - Math.exp(-speed * dt));
      const peaceful = m === 'follow' || m === 'rest';
      if (peaceful) rise = 0.8;
      object.position.set(state.x, -1.25 + rise * 1.25, state.z);
      object.rotation.y = state.heading;
      // Lunge towards the chicken while grabbing, tremble while emerging.
      arm.rotation.x = m === 'chase' ? 0.7 : m === 'alert' ? Math.sin(time * 40) * 0.08 : 0;
      reveal.setBounds(rev, state.x, state.z, 0.4);
      self.dist = Math.hypot(cx - state.x, cz - state.z);
      object.visible = rise > 0.05;
    },
  };
  return self;
}
