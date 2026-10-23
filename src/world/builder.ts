import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GridCell, type HouseMap } from '@/core/types';
import type { RevealSystem } from '@/render/reveal';
import {
  PRIM_INFO,
  PROP_INFO,
  buildPrim,
  isPrimKey,
  loadProp,
  type PrimKey,
  type PropKey,
} from './assets';
import { SOFA_SPOTS } from './house-map';

export interface WallBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** AABBs (cell units) of every wall run, for collision and reveal. */
export const wallBoxes: WallBox[] = [];

export const WALL_HEIGHT = 1.5;
/** Outer south wall is a low cutaway so it never hides the chicken (diorama view). */
const CUTAWAY_HEIGHT = 0.35;
/** Max wall chunk length (cells) per revealable, so reveals travel along long walls. */
const WALL_CHUNK = 4;
const FLOOR_PATCH = 4;

const ROOM_FLOOR: Record<string, number> = {
  flur: 0x1c1712,
  kinderzimmer: 0x1a2036,
  kueche: 0x171b1c,
  wohnzimmer: 0x1e1610,
};

/** Shared materials so the lightning system can modulate window glow. */
export const windowMaterial = new THREE.MeshBasicMaterial({
  color: 0x1b2d4a,
  toneMapped: false,
  fog: false,
});
export const WINDOW_BASE = new THREE.Color(0x1b2d4a);

/** Window panes: [x, z, rotY]. Shared with the lightning system for window silhouettes. */
export const WINDOW_SPOTS: readonly [x: number, z: number, rotY: number][] = [
  [14, 1.03, 0],
  [20, 1.03, 0],
  [33, 1.03, 0],
  [36, 1.03, 0],
  [1.03, 15, Math.PI / 2],
  [1.03, 25, Math.PI / 2],
  [46.97, 17, -Math.PI / 2],
  [46.97, 27, -Math.PI / 2],
];

export interface DoorLight {
  x: number;
  z: number;
}

export interface HouseBuild {
  group: THREE.Group;
  /** 1 texel per cell, 255 = floor/door. Used by the sonar ring to stay on the floor. */
  floorMask: THREE.DataTexture;
  doors: DoorLight[];
  /** Cell centre of the Korb (home basket). */
  korb: { x: number; z: number };
  /** Cells blocked for the chicken (walls + furniture), indexed y * width + x. */
  blocked: Uint8Array;
}

/** Greedy wall runs: horizontal runs (len >= 2) first, leftover cells become vertical runs. */
function wallRuns(map: HouseMap): WallBox[] {
  const isWall = (x: number, y: number): boolean => map.cells[y]?.[x] === GridCell.Wall;
  const claimed = new Uint8Array(map.width * map.height);
  const runs: WallBox[] = [];
  for (let y = 0; y < map.height; y++) {
    let x = 0;
    while (x < map.width) {
      if (!isWall(x, y)) {
        x++;
        continue;
      }
      let end = x;
      while (isWall(end + 1, y)) end++;
      if (end > x) {
        runs.push({ x, y, w: end - x + 1, h: 1 });
        for (let i = x; i <= end; i++) claimed[y * map.width + i] = 1;
      }
      x = end + 1;
    }
  }
  for (let x = 0; x < map.width; x++) {
    let y = 0;
    while (y < map.height) {
      if (!isWall(x, y) || claimed[y * map.width + x]) {
        y++;
        continue;
      }
      let end = y;
      while (isWall(x, end + 1) && !claimed[(end + 1) * map.width + x]) end++;
      runs.push({ x, y, w: 1, h: end - y + 1 });
      y = end + 1;
    }
  }
  return runs;
}

/** Split runs into chunks of at most WALL_CHUNK cells. */
function chunk(run: WallBox): WallBox[] {
  const out: WallBox[] = [];
  const horizontal = run.w >= run.h;
  const len = horizontal ? run.w : run.h;
  const n = Math.ceil(len / WALL_CHUNK);
  const size = len / n;
  for (let i = 0; i < n; i++) {
    const a = Math.round(i * size);
    const b = Math.round((i + 1) * size);
    out.push(
      horizontal
        ? { x: run.x + a, y: run.y, w: b - a, h: 1 }
        : { x: run.x, y: run.y + a, w: 1, h: b - a },
    );
  }
  return out;
}

