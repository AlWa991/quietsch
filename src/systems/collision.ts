/** Grid collision: blocked cells vs. a circle (movement) or a square box (spawn checks). */
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

/** True if a circle of radius r at (x, z) overlaps no blocked cell. */
export function circleFree(grid: CollisionGrid, x: number, z: number, r: number): boolean {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const z0 = Math.floor(z - r);
  const z1 = Math.floor(z + r);
  const r2 = r * r;
  for (let cz = z0; cz <= z1; cz++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (!isBlocked(grid, cx, cz)) continue;
      const px = Math.max(cx, Math.min(x, cx + 1)) - x;
      const pz = Math.max(cz, Math.min(z, cz + 1)) - z;
      if (px * px + pz * pz < r2) return false;
    }
  }
  return true;
}

/** Push a circle out of every blocked cell it overlaps (closest-point normal). */
function depenetrate(grid: CollisionGrid, pos: { x: number; z: number }, r: number): void {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    const x0 = Math.floor(pos.x - r);
    const x1 = Math.floor(pos.x + r);
    const z0 = Math.floor(pos.z - r);
    const z1 = Math.floor(pos.z + r);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (!isBlocked(grid, cx, cz)) continue;
        const qx = Math.max(cx, Math.min(pos.x, cx + 1));
        const qz = Math.max(cz, Math.min(pos.z, cz + 1));
        const nx = pos.x - qx;
        const nz = pos.z - qz;
        const d2 = nx * nx + nz * nz;
        if (d2 >= r * r || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = r - d + 1e-4;
        pos.x += (nx / d) * push;
        pos.z += (nz / d) * push;
        moved = true;
      }
    }
    if (!moved) return;
  }
}

/**
 * Circle-vs-grid movement with wall sliding. Walls push the body out along the contact normal,
 * so it glides along walls and rounds corners instead of snagging on them (P7). Long moves are
 * sub-stepped so they never tunnel. Mutates and returns `pos`.
 */
export function moveAndSlide(
  grid: CollisionGrid,
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  r: number,
): { x: number; z: number } {
  const len = Math.hypot(dx, dz);
  if (len === 0) return pos;
  const steps = Math.max(1, Math.ceil(len / (r * 0.5)));
  const sx = dx / steps;
  const sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    const ox = pos.x;
    const oz = pos.z;
    pos.x += sx;
    pos.z += sz;
    depenetrate(grid, pos, r);
    // Centre ended inside a wall (should not happen with sub-steps): undo this step.
    if (isBlocked(grid, pos.x, pos.z) || !circleFree(grid, pos.x, pos.z, r * 0.98)) {
      pos.x = ox;
      pos.z = oz;
      // Fall back to per-axis sliding.
      if (circleFree(grid, ox + sx, oz, r)) pos.x = ox + sx;
      else if (circleFree(grid, ox, oz + sz, r)) pos.z = oz + sz;
    }
  }
  return pos;
}
