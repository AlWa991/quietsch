import * as THREE from 'three';

export interface ChickenModel {
  group: THREE.Group;
  hatAnchor: THREE.Object3D;
  /** > 0 squash (wider/flatter, max ~0.35), < 0 stretch (taller/thinner), 0 neutral. */
  squash(amount: number): void;
  /** Beak opening 0..1 (scream charge) and dangling-leg swing (-1..1). */
  pose(beakOpen: number, legSwing: number): void;
}

const MAX_SQUASH = 0.35;

function mat(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    flatShading: true,
    roughness: 0.7,
  });
}

// Emissive halved vs. P1 so bloom no longer eats the silhouette.
const yellow = mat(0xffd23f, 0xffb800, 0.14);
const orange = mat(0xff7a12, 0xff5a00, 0.08);
const red = mat(0xe8202a, 0x801010, 0.12);
const black = mat(0x0a0a0a, 0x000000, 0);
const white = mat(0xffffff, 0x000000, 0);

// Rubber chicken: plump teardrop body, long neck, big comb, open beak, long dangling legs.
const bodyGeo = new THREE.SphereGeometry(0.16, 10, 8);
const tailGeo = new THREE.ConeGeometry(0.08, 0.16, 6);
const neckGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.2, 7);
const headGeo = new THREE.SphereGeometry(0.105, 9, 7);
const beakGeo = new THREE.ConeGeometry(0.05, 0.15, 5);
const combGeo = new THREE.SphereGeometry(0.042, 6, 5);
const wattleGeo = new THREE.SphereGeometry(0.03, 5, 4);
const wingGeo = new THREE.SphereGeometry(0.08, 6, 5);
const LEG = 0.3;
const legGeo = new THREE.CylinderGeometry(0.02, 0.02, LEG, 5);
const toeGeo = new THREE.BoxGeometry(0.025, 0.02, 0.09);
const eyeGeo = new THREE.SphereGeometry(0.026, 6, 5);
const pupilGeo = new THREE.SphereGeometry(0.016, 5, 4);

function mesh(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

/** Leg hanging from the hip: shin + three splayed toes, pivots at the hip. */
function leg(side: number): THREE.Group {
  const hip = new THREE.Group();
  hip.position.set(side * 0.065, LEG, 0.0);
  const shin = mesh(legGeo, orange, 0, -LEG / 2, 0);
  hip.add(shin);
  for (const a of [-0.45, 0, 0.45]) {
    const toe = mesh(toeGeo, orange, Math.sin(a) * 0.04, -LEG + 0.01, 0.035 + Math.cos(a) * 0.01);
    toe.rotation.y = a;
    hip.add(toe);
  }
  return hip;
}

export function createChicken(): ChickenModel {
  const group = new THREE.Group();
  // Pivot sits at the feet (y=0); scaling it keeps feet on the ground.
  const pivot = new THREE.Group();
  group.add(pivot);
  // Everything above the legs; lifted so the long legs dangle below the body.
  const upper = new THREE.Group();
  upper.position.y = LEG - 0.2;
  pivot.add(upper);

  const body = mesh(bodyGeo, yellow, 0, 0.3, -0.02);
  body.scale.set(0.95, 0.85, 1.35);
  body.rotation.x = 0.25;
  upper.add(body);
  const tail = mesh(tailGeo, yellow, 0, 0.4, -0.22);
  tail.rotation.x = -2.2;
  upper.add(tail);

  const neck = mesh(neckGeo, yellow, 0, 0.46, 0.12);
  neck.rotation.x = 0.35;
  upper.add(neck);

  // Head centre y=0.6 -> top ~0.7.
  upper.add(mesh(headGeo, yellow, 0, 0.6, 0.17));

  // Beak: upper and lower half, opens with the scream.
  const beakUpper = mesh(beakGeo, orange, 0, 0.6, 0.29);
  beakUpper.rotation.x = Math.PI / 2;
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.585, 0.24);
  const beakLower = mesh(beakGeo, orange, 0, -0.005, 0.04);
  beakLower.rotation.x = Math.PI / 2;
  beakLower.scale.set(0.8, 0.8, 0.6);
  jaw.add(beakLower);
  upper.add(beakUpper, jaw);

  // Big comb: four red bumps along the crown, plus a wattle under the beak.
  upper.add(mesh(combGeo, red, 0, 0.7, 0.22));
  upper.add(mesh(combGeo, red, 0, 0.72, 0.16));
  upper.add(mesh(combGeo, red, 0, 0.7, 0.1));
  upper.add(mesh(combGeo, red, 0, 0.66, 0.05));
  upper.add(mesh(wattleGeo, red, 0, 0.53, 0.25));

  const wingL = mesh(wingGeo, yellow, 0.15, 0.32, -0.02);
  wingL.scale.set(0.35, 0.8, 1.4);
  wingL.rotation.z = -0.25;
  const wingR = mesh(wingGeo, yellow, -0.15, 0.32, -0.02);
  wingR.scale.set(0.35, 0.8, 1.4);
  wingR.rotation.z = 0.25;
  upper.add(wingL, wingR);

  const legL = leg(1);
  const legR = leg(-1);
  pivot.add(legL, legR);

  for (const s of [1, -1]) {
    const eye = mesh(eyeGeo, white, s * 0.065, 0.63, 0.22);
    const pupil = mesh(pupilGeo, black, s * 0.075, 0.635, 0.235);
    upper.add(eye, pupil);
  }

  const hatAnchor = new THREE.Object3D();
  hatAnchor.position.set(0, 0.69, 0.15);
  upper.add(hatAnchor);

  return {
    group,
    hatAnchor,
    squash(amount: number): void {
      const a = Math.max(-MAX_SQUASH, Math.min(MAX_SQUASH, amount));
      // Volume-preserving: y shrinks by a, x/z grow by a/2.
      pivot.scale.set(1 + a * 0.5, 1 - a, 1 + a * 0.5);
    },
    pose(beakOpen: number, legSwing: number): void {
      jaw.rotation.x = Math.max(0, Math.min(1, beakOpen)) * 0.7;
      legL.rotation.x = legSwing * 0.6;
      legR.rotation.x = -legSwing * 0.6;
    },
  };
}