function boxGeo(b: WallBox, height: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(b.w, height, b.h);
  g.translate(b.x + b.w / 2, height / 2, b.y + b.h / 2);
  return g;
}

type FloorPattern = 'planks' | 'tiles' | 'carpet' | 'islands';

const ROOM_PATTERN: Record<string, FloorPattern> = {
  flur: 'planks',
  wohnzimmer: 'islands',
  kueche: 'tiles',
  kinderzimmer: 'carpet',
};

/** Axis-aligned rect in world metres. */
interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Flat 2D segments [ax, az, bx, bz, ...]. */
type Segs = number[];

/** Carpet islands in the Wohnzimmer (planks stay visible around them). */
const WOHNZIMMER_ISLANDS: Rect[] = [
  { x0: 14.5, z0: 3.8, x1: 22.5, z1: 9.6 },
  { x0: 25.5, z0: 3.4, x1: 33.5, z1: 9.6 },
  { x0: 9.6, z0: 5.6, x1: 13.4, z1: 9.8 },
];

/** Clip one segment to a rect (Liang-Barsky); null if fully outside. */
function clipSeg(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  r: Rect,
): [number, number, number, number] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  const p = [-dx, dx, -dz, dz];
  const q = [ax - r.x0, r.x1 - ax, az - r.z0, r.z1 - az];
  for (let i = 0; i < 4; i++) {
    const pi = p[i] as number;
    const qi = q[i] as number;
    if (pi === 0) {
      if (qi < 0) return null;
    } else {
      const t = qi / pi;
      if (pi < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return null;
    }
  }
  return [ax + t0 * dx, az + t0 * dz, ax + t1 * dx, az + t1 * dz];
}

function clipAll(segs: Segs, r: Rect): Segs {
  const out: Segs = [];
  for (let i = 0; i < segs.length; i += 4) {
    const c = clipSeg(
      segs[i] as number,
      segs[i + 1] as number,
      segs[i + 2] as number,
      segs[i + 3] as number,
      r,
    );
    if (c && Math.hypot(c[2] - c[0], c[3] - c[1]) > 0.01) out.push(...c);
  }
  return out;
}

/** Remove the parts of axis-aligned segments that lie inside `r`. */
function subtractRect(segs: Segs, r: Rect): Segs {
  const out: Segs = [];
  for (let i = 0; i < segs.length; i += 4) {
    const ax = segs[i] as number;
    const az = segs[i + 1] as number;
    const bx = segs[i + 2] as number;
    const bz = segs[i + 3] as number;
    if (az === bz) {
      if (az <= r.z0 || az >= r.z1) {
        out.push(ax, az, bx, bz);
      } else {
        if (ax < r.x0) out.push(ax, az, Math.min(bx, r.x0), bz);
        if (bx > r.x1) out.push(Math.max(ax, r.x1), az, bx, bz);
      }
    } else if (ax <= r.x0 || ax >= r.x1) {
      out.push(ax, az, bx, bz);
    } else {
      if (az < r.z0) out.push(ax, az, bx, Math.min(bz, r.z0));
      if (bz > r.z1) out.push(ax, Math.max(az, r.z1), bx, bz);
    }
  }
  return out;
}

function rectOutline(r: Rect, out: Segs): void {
  out.push(r.x0, r.z0, r.x1, r.z0, r.x1, r.z0, r.x1, r.z1);
  out.push(r.x1, r.z1, r.x0, r.z1, r.x0, r.z1, r.x0, r.z0);
}

function ring(cx: number, cz: number, radius: number, out: Segs): void {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    out.push(
      cx + Math.cos(a) * radius,
      cz + Math.sin(a) * radius,
      cx + Math.cos(b) * radius,
      cz + Math.sin(b) * radius,
    );
  }
}

/** Diamond lattice (both diagonals, `step` apart) over a rect. */
function diamonds(r: Rect, step: number, out: Segs): void {
  const w = r.x1 - r.x0;
  const h = r.z1 - r.z0;
  for (let c = 0; c <= w + h; c += step) {
    out.push(r.x0 + c, r.z0, r.x0 + c - h, r.z1);
  }
  for (let k = -h; k <= w; k += step) {
    out.push(r.x0 + k, r.z0, r.x0 + k + h, r.z1);
  }
}

