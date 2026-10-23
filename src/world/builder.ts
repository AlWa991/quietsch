import * as THREE from 'three';
import { GridCell, type HouseMap } from '@/core/types';

export interface WallBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** AABBs (cell units) of every wall cell, for the future collision system. */
export const wallBoxes: WallBox[] = [];

const WALL_HEIGHT = 2.4;

/** Build placeholder geometry: one floor plane plus a box per wall cell. 1 cell = 1 m, y is up. */
export function buildHouse(map: HouseMap): THREE.Group {
  const group = new THREE.Group();
  wallBoxes.length = 0;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(map.width, map.height),
    new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(map.width / 2, 0, map.height / 2);
  group.add(floor);

  const walls: { x: number; y: number }[] = [];
  map.cells.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c === GridCell.Wall) {
        walls.push({ x, y });
        wallBoxes.push({ x, y, w: 1, h: 1 });
      }
    }),
  );

  const instanced = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, WALL_HEIGHT, 1),
    new THREE.MeshStandardMaterial({ color: 0x4a4e57, roughness: 0.9 }),
    walls.length,
  );
  const m = new THREE.Matrix4();
  walls.forEach((w, i) => {
    m.setPosition(w.x + 0.5, WALL_HEIGHT / 2, w.y + 0.5);
    instanced.setMatrixAt(i, m);
  });
  group.add(instanced);

  return group;
}
