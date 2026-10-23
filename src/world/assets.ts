import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type PropKey =
  | 'bed'
  | 'table'
  | 'chair'
  | 'sofa'
  | 'fridge'
  | 'kitchenCabinet'
  | 'bookcase'
  | 'floorLamp'
  | 'box'
  | 'coatRack'
  | 'rug'
  | 'tvCabinet'
  | 'plant'
  | 'toyBear'
  | 'cushion'
  | 'radio';

export type PropRoom = 'flur' | 'kinderzimmer' | 'kueche' | 'wohnzimmer' | 'any';

export interface PropInfo {
  file: string;
  label: string;
  room: PropRoom;
}

export const PROP_INFO: Record<PropKey, PropInfo> = {
  bed: { file: 'bed.glb', label: 'Bett', room: 'kinderzimmer' },
  table: { file: 'table.glb', label: 'Tisch', room: 'kueche' },
  chair: { file: 'chair.glb', label: 'Stuhl', room: 'kueche' },
  sofa: { file: 'sofa.glb', label: 'Sofa', room: 'wohnzimmer' },
  fridge: { file: 'fridge.glb', label: 'Kühlschrank', room: 'kueche' },
  kitchenCabinet: { file: 'kitchen-cabinet.glb', label: 'Küchenschrank', room: 'kueche' },
  bookcase: { file: 'bookcase.glb', label: 'Bücherregal', room: 'wohnzimmer' },
  floorLamp: { file: 'floor-lamp.glb', label: 'Stehlampe', room: 'wohnzimmer' },
  box: { file: 'box.glb', label: 'Spielzeugkiste', room: 'kinderzimmer' },
  coatRack: { file: 'coat-rack.glb', label: 'Garderobe', room: 'flur' },
  rug: { file: 'rug.glb', label: 'Teppich', room: 'any' },
  tvCabinet: { file: 'tv-cabinet.glb', label: 'Fernsehschrank', room: 'wohnzimmer' },
  plant: { file: 'plant.glb', label: 'Topfpflanze', room: 'flur' },
  toyBear: { file: 'toy-bear.glb', label: 'Teddy', room: 'kinderzimmer' },
  cushion: { file: 'cushion.glb', label: 'Kissen', room: 'any' },
  radio: { file: 'radio.glb', label: 'Radio', room: 'any' },
};

export const PROP_KEYS: readonly PropKey[] = Object.keys(PROP_INFO) as PropKey[];

/** Kenney Furniture Kit is roughly half real-world size; the chicken is 0.6 m. */
const BASE_SCALE = 2;
/** Largest horizontal footprint (x or z) of any returned prop, in metres. */
const MAX_FOOTPRINT = 1.8;
const LOAD_TIMEOUT_MS = 10_000;
const LOAD_ATTEMPTS = 3;

const loader = new GLTFLoader();
const cache = new Map<PropKey, Promise<THREE.Group>>();

const hsl = { h: 0, s: 0, l: 0 };

/** Dark, desaturated, slightly cool flat-shaded material; never yellow. */
function darken(source: THREE.Material): THREE.Material {
  const base = source as THREE.MeshStandardMaterial;
  const mat = new THREE.MeshStandardMaterial({
    name: base.name,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
  });
  if (base.color) {
    base.color.getHSL(hsl);
    // Pull warm hues (beige/yellow, 0.05..0.2) towards a cold blue-grey.
    const hue = hsl.h > 0.05 && hsl.h < 0.2 ? 0.58 : hsl.h;
    mat.color.setHSL(hue, Math.min(hsl.s, 1) * 0.3, hsl.l * 0.38);
  } else {
    mat.color.setRGB(0.15, 0.16, 0.2);
  }
  return mat;
}

function normalize(scene: THREE.Group): THREE.Group {
  const darkened = new Map<THREE.Material, THREE.Material>();
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const out = mats.map((m: THREE.Material) => {
      let d = darkened.get(m);
      if (!d) {
        d = darken(m);
        darkened.set(m, d);
      }
      return d;
    });
    obj.material = Array.isArray(obj.material) ? out : (out[0] as THREE.Material);
  });

  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z) * BASE_SCALE;
  const scale = footprint > MAX_FOOTPRINT ? MAX_FOOTPRINT / Math.max(size.x, size.z) : BASE_SCALE;

  scene.scale.setScalar(scale);
  scene.position.set(
    -((box.min.x + box.max.x) / 2) * scale,
    -box.min.y * scale,
    -((box.min.z + box.max.z) / 2) * scale,
  );
  const pivot = new THREE.Group();
  pivot.add(scene);
  return pivot;
}

