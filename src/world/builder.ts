import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GridCell, type HouseMap, type RoomDef } from '@/core/types';
import type { RevealSystem } from '@/render/reveal';
import { PROP_INFO, loadProp, type PropKey } from './assets';

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
  kinderzimmer: 0x141826,
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

type FloorPattern = 'planks' | 'tiles' | 'none';

const ROOM_PATTERN: Record<string, FloorPattern> = {
  flur: 'planks',
  wohnzimmer: 'planks',
  kueche: 'tiles',
  kinderzimmer: 'none',
};

/** Floor line pattern for one patch: staggered planks (along x) or a 1 m tile grid. */
function floorLines(
  pattern: FloorPattern,
  x0: number,
  z0: number,
  w: number,
  h: number,
): THREE.LineSegments | null {
  if (pattern === 'none') return null;
  const pts: number[] = [];
  const y = 0.012;
  if (pattern === 'tiles') {
    for (let i = 0; i <= w; i++) pts.push(x0 + i, y, z0, x0 + i, y, z0 + h);
    for (let j = 0; j <= h; j++) pts.push(x0, y, z0 + j, x0 + w, y, z0 + j);
  } else {
    const plank = 0.5;
    const rows = Math.round(h / plank);
    for (let j = 0; j <= rows; j++) pts.push(x0, y, z0 + j * plank, x0 + w, y, z0 + j * plank);
    // Staggered butt joints every 2 m.
    for (let j = 0; j < rows; j++) {
      const za = z0 + j * plank;
      for (let jx = ((x0 + j * 0.7) % 2) + 0.4; jx < w; jx += 2) {
        pts.push(x0 + jx, y, za, x0 + jx, y, za + plank);
      }
    }
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

function roomOf(map: HouseMap, x: number, y: number): RoomDef | undefined {
  return map.rooms.find(
    (r) =>
      x >= r.bounds.x &&
      x < r.bounds.x + r.bounds.w &&
      y >= r.bounds.y &&
      y < r.bounds.y + r.bounds.h,
  );
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
    const pattern = ROOM_PATTERN[room.id] ?? 'none';
    for (let py = 0; py < h; py += FLOOR_PATCH) {
      for (let px = 0; px < w; px += FLOOR_PATCH) {
        const lines = floorLines(
          pattern,
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
  const windows: [number, number, number][] = [
    [14, 1.03, 0],
    [20, 1.03, 0],
    [33, 1.03, 0],
    [36, 1.03, 0],
    [1.03, 15, Math.PI / 2],
    [1.03, 25, Math.PI / 2],
    [46.97, 17, -Math.PI / 2],
    [46.97, 27, -Math.PI / 2],
  ];
  for (const [x, z, rot] of windows) {
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
  key: PropKey;
  x: number;
  z: number;
  rot: number;
}

/** Hand-placed furniture (cell-centre coords). 'T' cells get a room-matched prop on top. */
const FURNITURE: Placement[] = [
  // Kinderzimmer
  { key: 'bed', x: 2.5, z: 13.6, rot: Math.PI / 2 },
  { key: 'rug', x: 8, z: 23.5, rot: 0 },
  { key: 'cushion', x: 13.5, z: 29.3, rot: 0.4 },
  { key: 'box', x: 14.5, z: 22.5, rot: 0.2 },
  // Flur
  { key: 'plant', x: 29.5, z: 29.4, rot: 0 },
  { key: 'rug', x: 24, z: 20, rot: Math.PI / 2 },
  // Küche
  { key: 'fridge', x: 46.3, z: 13, rot: -Math.PI / 2 },
  { key: 'kitchenCabinet', x: 38, z: 12.6, rot: 0 },
  { key: 'kitchenCabinet', x: 40, z: 12.6, rot: 0 },
  { key: 'chair', x: 42.7, z: 19.5, rot: -Math.PI / 2 },
  { key: 'chair', x: 39.3, z: 19.5, rot: Math.PI / 2 },
  // Wohnzimmer
  { key: 'bookcase', x: 9.5, z: 1.5, rot: 0 },
  { key: 'tvCabinet', x: 27.5, z: 1.5, rot: 0 },
  { key: 'rug', x: 27.5, z: 4.5, rot: 0 },
  { key: 'plant', x: 38.6, z: 9.6, rot: 0 },
];

const T_CELL_PROPS: Record<string, PropKey[]> = {
  kinderzimmer: ['box', 'toyBear', 'box'],
  flur: ['coatRack'],
  kueche: ['table', 'chair'],
  wohnzimmer: ['floorLamp', 'sofa', 'radio'],
};

/** Flat props the chicken may walk over. */
const WALKABLE: ReadonlySet<PropKey> = new Set<PropKey>(['rug', 'cushion']);

export interface PlacedProp {
  key: PropKey;
  label: string;
  object: THREE.Group;
}

/** Load and place all props, register them as revealables, mark their cells blocked. */
export async function placeProps(
  map: HouseMap,
  build: HouseBuild,
  reveal: RevealSystem,
): Promise<PlacedProp[]> {
  const placements: Placement[] = [...FURNITURE];
  const used: Record<string, number> = {};
  map.cells.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c !== GridCell.Interactable) return;
      const room = roomOf(map, x, y);
      const list = T_CELL_PROPS[room?.id ?? ''] ?? ['radio'];
      const i = used[room?.id ?? ''] ?? 0;
      used[room?.id ?? ''] = i + 1;
      const key = list[i % list.length] ?? 'radio';
      placements.push({ key, x: x + 0.5, z: y + 0.5, rot: key === 'sofa' ? Math.PI : 0 });
    }),
  );

  const loaded = await Promise.all(placements.map((p) => loadProp(p.key)));
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
    out.push({ key: p.key, label: PROP_INFO[p.key].label, object });
    if (WALKABLE.has(p.key)) return;
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
