import { describe, expect, it } from 'vitest';
import { parseHouseMap } from '@/core/grid';
import { GridCell } from '@/core/types';
import { HOUSE_ASCII, HOUSE_ROOMS } from '@/world/house-map';
import { pickCornerCells } from '@/world/halloween-props';

describe('halloween', () => {
  it('picks only walkable non-door floor cells inside their room', () => {
    const map = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);
    const cells = pickCornerCells(map, 2);
    expect(cells.length).toBeGreaterThanOrEqual(HOUSE_ROOMS.length);
    for (const c of cells) {
      expect(map.cells[c.y]?.[c.x]).toBe(GridCell.Floor);
      const b = HOUSE_ROOMS.find((r) => r.id === c.roomId)?.bounds;
      expect(b && c.x >= b.x && c.x < b.x + b.w && c.y >= b.y && c.y < b.y + b.h).toBe(true);
    }
  });
});
