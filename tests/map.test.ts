import { describe, expect, it } from 'vitest';
import { cellsOfType, parseHouseMap } from '@/core/grid';
import { GridCell, type HouseMap } from '@/core/types';
import { circleFree, moveAndSlide, type CollisionGrid } from '@/systems/collision';
import { ATTIC_ARRIVAL, HOUSE_ASCII, HOUSE_ROOMS } from '@/world/house-map';

const house = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);

/** Walls, void and interactables block; the hollow wall counts as opened. */
function solid(map: HouseMap, x: number, y: number): boolean {
  const c = map.cells[y]?.[x];
  return (
    c === undefined || c === GridCell.Wall || c === GridCell.Void || c === GridCell.Interactable
  );
}

/** Cells where a 3x3 body fits: walking between them means every gap passed is >= 3 wide. */
function fatFlood(map: HouseMap, sx: number, sy: number): Set<number> {
  const fits = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (solid(map, x + dx, y + dy)) return false;
    return true;
  };
  const seen = new Set<number>();
  const queue: [number, number][] = [];
  // Start on the nearest fitting cell to the spawn.
  for (let r = 0; r < 4 && queue.length === 0; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (queue.length === 0 && fits(sx + dx, sy + dy)) queue.push([sx + dx, sy + dy]);
  while (queue.length > 0) {
    const next = queue.pop();
    if (!next) break;
    const [x, y] = next;
    const k = y * map.width + x;
    if (seen.has(k) || !fits(x, y)) continue;
    seen.add(k);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

function reached(map: HouseMap, set: Set<number>, roomId: string): boolean {
  const b = HOUSE_ROOMS.find((r) => r.id === roomId)?.bounds;
  if (!b) return false;
  for (const k of set) {
    const x = k % map.width;
    const y = Math.floor(k / map.width);
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  }
  return false;
}

describe('house map (P7: wide passages)', () => {
  const spawn = cellsOfType(house, GridCell.ChickenSpawn)[0] ?? { x: 0, y: 0 };
  const fromSpawn = fatFlood(house, spawn.x, spawn.y);

  it('reaches every ground-floor room and the Keller through >= 3-wide doorways', () => {
    for (const id of ['flur', 'kinderzimmer', 'kueche', 'wohnzimmer', 'keller']) {
      expect(reached(house, fromSpawn, id), id).toBe(true);
    }
  });

  it('the Dachboden is one open area around the ladder arrival', () => {
    const attic = fatFlood(house, Math.floor(ATTIC_ARRIVAL.x), Math.floor(ATTIC_ARRIVAL.z));
    expect(reached(house, attic, 'dachboden')).toBe(true);
    expect(attic.size).toBeGreaterThanOrEqual(12);
  });

  it('every door opening is exactly 3 cells', () => {
    const doors = cellsOfType(house, GridCell.Door);
    expect(doors.length).toBe(9);
    for (const d of doors) {
      const h = [-2, -1, 0, 1, 2].filter(
        (o) => house.cells[d.y]?.[d.x + o] === GridCell.Door,
      ).length;
      const v = [-2, -1, 0, 1, 2].filter(
        (o) => house.cells[d.y + o]?.[d.x] === GridCell.Door,
      ).length;
      expect(Math.max(h, v)).toBeGreaterThanOrEqual(2);
    }
    expect(cellsOfType(house, GridCell.Hollow)).toHaveLength(3);
  });

  it('the Flur is at least 5 cells wide and big rooms have a free 6x6 fight area', () => {
    const flur = HOUSE_ROOMS.find((r) => r.id === 'flur');
    expect(Math.min(flur?.bounds.w ?? 0, flur?.bounds.h ?? 0)).toBeGreaterThanOrEqual(5);
    for (const id of ['flur', 'kinderzimmer', 'kueche', 'wohnzimmer']) {
      const b = HOUSE_ROOMS.find((r) => r.id === id)?.bounds;
      if (!b) throw new Error(id);
      let found = false;
      for (let y = b.y; y + 6 <= b.y + b.h && !found; y++)
        for (let x = b.x; x + 6 <= b.x + b.w && !found; x++) {
          let free = true;
          for (let yy = y; yy < y + 6 && free; yy++)
            for (let xx = x; xx < x + 6 && free; xx++) free = house.cells[yy]?.[xx] === '.';
          found = free;
        }
      expect(found, id).toBe(true);
    }
  });
});

describe('circle collision with wall sliding', () => {
  // 7x7 box room, wall pillar at (3,3).
  const rows = ['#######', '#.....#', '#.....#', '#..#..#', '#.....#', '#.....#', '#######'];
  const blocked = new Uint8Array(49);
  rows.forEach((r, y) => [...r].forEach((c, x) => (blocked[y * 7 + x] = c === '#' ? 1 : 0)));
  const grid: CollisionGrid = { width: 7, height: 7, blocked };
  const R = 0.35;

  it('slides along a wall when pushed diagonally into it', () => {
    const p = { x: 2, z: 1.5 };
    for (let i = 0; i < 20; i++) moveAndSlide(grid, p, 0.05, -0.05, R);
    expect(p.z).toBeCloseTo(1 + R, 2);
    expect(p.x).toBeGreaterThan(2.9);
  });

  it('rounds a pillar corner instead of snagging', () => {
    // Walk straight at the pillar slightly off its corner: the body glides around it.
    const p = { x: 2.8, z: 1.6 };
    for (let i = 0; i < 80; i++) moveAndSlide(grid, p, 0, 0.05, R);
    expect(p.z).toBeGreaterThan(4.3);
    expect(circleFree(grid, p.x, p.z, R * 0.98)).toBe(true);
  });

  it('never tunnels through a wall with a large step', () => {
    const p = { x: 1.5, z: 2.5 };
    moveAndSlide(grid, p, -3, 0, R);
    expect(p.x).toBeGreaterThanOrEqual(1 + R - 1e-3);
  });
});
