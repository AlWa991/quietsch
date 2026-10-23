import * as THREE from 'three';

export interface ChickenModel {
  group: THREE.Group;
  hatAnchor: THREE.Object3D;
  /** > 0 squash (wider/flatter, max ~0.35), < 0 stretch (taller/thinner), 0 neutral. */
  squash(amount: number): void;
}

const MAX_SQUASH = 0.35;

function mat(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    flatShading: true,
    roughness: 0.55,
  });
}

const yellow = mat(0xffd23f, 0xffb800, 0.35);
const orange = mat(0xff8a1f, 0xff6a00, 0.15);
const red = mat(0xe02020, 0x801010, 0.2);
const black = mat(0x0a0a0a, 0x000000, 0);

const bodyGeo = new THREE.CapsuleGeometry(0.17, 0.16, 3, 8);
const headGeo = new THREE.SphereGeometry(0.11, 8, 6);
const beakGeo = new THREE.ConeGeometry(0.045, 0.12, 5);
const combGeo = new THREE.SphereGeometry(0.035, 5, 4);
const wingGeo = new THREE.SphereGeometry(0.07, 6, 5);
const footGeo = new THREE.BoxGeometry(0.1, 0.03, 0.14);
const eyeGeo = new THREE.SphereGeometry(0.018, 5, 4);

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

export function createChicken(): ChickenModel {
  const group = new THREE.Group();
  // Pivot sits at the feet (y=0); scaling it keeps feet on the ground.
  const pivot = new THREE.Group();
  group.add(pivot);

  const body = mesh(bodyGeo, yellow, 0, 0.27, 0);
  pivot.add(body);

  // Head centre y=0.50 -> top at ~0.61.
  pivot.add(mesh(headGeo, yellow, 0, 0.5, 0.05));

  const beak = mesh(beakGeo, orange, 0, 0.48, 0.18);
  beak.rotation.x = Math.PI / 2;
  pivot.add(beak);

  pivot.add(mesh(combGeo, red, 0, 0.62, 0.05));
  pivot.add(mesh(combGeo, red, 0, 0.6, 0.1));
  pivot.add(mesh(combGeo, red, 0, 0.6, 0));

  const wingL = mesh(wingGeo, yellow, 0.18, 0.28, 0);
  wingL.scale.set(0.5, 1, 1.2);
  const wingR = mesh(wingGeo, yellow, -0.18, 0.28, 0);
  wingR.scale.set(0.5, 1, 1.2);
  pivot.add(wingL, wingR);

  pivot.add(mesh(footGeo, orange, 0.07, 0.015, 0.03));
  pivot.add(mesh(footGeo, orange, -0.07, 0.015, 0.03));

  pivot.add(mesh(eyeGeo, black, 0.05, 0.54, 0.145));
  pivot.add(mesh(eyeGeo, black, -0.05, 0.54, 0.145));

  const hatAnchor = new THREE.Object3D();
  hatAnchor.position.set(0, 0.6, 0.05);
  pivot.add(hatAnchor);

  return {
    group,
    hatAnchor,
    squash(amount: number): void {
      const a = Math.max(-MAX_SQUASH, Math.min(MAX_SQUASH, amount));
      // Volume-preserving: y shrinks by a, x/z grow by a/2.
      pivot.scale.set(1 + a * 0.5, 1 - a, 1 + a * 0.5);
    },
  };
}