async function loadOnce(url: string): Promise<THREE.Group> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`timeout after ${LOAD_TIMEOUT_MS} ms`)),
      LOAD_TIMEOUT_MS,
    );
  });
  try {
    const gltf = await Promise.race([loader.loadAsync(url), timeout]);
    return normalize(gltf.scene);
  } finally {
    clearTimeout(timer);
  }
}

async function loadWithRetry(key: PropKey): Promise<THREE.Group> {
  const url = `${import.meta.env.BASE_URL}models/${PROP_INFO[key].file}`;
  let last: unknown;
  for (let attempt = 1; attempt <= LOAD_ATTEMPTS; attempt++) {
    try {
      return await loadOnce(url);
    } catch (err) {
      last = err;
    }
  }
  const reason = last instanceof Error ? last.message : String(last);
  throw new Error(
    `Failed to load prop "${key}" (${url}) after ${LOAD_ATTEMPTS} attempts: ${reason}`,
  );
}

/** Returns a fresh, normalized clone: origin at bottom centre, footprint <= 1.8 m. */
export async function loadProp(key: PropKey): Promise<THREE.Group> {
  let pending = cache.get(key);
  if (!pending) {
    pending = loadWithRetry(key);
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
  }
  return (await pending).clone(true);
}

export async function preloadProps(): Promise<void> {
  await Promise.all(PROP_KEYS.map((key) => loadProp(key)));
}

// --- Low-poly primitive props (no GLB): one merged, vertex-coloured mesh each ---------------

export type PrimKey =
  | 'shelf'
  | 'toyChest'
  | 'blocks'
  | 'dollhouse'
  | 'sideTable'
  | 'shoeRack'
  | 'bench'
  | 'umbrellaStand'
  | 'mirror'
  | 'pictureFrame'
  | 'stove'
  | 'bin'
  | 'wallClock'
  | 'stool'
  | 'crate'
  | 'stairs';

export interface PrimInfo {
  label: string;
  /** false = wall-mounted decoration the chicken can walk past (no blocked cells). */
  solid: boolean;
}

export const PRIM_INFO: Record<PrimKey, PrimInfo> = {
  shelf: { label: 'Regal', solid: true },
  toyChest: { label: 'Truhe', solid: true },
  blocks: { label: 'Bauklötze', solid: true },
  dollhouse: { label: 'Puppenhaus', solid: true },
  sideTable: { label: 'Beistelltisch', solid: true },
  shoeRack: { label: 'Schuhregal', solid: true },
  bench: { label: 'Bank', solid: true },
  umbrellaStand: { label: 'Schirmständer', solid: true },
  mirror: { label: 'Spiegel', solid: true },
  pictureFrame: { label: 'Bilderrahmen', solid: false },
  stove: { label: 'Herd', solid: true },
  bin: { label: 'Mülleimer', solid: true },
  wallClock: { label: 'Küchenuhr', solid: false },
  stool: { label: 'Hocker', solid: true },
  crate: { label: 'Umzugskartons', solid: true },
  stairs: { label: 'Kellertreppe', solid: false },
};

export function isPrimKey(key: string): key is PrimKey {
  return key in PRIM_INFO;
}

// Dark, desaturated, cold palette (never yellow).
const WOOD = 0x2b2e38;
const WOOD_LIGHT = 0x353a47;
const CLOTH = 0x232b3d;
const STEEL = 0x3a4250;
const PALE = 0x4a5568;
const TOY_BLUE = 0x2a3f60;
const TOY_GREEN = 0x244238;
const TOY_MAUVE = 0x3d3050;
const TOY_RED = 0x4a2a35;
const CARDBOARD = 0x3d3226;
const CARDBOARD_DARK = 0x30281f;

/** Box with bottom-centre at (x, y, z); optional Y rotation. */
function bx(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number,
  ry = 0,
): THREE.BufferGeometry {
  return tint(new THREE.BoxGeometry(w, h, d), h, x, y, z, color, ry);
}

/** Cylinder/cone with bottom-centre at (x, y, z). */
function cy(
  rTop: number,
  rBot: number,
  h: number,
  x: number,
  y: number,
  z: number,
  color: number,
  seg = 8,
  ry = 0,
): THREE.BufferGeometry {
  return tint(new THREE.CylinderGeometry(rTop, rBot, h, seg), h, x, y, z, color, ry);
}

