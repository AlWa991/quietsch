import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
