/** Grid AABB collision: a square body of half-size `r` against blocked cells. */
export interface CollisionGrid {
  width: number;
  height: number;
  /** 1 = blocked, indexed y * width + x (y = world z). */
  blocked: Uint8Array;
}

export function isBlocked(grid: CollisionGrid, x: number, z: number): boolean {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  if (cx < 0 || cz < 0 || cx >= grid.width || cz >= grid.height) return true;
  return grid.blocked[cz * grid.width + cx] === 1;
}

/** True if a box centred at (x, z) with half-size r overlaps no blocked cell. */
export function boxFree(grid: CollisionGrid, x: number, z: number, r: number): boolean {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const z0 = Math.floor(z - r);
  const z1 = Math.floor(z + r);
  for (let cz = z0; cz <= z1; cz++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cz < 0 || cx >= grid.width || cz >= grid.height) return false;
      if (grid.blocked[cz * grid.width + cx] === 1) return false;
    }
  }
  return true;
}

/** Move per axis so the body slides along walls. Mutates and returns `pos`. */
export function moveAndSlide(
  grid: CollisionGrid,
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  r: number,
): { x: number; z: number } {
  if (dx !== 0 && boxFree(grid, pos.x + dx, pos.z, r)) pos.x += dx;
  if (dz !== 0 && boxFree(grid, pos.x, pos.z + dz, r)) pos.z += dz;
  return pos;
}