/** Kinderzimmer: soft diamond-patterned carpet with a border and a big round play rug. */
function carpetSegs(room: Rect): Segs {
  const segs: Segs = [];
  diamonds(room, 0.7, segs);
  const clipped = clipAll(segs, room);
  for (const inset of [0.35, 0.5]) {
    rectOutline(
      { x0: room.x0 + inset, z0: room.z0 + inset, x1: room.x1 - inset, z1: room.z1 - inset },
      clipped,
    );
  }
  const cx = (room.x0 + room.x1) / 2;
  const cz = (room.z0 + room.z1) / 2;
  for (const radius of [4.6, 4.3, 2.2, 1.9]) ring(cx, cz, radius, clipped);
  return clipped;
}

/** Wohnzimmer carpet islands: outline, inner border, diamond centre and fringe on the short ends. */
function islandSegs(r: Rect): Segs {
  const segs: Segs = [];
  rectOutline(r, segs);
  const inner: Rect = { x0: r.x0 + 0.3, z0: r.z0 + 0.3, x1: r.x1 - 0.3, z1: r.z1 - 0.3 };
  rectOutline(inner, segs);
  const lattice: Segs = [];
  diamonds(inner, 1.1, lattice);
  segs.push(...clipAll(lattice, inner));
  for (let z = r.z0 + 0.15; z < r.z1; z += 0.25) {
    segs.push(r.x0 - 0.25, z, r.x0, z, r.x1, z, r.x1 + 0.25, z);
  }
  return segs;
}

/** Plank rows (along x) with staggered butt joints every 2 m, for one patch. */
function plankSegs(x0: number, z0: number, w: number, h: number): Segs {
  const plank = 0.5;
  const segs: Segs = [];
  const rows = Math.round(h / plank);
  for (let j = 0; j <= rows; j++) segs.push(x0, z0 + j * plank, x0 + w, z0 + j * plank);
  for (let j = 0; j < rows; j++) {
    const za = z0 + j * plank;
    for (let jx = ((x0 + j * 0.7) % 2) + 0.4; jx < w; jx += 2) {
      segs.push(x0 + jx, za, x0 + jx, za + plank);
    }
  }
  return segs;
}

function tileSegs(x0: number, z0: number, w: number, h: number): Segs {
  const segs: Segs = [];
  for (let i = 0; i <= w; i++) segs.push(x0 + i, z0, x0 + i, z0 + h);
  for (let j = 0; j <= h; j++) segs.push(x0, z0 + j, x0 + w, z0 + j);
  return segs;
}