function tint(
  g: THREE.BufferGeometry,
  h: number,
  x: number,
  y: number,
  z: number,
  color: number,
  ry: number,
): THREE.BufferGeometry {
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  const c = new THREE.Color(color);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function primParts(key: PrimKey): THREE.BufferGeometry[] {
  switch (key) {
    case 'shelf': {
      const parts = [
        bx(0.08, 1.3, 0.35, -0.56, 0, 0, WOOD),
        bx(0.08, 1.3, 0.35, 0.56, 0, 0, WOOD),
        bx(1.2, 1.3, 0.03, 0, 0, -0.16, WOOD_LIGHT),
      ];
      for (const y of [0.04, 0.45, 0.86, 1.27]) parts.push(bx(1.2, 0.05, 0.35, 0, y, 0, WOOD));
      const books: [number, number, number, number][] = [
        [-0.42, 0.05, 0.12, TOY_BLUE],
        [-0.3, 0.09, 0.12, TOY_RED],
        [-0.18, 0.05, 0.1, CLOTH],
        [0.3, 0.46, 0.14, TOY_GREEN],
        [0.42, 0.9, 0.1, TOY_MAUVE],
        [-0.2, 0.9, 0.2, STEEL],
      ];
      for (const [x, y, w, c] of books) parts.push(bx(w, 0.3, 0.2, x, y + 0.04, 0, c));
      return parts;
    }
    case 'toyChest':
      return [
        bx(0.9, 0.38, 0.5, 0, 0, 0, TOY_BLUE),
        bx(0.94, 0.09, 0.54, 0, 0.38, 0, WOOD_LIGHT),
        bx(0.9, 0.08, 0.51, 0, 0.15, 0, TOY_RED),
        bx(0.12, 0.06, 0.04, 0, 0.3, 0.27, STEEL),
      ];
    case 'blocks':
      return [
        bx(0.26, 0.26, 0.26, -0.15, 0, 0, TOY_RED),
        bx(0.26, 0.26, 0.26, 0.15, 0, 0.02, TOY_GREEN, 0.3),
        bx(0.26, 0.26, 0.26, 0, 0.26, 0, TOY_BLUE, 0.7),
      ];
    case 'dollhouse':
      return [
        bx(0.9, 0.55, 0.6, 0, 0, 0, TOY_MAUVE),
        bx(0.2, 0.32, 0.03, 0.05, 0, 0.31, WOOD),
        bx(0.18, 0.18, 0.03, -0.27, 0.25, 0.31, PALE),
        bx(0.18, 0.18, 0.03, 0.3, 0.25, 0.31, PALE),
        cy(0.01, 0.68, 0.38, 0, 0.55, 0, TOY_RED, 4, Math.PI / 4),
      ];
    case 'sideTable':
      return [
        cy(0.22, 0.22, 0.04, 0, 0, 0, WOOD),
        cy(0.045, 0.045, 0.52, 0, 0.04, 0, WOOD),
        cy(0.34, 0.34, 0.05, 0, 0.56, 0, WOOD_LIGHT, 10),
        cy(0.08, 0.1, 0.16, 0.08, 0.61, 0, STEEL),
        cy(0.1, 0.2, 0.26, 0.08, 0.76, 0, PALE),
      ];
    case 'shoeRack': {
      const parts = [bx(0.05, 0.55, 0.3, -0.48, 0, 0, WOOD), bx(0.05, 0.55, 0.3, 0.48, 0, 0, WOOD)];
      for (const y of [0.04, 0.26, 0.5]) parts.push(bx(1, 0.04, 0.3, 0, y, 0, WOOD_LIGHT));
      const shoes: [number, number, number][] = [
        [-0.3, 0.08, TOY_RED],
        [-0.05, 0.08, CLOTH],
        [0.25, 0.3, STEEL],
        [-0.25, 0.3, TOY_BLUE],
      ];
      for (const [x, y, c] of shoes) parts.push(bx(0.22, 0.12, 0.09, x, y, 0.02, c, 0.2));
      return parts;
    }
    case 'bench':
      return [
        bx(1.2, 0.06, 0.4, 0, 0.42, 0, WOOD_LIGHT),
        bx(0.06, 0.42, 0.34, -0.55, 0, 0, WOOD),
        bx(0.06, 0.42, 0.34, 0.55, 0, 0, WOOD),
        bx(1.1, 0.04, 0.3, 0, 0.12, 0, WOOD),
        bx(0.5, 0.1, 0.34, 0.15, 0.48, 0, CLOTH),
      ];
    case 'umbrellaStand':
      return [
        cy(0.17, 0.14, 0.5, 0, 0, 0, STEEL, 8),
        cy(0.02, 0.02, 0.95, -0.05, 0.1, 0.03, CLOTH, 5),
        cy(0.02, 0.02, 0.8, 0.06, 0.1, -0.03, TOY_RED, 5),
        cy(0.02, 0.02, 0.88, 0.02, 0.1, 0.07, TOY_GREEN, 5),
        bx(0.1, 0.05, 0.05, -0.05, 1.05, 0.03, WOOD),
      ];
    case 'mirror':
      return [
        bx(0.7, 0.07, 0.06, 0, 0.08, 0, WOOD_LIGHT),
        bx(0.7, 0.07, 0.06, 0, 1.5, 0, WOOD_LIGHT),
        bx(0.07, 1.5, 0.06, -0.315, 0.08, 0, WOOD_LIGHT),
        bx(0.07, 1.5, 0.06, 0.315, 0.08, 0, WOOD_LIGHT),
        bx(0.56, 1.35, 0.02, 0, 0.15, 0.01, 0x39465c),
        bx(0.5, 0.05, 0.3, 0, 0, -0.08, WOOD),
      ];
    case 'pictureFrame':
      return [
        bx(0.8, 0.6, 0.04, 0, 0.7, 0, WOOD),
        bx(0.66, 0.46, 0.02, 0, 0.77, 0.02, 0x2d3f4d),
        bx(0.5, 0.18, 0.02, 0.02, 0.8, 0.035, 0x1d2a38),
      ];
    case 'stove':
      return [
        bx(0.9, 0.85, 0.65, 0, 0, 0, STEEL),
        bx(0.7, 0.4, 0.03, 0, 0.1, 0.33, 0x1d222c),
        cy(0.1, 0.1, 0.02, -0.2, 0.85, -0.12, 0x151a22),
        cy(0.1, 0.1, 0.02, 0.2, 0.85, -0.12, 0x151a22),
        cy(0.08, 0.08, 0.02, -0.2, 0.85, 0.15, 0x151a22),
        cy(0.08, 0.08, 0.02, 0.2, 0.85, 0.15, 0x151a22),
        bx(0.9, 0.12, 0.05, 0, 0.85, -0.3, STEEL),
      ];
    case 'bin':
      return [cy(0.2, 0.17, 0.6, 0, 0, 0, STEEL, 8), cy(0.22, 0.22, 0.05, 0, 0.6, 0, PALE, 8)];
    case 'wallClock': {
      const face = cy(0.27, 0.27, 0.04, 0, 0, 0, PALE, 12);
      face.rotateX(Math.PI / 2);
      face.translate(0, 1.2, 0.03);
      const rim = cy(0.31, 0.31, 0.04, 0, 0, 0, WOOD, 12);
      rim.rotateX(Math.PI / 2);
      rim.translate(0, 1.2, 0.01);
      return [
        rim,
        face,
        bx(0.025, 0.2, 0.02, 0, 1.2, 0.06, 0x151a22),
        bx(0.16, 0.025, 0.02, 0.06, 1.2, 0.06, 0x151a22),
      ];
    }
    case 'stool':
      return [
        cy(0.22, 0.22, 0.05, 0, 0.45, 0, WOOD_LIGHT, 8),
        bx(0.05, 0.45, 0.05, -0.14, 0, -0.1, WOOD),
        bx(0.05, 0.45, 0.05, 0.14, 0, -0.1, WOOD),
        bx(0.05, 0.45, 0.05, 0, 0, 0.15, WOOD),
      ];
    case 'crate':
      // Stacked moving boxes, tape strips on top.
      return [
        bx(0.62, 0.42, 0.5, 0, 0, 0, CARDBOARD),
        bx(0.5, 0.36, 0.42, 0.04, 0.42, 0.02, CARDBOARD_DARK, 0.25),
        bx(0.08, 0.01, 0.52, 0, 0.42, 0, PALE),
        bx(0.07, 0.01, 0.44, 0.04, 0.78, 0.02, PALE, 0.25),
      ];
    case 'stairs':
      // Steps leading down from the hollow wall into the Keller (walkable, flat).
      return [
        bx(0.9, 0.12, 0.3, 0, 0, -0.32, STEEL),
        bx(0.9, 0.08, 0.3, 0, 0, 0, WOOD),
        bx(0.9, 0.04, 0.3, 0, 0, 0.32, STEEL),
      ];
  }
}

const primMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.9,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

/** Fresh primitive prop: origin at bottom centre, front faces +z. Geometry is built once per key. */
const primGeo = new Map<PrimKey, THREE.BufferGeometry>();
export function buildPrim(key: PrimKey): THREE.Group {
  let geo = primGeo.get(key);
  if (!geo) {
    const merged = mergeGeometries(primParts(key));
    if (!merged) throw new Error(`Failed to merge geometry for prop "${key}"`);
    geo = merged;
    primGeo.set(key, geo);
  }
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, primMaterial));
  return group;
}
