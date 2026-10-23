import * as THREE from 'three';

export type RevealKind = 'wall' | 'floor' | 'prop' | 'spook';

export interface Revealable {
  id: string;
  kind: RevealKind;
  /** XZ bounds in world metres, used for ring distance checks. */
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  material: THREE.LineBasicMaterial;
  lines: THREE.LineSegments[];
  /** Hit envelope 0..1 (1 = just revealed). */
  level: number;
  /** Short emissive boost 0..1. */
  boost: number;
  seen: boolean;
  /** Feathers already paid for this object (sonar only). */
  rewarded: boolean;
  peak: number;
  residual: number;
  baseColor: THREE.Color;
  /** World position for floating numbers etc. */
  center: THREE.Vector3;
}

interface KindStyle {
  color: number;
  peak: number;
  residual: number;
  threshold: number;
}

const STYLE: Record<RevealKind, KindStyle> = {
  wall: { color: 0x7fc4ff, peak: 1, residual: 0.08, threshold: 1 },
  floor: { color: 0x4a74a8, peak: 0.26, residual: 0, threshold: 1 },
  prop: { color: 0xd2ecff, peak: 1, residual: 0.08, threshold: 28 },
  spook: { color: 0xeef6ff, peak: 0.7, residual: 0, threshold: 50 },
};

/** Seconds for a hit to decay to its residual. */
const DECAY = 3;
const BOOST_DECAY = 0.35;
/** HDR multiplier at full boost; >1 feeds the bloom pass. */
const BOOST_GAIN = 2.6;

/** Edges are cached per source geometry so cloned props share one EdgesGeometry. */
const edgesCache = new WeakMap<THREE.BufferGeometry, Map<number, THREE.EdgesGeometry>>();
function edgesFor(geo: THREE.BufferGeometry, threshold: number): THREE.EdgesGeometry {
  let byThreshold = edgesCache.get(geo);
  if (!byThreshold) {
    byThreshold = new Map();
    edgesCache.set(geo, byThreshold);
  }
  let edges = byThreshold.get(threshold);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geo, threshold);
    byThreshold.set(threshold, edges);
  }
  return edges;
}

export class RevealSystem {
  readonly items: Revealable[] = [];
  private nextId = 0;

  /**
   * Make `source` revealable: EdgesGeometry line children are attached to every mesh below it,
   * sharing one material. Bounds are taken from the world-space box of `source`.
   */
  add(source: THREE.Object3D, kind: RevealKind, id?: string): Revealable {
    const style = STYLE[kind];
    const material = new THREE.LineBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    const lines: THREE.LineSegments[] = [];
    source.updateWorldMatrix(true, true);
    source.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.noReveal === true) return;
      const geo = o.geometry as THREE.BufferGeometry;
      const line = new THREE.LineSegments(edgesFor(geo, style.threshold), material);
      line.visible = false;
      line.renderOrder = 2;
      lines.push(line);
    });
    // Attach after traversal so we do not visit the new children.
    let li = 0;
    source.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.noReveal === true) return;
      const line = lines[li++];
      if (line) o.add(line);
    });
    if (source instanceof THREE.LineSegments) {
      // Pre-built line geometry (floor patterns, wall outlines): reuse the object itself.
      source.material = material;
      source.visible = false;
      lines.push(source);
    }

    const box = new THREE.Box3().setFromObject(source);
    const r: Revealable = {
      id: id ?? `${kind}-${this.nextId++}`,
      kind,
      minX: box.min.x,
      minZ: box.min.z,
      maxX: box.max.x,
      maxZ: box.max.z,
      material,
      lines,
      level: 0,
      boost: 0,
      seen: false,
      rewarded: false,
      peak: style.peak,
      residual: style.residual,
      baseColor: new THREE.Color(style.color),
      center: box.getCenter(new THREE.Vector3()),
    };
    this.items.push(r);
    return r;
  }

  /** Update the XZ bounds of a moving revealable (spooks). */
  setBounds(r: Revealable, x: number, z: number, half: number): void {
    r.minX = x - half;
    r.maxX = x + half;
    r.minZ = z - half;
    r.maxZ = z + half;
    r.center.set(x, r.center.y, z);
  }

  hit(r: Revealable, strength = 1): void {
    r.level = Math.max(r.level, strength);
    r.boost = Math.max(r.boost, strength);
    r.seen = true;
  }

  /** Visible fraction 0..1 (used by spooks to fade their body). */
  visibility(r: Revealable): number {
    return r.level * r.level;
  }

  update(dt: number): void {
    const decay = dt / DECAY;
    const boostK = Math.exp(-dt / BOOST_DECAY);
    for (const r of this.items) {
      if (r.level <= 0 && !r.seen) continue;
      r.level = Math.max(0, r.level - decay);
      r.boost *= boostK;
      const env = r.level * r.level * (3 - 2 * r.level); // smoothstep ease
      const opacity = Math.max(r.seen ? r.residual : 0, env * r.peak);
      r.material.opacity = opacity;
      const gain = 1 + r.boost * BOOST_GAIN;
      r.material.color.setRGB(r.baseColor.r * gain, r.baseColor.g * gain, r.baseColor.b * gain);
      const visible = opacity > 0.004;
      for (const l of r.lines) l.visible = visible;
    }
  }
}