/** Floor line pattern for one patch of a room. `decor` = precomputed room-wide pattern. */
function floorLines(
  pattern: FloorPattern,
  decor: Segs | null,
  x0: number,
  z0: number,
  w: number,
  h: number,
): THREE.LineSegments | null {
  const patch: Rect = { x0, z0, x1: x0 + w, z1: z0 + h };
  let segs: Segs;
  if (pattern === 'tiles') segs = tileSegs(x0, z0, w, h);
  else if (pattern === 'carpet') segs = clipAll(decor ?? [], patch);
  else if (pattern === 'islands') {
    segs = plankSegs(x0, z0, w, h);
    for (const isl of WOHNZIMMER_ISLANDS) segs = subtractRect(segs, isl);
    segs.push(...clipAll(decor ?? [], patch));
  } else segs = plankSegs(x0, z0, w, h);
  if (segs.length === 0) return null;
  const y = 0.012;
  const pts: number[] = [];
  for (let i = 0; i < segs.length; i += 4) {
    pts.push(
      segs[i] as number,
      y,
      segs[i + 1] as number,
      segs[i + 2] as number,
      y,
      segs[i + 3] as number,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g);
}

/**
 * Outline of one wall chunk: long edges always, end caps only where the chunk ends its run,
 * so long walls read as one continuous wall instead of 4 m blocks.
 */
function wallOutline(
  c: WallBox,
  height: number,
  capStart: boolean,
  capEnd: boolean,
): THREE.BufferGeometry {
  const pts: number[] = [];
  const x0 = c.x;
  const x1 = c.x + c.w;
  const z0 = c.y;
  const z1 = c.y + c.h;
  const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): void => {
    pts.push(ax, ay, az, bx, by, bz);
  };
  const horizontal = c.w >= c.h;
  for (const y of [0.01, height]) {
    if (horizontal) {
      seg(x0, y, z0, x1, y, z0);
      seg(x0, y, z1, x1, y, z1);
    } else {
      seg(x0, y, z0, x0, y, z1);
      seg(x1, y, z0, x1, y, z1);
    }
  }
  const cap = (ax: number, az: number, bx: number, bz: number): void => {
    seg(ax, height, az, bx, height, bz);
    seg(ax, 0.01, az, ax, height, az);
    seg(bx, 0.01, bz, bx, height, bz);
  };
  if (horizontal) {
    if (capStart) cap(x0, z0, x0, z1);
    if (capEnd) cap(x1, z0, x1, z1);
  } else {
    if (capStart) cap(x0, z0, x1, z0);
    if (capEnd) cap(x0, z1, x1, z1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function buildKorb(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const wicker = new THREE.MeshStandardMaterial({
    color: 0x6b4527,
    roughness: 1,
    flatShading: true,
  });
  const cushion = new THREE.MeshStandardMaterial({
    color: 0x6a2430,
    roughness: 1,
    flatShading: true,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 6, 14), wicker);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.22;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.6, 0.16, 14), wicker);
  base.position.y = 0.08;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.1, 12), cushion);
  pad.position.y = 0.18;
  g.add(rim, base, pad);
  // Heater behind the basket: dull warm glow, the only cosy spot in the house.
  const heaterMat = new THREE.MeshStandardMaterial({
    color: 0x3a3430,
    emissive: 0x6a2a08,
    emissiveIntensity: 0.6,
    flatShading: true,
  });
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.16), heaterMat);
    fin.position.set(-0.4 + i * 0.16, 0.45, 1.25);
    g.add(fin);
  }
  g.position.set(x, 0, z);
  return g;
}

