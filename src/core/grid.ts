import { GridCell, type HouseMap, type RoomDef } from './types';

const VALID = new Set<string>(Object.values(GridCell));

/** Parse ASCII rows into a HouseMap. Rows shorter than the widest row are padded with void. */
export function parseHouseMap(ascii: string[], rooms: RoomDef[]): HouseMap {
  const width = Math.max(0, ...ascii.map((r) => r.length));
  const cells = ascii.map((row, y) =>
    Array.from(row.padEnd(width, ' ')).map((ch, x) => {
      if (!VALID.has(ch)) throw new Error(`Invalid map character '${ch}' at (${x},${y})`);
      return ch as GridCell;
    }),
  );
  return { width, height: ascii.length, cells, rooms };
}

/** Floor-like cells the chicken can stand on. Out of bounds, walls and void are blocked. */
export function isWalkable(map: HouseMap, x: number, y: number): boolean {
  const cell = map.cells[Math.floor(y)]?.[Math.floor(x)];
  return cell !== undefined && cell !== GridCell.Wall && cell !== GridCell.Void;
}

export function cellsOfType(map: HouseMap, type: GridCell): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  map.cells.forEach((row, y) => row.forEach((c, x) => c === type && out.push({ x, y })));
  return out;
}
