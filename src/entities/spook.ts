import * as THREE from 'three';
import { createSpook, type SpookState } from '@/core/spook-fsm';
import type { SpookKind } from '@/core/types';
import type { RevealSystem, Revealable } from '@/render/reveal';

// Socken-Geist: an upright floating sock (cuff, leg, heel, foot with red toe) with big eyes.
const SEG = 10;
const legGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.74, SEG, 1, true);
const cuffGeo = new THREE.TorusGeometry(0.225, 0.045, 5, SEG);
const heelGeo = new THREE.SphereGeometry(0.24, SEG, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const footGeo = new THREE.CapsuleGeometry(0.2, 0.36, 3, SEG);
const toeGeo = new THREE.SphereGeometry(0.205, SEG, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const stripeGeo = new THREE.CylinderGeometry(0.232, 0.234, 0.07, SEG, 1, true);
const eyeGeo = new THREE.SphereGeometry(0.075, 8, 6);
const pupilGeo = new THREE.SphereGeometry(0.04, 6, 4);
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
  // Per-sock so opacity fades independently.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true, opacity: 0 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const part = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    px: number,
    py: number,
    pz: number,
    reveal = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(px, py, pz);
    if (!reveal) mesh.userData.noReveal = true;
    inner.add(mesh);
    return mesh;
  };
  const inner = new THREE.Group();
  // Leg (open tube) from y 0.48 to 1.22, cuff ring on top, heel cap below.
  part(legGeo, bodyMat, 0, 0.85, 0);
  const cuff = part(cuffGeo, stripeMat, 0, 1.22, 0, false);
  cuff.rotation.x = Math.PI / 2;
  part(stripeGeo, stripeMat, 0, 1.08, 0, false);
  part(stripeGeo, stripeMat, 0, 0.96, 0, false);
  part(heelGeo, bodyMat, 0, 0.48, 0);
  // Foot points forward (+z, the heading) and droops slightly.
  const foot = part(footGeo, bodyMat, 0, 0.38, 0.22);
  foot.rotation.x = Math.PI / 2 + 0.12;
  const toe = part(toeGeo, stripeMat, 0, 0.33, 0.48, false);
  toe.rotation.x = Math.PI / 2 + 0.12;
  // Big hollow eyes on the shin. The sock is round, so the face turns towards the camera
  // (south) whatever the heading: the top-down view always sees the eyes.
  const face = new THREE.Group();
  face.position.y = 0.98;
  inner.add(face);
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx, 0, 0.2);
    eye.scale.set(1, 1.35, 0.6);
    const glint = new THREE.Mesh(pupilGeo, glintMat);
    glint.position.set(sx + 0.025, 0.04, 0.25);
    glint.scale.setScalar(0.45);
    eye.userData.noReveal = true;
    glint.userData.noReveal = true;
    face.add(eye, glint);
  }
  inner.scale.setScalar(1.2);
  object.add(inner);
  object.position.set(x, 0, z);
  const rev = reveal.add(object, 'spook', 'socke');

  const self: Spook = {
    state,
    object,
    reveal: rev,
    dist: Infinity,
    update(_dt, time, cx, cz) {
      object.position.set(state.x, 0.14 + Math.sin(time * 2.3) * 0.08, state.z);
      object.rotation.y = state.heading;
      face.rotation.y = -state.heading;
      inner.rotation.z = Math.sin(time * 1.7) * 0.08;
      inner.rotation.x = state.mode === 'chase' ? 0.3 : 0;
      foot.rotation.x = Math.PI / 2 + 0.12 + Math.sin(time * 3.4) * 0.1;
      toe.rotation.x = foot.rotation.x;
      const pulse = 1 + Math.sin(time * 3.1) * 0.04;
      inner.scale.set(1.2 * pulse, 1.2 * (2 - pulse), 1.2 * pulse);
      reveal.setBounds(rev, state.x, state.z, 0.35);

      self.dist = Math.hypot(cx - state.x, cz - state.z);
      // Visible only when revealed or inside the chicken's glow; peaceful ones always faintly.
      const peaceful = state.peaceful;
      const glow = Math.min(1, Math.max(0, (3 - self.dist) / 1.6));
      const v = Math.max(reveal.visibility(rev), glow, peaceful ? 0.75 : 0);
      bodyMat.emissive.copy(peaceful ? PEACE_TINT : SOCK_EMISSIVE);
      bodyMat.opacity = 0.78 * v;
      stripeMat.opacity = 0.85 * v;
      eyeMat.opacity = v;
      glintMat.opacity = v;
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
const rudiEyeGeo = new THREE.SphereGeometry(0.085, 8, 6);
const rudiGlowGeo = new THREE.RingGeometry(0.36, 0.62, 20);

function createRudi(x: number, z: number, reveal: RevealSystem): Spook {
  const state = createSpook(x, z, 'rudi');
  const object = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: 0x5a1e24,
    emissive: 0x5a0e16,
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
  // Motor glow on the floor around the base: the silhouette reads even in the dark.
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff3a20,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
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
  const eye = new THREE.Group();
  for (const ex of [-0.13, 0.13]) {
    const e = new THREE.Mesh(rudiEyeGeo, eyeMat);
    e.position.set(ex, 0.36, 0.34);
    e.scale.set(1.3, 0.8, 0.6);
    e.userData.noReveal = true;
    eye.add(e);
  }
  const glow = new THREE.Mesh(rudiGlowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  glow.userData.noReveal = true;
  inner.add(body, lid, hose, nozzle, eye, glow);
  object.add(inner);
  // Red eye light: the only thing you see of Rudi in the dark.
  const light = new THREE.PointLight(0xff2030, 0, 3.5, 1.6);
  light.position.set(0, 0.5, 0.5);
  object.add(light);
  object.position.set(x, 0, z);
  const rev = reveal.add(object, 'spook', 'rudi');
  let wasPeaceful = false;

  const self: Spook = {
    state,
    object,
    reveal: rev,
    dist: Infinity,
    update(_dt, time, cx, cz) {
      // Wake-up after power-on: the eye stutters on and off before Rudi starts hunting.
      const flick = state.wake > 0 && Math.sin(time * 38) < 0.1;
      const awake = state.mode !== 'dormant' && !flick;
      const driving = state.mode === 'chase' && state.noiseAge < 1.1;
      object.position.set(state.x, driving ? Math.abs(Math.sin(time * 30)) * 0.02 : 0, state.z);
      object.rotation.y = state.heading;
      inner.rotation.z = driving ? Math.sin(time * 40) * 0.03 : 0;
      reveal.setBounds(rev, state.x, state.z, 0.4);
      self.dist = Math.hypot(cx - state.x, cz - state.z);
      eye.visible = awake;
      glowMat.opacity = !awake
        ? 0
        : state.peaceful
          ? 0.35
          : driving
            ? 0.75 + Math.sin(time * 24) * 0.2
            : 0.3 + Math.sin(time * 3) * 0.08;
      if (state.peaceful !== wasPeaceful) {
        // Peaceful Rudi: warm lamp instead of the red eye, shell glows amber.
        wasPeaceful = state.peaceful;
        light.color.setHex(wasPeaceful ? 0xffb060 : 0xff2030);
        eyeMat.color.setHex(wasPeaceful ? 0xffd090 : 0xff2030);
        glowMat.color.setHex(wasPeaceful ? 0xffb060 : 0xff3a20);
        shell.emissive.setHex(wasPeaceful ? 0x8a4a10 : 0x5a0e16);
      }
      light.intensity = !awake
        ? 0
        : state.peaceful
          ? 2.2 + Math.sin(time * 2.5) * 0.4
          : state.mode === 'chase'
            ? 4 + Math.sin(time * 20)
            : 1.2;
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
  let size = 1;
  let wasPeaceful = false;
  let wasScare = false;

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
      const peaceful = state.peaceful;
      if (peaceful) rise = 1;
      // The scripted scare hand is huge and pale-bright; it shrinks back once it sinks.
      const scare = state.scare && !peaceful;
      size += ((scare ? 1.9 : 1) - size) * (1 - Math.exp(-(scare ? 14 : 3) * dt));
      object.scale.setScalar(size);
      if (peaceful !== wasPeaceful || scare !== wasScare) {
        // Peaceful hand: warm skin glow, fully out of the floor, waddling after the chicken.
        wasPeaceful = peaceful;
        wasScare = scare;
        skin.emissive.setHex(peaceful ? 0xc07a30 : scare ? 0x8fbf9c : 0x506a58);
        skin.emissiveIntensity = peaceful ? 0.9 : scare ? 0.8 : 0.7;
      }
      object.position.set(state.x, (-1.25 + rise * 1.25) * size, state.z);
      // Scare: the hand faces the camera (leaning away from it, perpendicular to the view) so
      // the whole palm and fingers fill the screen. Otherwise lunge towards the chicken while
      // grabbing and tremble while emerging.
      object.rotation.y = scare ? 0 : state.heading;
      arm.rotation.x = scare
        ? -0.8 + Math.sin(time * 30) * 0.05
        : m === 'chase'
          ? 0.7
          : m === 'alert'
            ? Math.sin(time * 40) * 0.08
            : 0;
      arm.rotation.z = peaceful && m === 'follow' ? Math.sin(time * 7) * 0.18 : 0;
      reveal.setBounds(rev, state.x, state.z, 0.4);
      self.dist = Math.hypot(cx - state.x, cz - state.z);
      object.visible = rise > 0.05;
    },
  };
  return self;
}