/** Build walls, floors, Korb and windows. Registers revealables. 1 cell = 1 m, y is up. */
export function buildHouse(map: HouseMap, reveal: RevealSystem): HouseBuild {
  const group = new THREE.Group();
  const blocked = new Uint8Array(map.width * map.height);
  map.cells.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c === GridCell.Wall || c === GridCell.Void) blocked[y * map.width + x] = 1;
    }),
  );

  // Floors: one tinted plane per room, plus door thresholds.
  for (const room of map.rooms) {
    const { x, y, w, h } = room.bounds;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: ROOM_FLOOR[room.id] ?? 0x15171d, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x + w / 2, 0, y + h / 2);
    group.add(floor);
    const pattern = ROOM_PATTERN[room.id] ?? 'planks';
    const bounds: Rect = { x0: x, z0: y, x1: x + w, z1: y + h };
    const decor =
      pattern === 'carpet'
        ? carpetSegs(bounds)
        : pattern === 'islands'
          ? WOHNZIMMER_ISLANDS.flatMap(islandSegs)
          : null;
    for (let py = 0; py < h; py += FLOOR_PATCH) {
      for (let px = 0; px < w; px += FLOOR_PATCH) {
        const lines = floorLines(
          pattern,
          decor,
          x + px,
          y + py,
          Math.min(FLOOR_PATCH, w - px),
          Math.min(FLOOR_PATCH, h - py),
        );
        if (!lines) continue;
        group.add(lines);
        reveal.add(lines, 'floor');
      }
    }
  }

  const doors: DoorLight[] = [];
  const doorCells: { x: number; y: number }[] = [];
  map.cells.forEach((row, y) =>
    row.forEach((c, x) => c === GridCell.Door && doorCells.push({ x, y })),
  );
  const doorFloorMat = new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 1 });
  for (const d of doorCells) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), doorFloorMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(d.x + 0.5, 0.001, d.y + 0.5);
    group.add(f);
    // Merge horizontally adjacent door cells into one light.
    const left = doors.find((o) => Math.abs(o.z - (d.y + 0.5)) < 0.01 && o.x + 0.5 === d.x);
    if (left) left.x += 0.5;
    else doors.push({ x: d.x + 0.5, z: d.y + 0.5 });
  }

  // Walls: merged into one mesh, revealed per chunk.
  wallBoxes.length = 0;
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2c303b,
    roughness: 0.95,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const geos: THREE.BufferGeometry[] = [];
  for (const run of wallRuns(map)) {
    wallBoxes.push(run);
    const height = run.y === map.height - 1 && run.h === 1 ? CUTAWAY_HEIGHT : WALL_HEIGHT;
    const chunks = chunk(run);
    chunks.forEach((c, i) => {
      geos.push(boxGeo(c, height));
      const outline = new THREE.LineSegments(
        wallOutline(c, height, i === 0, i === chunks.length - 1),
      );
      group.add(outline);
      reveal.add(outline, 'wall');
    });
  }
  const walls = new THREE.Mesh(mergeGeometries(geos), wallMat);
  group.add(walls);

  // Windows on outer walls: cold moonlight panes, flare up with lightning.
  const paneGeo = new THREE.PlaneGeometry(1.6, 0.8);
  for (const [x, z, rot] of WINDOW_SPOTS) {
    const pane = new THREE.Mesh(paneGeo, windowMaterial);
    pane.position.set(x, 0.85, z);
    pane.rotation.y = rot;
    pane.userData.noReveal = true;
    group.add(pane);
  }

  const k = map.cells.flatMap((row, y) =>
    row.flatMap((c, x) => (c === GridCell.Korb ? [{ x, y }] : [])),
  )[0] ?? { x: 1, y: 1 };
  group.add(buildKorb(k.x + 0.5, k.y + 0.5));

  const maskData = new Uint8Array(map.width * map.height);
  map.cells.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c !== GridCell.Wall && c !== GridCell.Void) maskData[y * map.width + x] = 255;
    }),
  );
  const floorMask = new THREE.DataTexture(maskData, map.width, map.height, THREE.RedFormat);
  floorMask.needsUpdate = true;

  return { group, floorMask, doors, korb: { x: k.x + 0.5, z: k.y + 0.5 }, blocked };
}

interface Placement {
  key: PropKey | PrimKey;
  x: number;
  z: number;
  rot: number;
}

