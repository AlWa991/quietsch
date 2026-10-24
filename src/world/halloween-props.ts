import * as THREE from 'three';
import { GridCell, type HouseMap } from '@/core/types';

export interface CornerCell {
  x: number;
  y: number;
  roomId: string;
}

const WALL_H = 1.5;
const R = 0.3;

function cellAt(map: HouseMap, x: number, y: number): GridCell | undefined {
  return map.cells[y]?.[x];
}

/**
 * Picks up to `n` plain floor cells per room: next to a wall, never next to a door or hollow wall,
 * closest to the room corners and spread apart. Only '.' cells qualify (walkable, no door/furniture).
 */
export function pickCornerCells(map: HouseMap, n: number): CornerCell[] {
  const out: CornerCell[] = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (const room of map.rooms) {
    const b = room.bounds;
    const cands: { x: number; y: number; score: number }[] = [];
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (cellAt(map, x, y) !== GridCell.Floor) continue;
        let wall = false;
        let door = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const c = cellAt(map, x + dx, y + dy);
            if (c === GridCell.Door || c === GridCell.Hollow) door = true;
          }
        }
        for (const [dx, dy] of dirs) if (cellAt(map, x + dx, y + dy) === GridCell.Wall) wall = true;
        if (!wall || door) continue;
        const cx = Math.min(x - b.x, b.x + b.w - 1 - x);
        const cy = Math.min(y - b.y, b.y + b.h - 1 - y);
        cands.push({ x, y, score: cx + cy });
      }
    }
    cands.sort((a, c) => a.score - c.score);
    const picked: { x: number; y: number }[] = [];
    for (const c of cands) {
      if (picked.length >= n) break;
      if (picked.some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 6)) continue;
      picked.push(c);
      out.push({ x: c.x, y: c.y, roomId: room.id });
    }
  }
  return out;
}

function triGeo(v: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

export function addHalloweenDressing(
  scene: THREE.Scene,
  map: HouseMap,
): { update(dt: number): void } {
  const group = new THREE.Group();
  group.name = 'halloween';

  const bodyGeo = new THREE.SphereGeometry(R, 14, 10);
  bodyGeo.scale(1, 0.82, 1);
  const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.12, 6);
  const eyeGeo = triGeo([-0.06, 0, 0, 0.06, 0, 0, 0, 0.09, 0]);
  const mouthGeo = triGeo([-0.15, 0, 0, 0.15, 0, 0, 0, -0.1, 0]);
  const pumpkinMat = new THREE.MeshStandardMaterial({
    color: 0xff7a1a,
    emissive: 0x602000,
    roughness: 0.7,
  });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f6b2a, roughness: 0.9 });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffa030,
    emissiveIntensity: 1,
    side: THREE.DoubleSide,
  });

  const lights: THREE.PointLight[] = [];
  const phases: number[] = [];

  for (const c of pickCornerCells(map, 2)) {
    const room = map.rooms.find((r) => r.id === c.roomId);
    if (!room) continue;
    const p = new THREE.Group();
    p.position.set(c.x + 0.5, R * 0.82, c.y + 0.5);
    const a = new THREE.Mesh(bodyGeo, pumpkinMat);
    const b = new THREE.Mesh(bodyGeo, pumpkinMat);
    b.rotation.y = Math.PI / 8;
    b.scale.set(0.82, 1, 0.82);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = R * 0.82;
    p.add(a, b, stem);
    const e1 = new THREE.Mesh(eyeGeo, faceMat);
    e1.position.set(-0.1, 0.09, R * 0.98);
    const e2 = new THREE.Mesh(eyeGeo, faceMat);
    e2.position.set(0.1, 0.09, R * 0.98);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.position.set(0, -0.05, R * 0.98);
    p.add(e1, e2, mouth);
    const bx = room.bounds.x + room.bounds.w / 2;
    const bz = room.bounds.y + room.bounds.h / 2;
    p.rotation.y = Math.atan2(bx - (c.x + 0.5), bz - (c.y + 0.5));
    const light = new THREE.PointLight(0xff7a1a, 1.2, 4);
    light.position.set(0, 0.15, 0.2);
    p.add(light);
    lights.push(light);
    phases.push(lights.length * 1.7);
    group.add(p);
  }

  // Cobwebs: two shared triangles per upper corner, mirrored by scale.
  const webGeoA = triGeo([0, 0, 0, 1, 0, 0, 0, -0.5, 0.7]);
  const webGeoB = triGeo([0, 0, 0, 0, 0, 1, 0.7, -0.5, 0]);
  const webMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const room of map.rooms) {
    const b = room.bounds;
    const corners: [number, number, number, number][] = [
      [b.x, b.y, 1, 1],
      [b.x + b.w, b.y + b.h, -1, -1],
    ];
    for (const [cx, cz, sx, sz] of corners) {
      for (const g of [webGeoA, webGeoB]) {
        const m = new THREE.Mesh(g, webMat);
        m.position.set(cx, WALL_H - 0.02, cz);
        m.scale.set(sx, 1, sz);
        group.add(m);
      }
    }
  }

  // Candle next to the Korb.
  let korb: { x: number; y: number } | null = null;
  for (let y = 0; y < map.height && !korb; y++) {
    const x = map.cells[y]?.indexOf(GridCell.Korb) ?? -1;
    if (x >= 0) korb = { x, y };
  }
  let candleLight: THREE.PointLight | null = null;
  if (korb) {
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2ead0, emissive: 0x332a10 }),
    );
    candle.position.set(korb.x + 1.1, 0.11, korb.y + 0.5);
    candleLight = new THREE.PointLight(0xffd040, 0.5, 2.5);
    candleLight.position.set(korb.x + 1.1, 0.3, korb.y + 0.5);
    group.add(candle, candleLight);
  }

  scene.add(group);
  let t = 0;
  return {
    update(dt: number): void {
      t += dt;
      for (let i = 0; i < lights.length; i++) {
        const ph = phases[i] ?? 0;
        const l = lights[i];
        if (l) {
          l.intensity =
            1.2 * (0.82 + 0.12 * Math.sin(t * 9 + ph) + 0.06 * Math.sin(t * 23 + ph * 2));
        }
      }
      if (candleLight) candleLight.intensity = 0.5 * (0.85 + 0.15 * Math.sin(t * 13));
    },
  };
}