/** Hand-placed furniture (cell-centre coords). 'T' cells are interactables (entities/interactable). */
const FURNITURE: Placement[] = [
  // Kinderzimmer
  { key: 'shelf', x: 10, z: 12.2, rot: 0 },
  { key: 'shelf', x: 1.22, z: 25, rot: Math.PI / 2 },
  { key: 'toyChest', x: 15.45, z: 27, rot: -Math.PI / 2 },
  { key: 'blocks', x: 6.5, z: 17.5, rot: 0.5 },
  { key: 'dollhouse', x: 3.5, z: 24.5, rot: 0.3 },
  { key: 'toyBear', x: 6.5, z: 28.5, rot: -0.6 },
  { key: 'bed', x: 2.5, z: 13.6, rot: Math.PI / 2 },
  { key: 'rug', x: 8, z: 23.5, rot: 0 },
  { key: 'cushion', x: 13.5, z: 29.3, rot: 0.4 },
  { key: 'toyBear', x: 7.5, z: 13, rot: 0.3 },
  // Flur
  { key: 'shoeRack', x: 17.2, z: 14.5, rot: Math.PI / 2 },
  { key: 'bench', x: 17.25, z: 23.5, rot: Math.PI / 2 },
  { key: 'umbrellaStand', x: 29.5, z: 13.5, rot: 0 },
  { key: 'mirror', x: 30.6, z: 22, rot: -Math.PI / 2 },
  { key: 'pictureFrame', x: 20, z: 12.06, rot: 0 },
  { key: 'pictureFrame', x: 17.06, z: 26.5, rot: Math.PI / 2 },
  { key: 'plant', x: 29.5, z: 29.4, rot: 0 },
  { key: 'rug', x: 24, z: 20, rot: Math.PI / 2 },
  { key: 'coatRack', x: 28.5, z: 16.5, rot: 0 },
  // Küche
  { key: 'stove', x: 36, z: 12.5, rot: 0 },
  { key: 'shelf', x: 33.8, z: 12.2, rot: 0 },
  { key: 'bin', x: 45.5, z: 16.5, rot: 0 },
  { key: 'wallClock', x: 45.94, z: 21, rot: -Math.PI / 2 },
  { key: 'kitchenCabinet', x: 38, z: 30.4, rot: Math.PI },
  { key: 'stool', x: 35.5, z: 21.5, rot: 0.4 },
  { key: 'fridge', x: 46.3, z: 13, rot: -Math.PI / 2 },
  { key: 'kitchenCabinet', x: 38, z: 12.6, rot: 0 },
  { key: 'kitchenCabinet', x: 40, z: 12.6, rot: 0 },
  { key: 'table', x: 41.5, z: 19.5, rot: 0 },
  { key: 'chair', x: 42.7, z: 19.5, rot: -Math.PI / 2 },
  { key: 'chair', x: 39.3, z: 19.5, rot: Math.PI / 2 },
  // Wohnzimmer
  { key: 'shelf', x: 17, z: 1.2, rot: 0 },
  { key: 'shelf', x: 8.22, z: 6.5, rot: Math.PI / 2 },
  { key: 'sideTable', x: 22.2, z: 6.2, rot: 0 },
  { key: 'sideTable', x: 32.5, z: 6.4, rot: 0 },
  { key: 'floorLamp', x: 20.5, z: 2.5, rot: 0 },
  { key: 'pictureFrame', x: 21.6, z: 1.06, rot: 0 },
  { key: 'bookcase', x: 9.5, z: 1.5, rot: 0 },
  { key: 'tvCabinet', x: 29.5, z: 1.5, rot: 0 },
  { key: 'rug', x: 27.5, z: 4.5, rot: 0 },
  { key: 'plant', x: 38.6, z: 9.6, rot: 0 },
  { key: 'floorLamp', x: 37.5, z: 2.5, rot: 0 },
  { key: 'radio', x: 10.5, z: 8.5, rot: 0 },
  ...SOFA_SPOTS.map((p) => ({ key: 'sofa' as const, x: p.x, z: p.z, rot: Math.PI })),
];

/** Flat props the chicken may walk over. */
const WALKABLE: ReadonlySet<string> = new Set(['rug', 'cushion']);

export interface PlacedProp {
  key: PropKey | PrimKey;
  label: string;
  object: THREE.Group;
}

/** Load and place all props, register them as revealables, mark their cells blocked. */
export async function placeProps(
  map: HouseMap,
  build: HouseBuild,
  reveal: RevealSystem,
): Promise<PlacedProp[]> {
  const placements: Placement[] = FURNITURE;

  const loaded = await Promise.all(
    placements.map((p) => (isPrimKey(p.key) ? buildPrim(p.key) : loadProp(p.key))),
  );
  const out: PlacedProp[] = [];
  const box = new THREE.Box3();
  placements.forEach((p, i) => {
    const object = loaded[i];
    if (!object) return;
    object.position.set(p.x, 0, p.z);
    object.rotation.y = p.rot;
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        m.polygonOffset = true;
        m.polygonOffsetFactor = 1;
        m.polygonOffsetUnits = 1;
      }
    });
    build.group.add(object);
    reveal.add(object, WALKABLE.has(p.key) ? 'floor' : 'prop', `${p.key}-${i}`);
    out.push({
      key: p.key,
      label: isPrimKey(p.key) ? PRIM_INFO[p.key].label : PROP_INFO[p.key].label,
      object,
    });
    if (WALKABLE.has(p.key) || (isPrimKey(p.key) && !PRIM_INFO[p.key].solid)) return;
    box.setFromObject(object);
    for (let y = Math.floor(box.min.z + 0.2); y <= Math.floor(box.max.z - 0.2); y++) {
      for (let x = Math.floor(box.min.x + 0.2); x <= Math.floor(box.max.x - 0.2); x++) {
        if (x >= 0 && y >= 0 && x < map.width && y < map.height) {
          build.blocked[y * map.width + x] = 1;
        }
      }
    }
  });
  return out;
}
