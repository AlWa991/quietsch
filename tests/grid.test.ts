import { describe, expect, it } from 'vitest';
import { cellsOfType, isWalkable, parseHouseMap } from '@/core/grid';
import { GridCell } from '@/core/types';
import { HOUSE_ASCII, HOUSE_ROOMS } from '@/world/house-map';

const map = parseHouseMap(['###', '#C.', '#D#'], []);

describe('grid', () => {
  it('parses dimensions and cell types', () => {
    expect(map.width).toBe(3);
    expect(map.height).toBe(3);
    expect(map.cells[1]?.[1]).toBe(GridCell.ChickenSpawn);
  });

  it('knows walkable cells and treats out of bounds as blocked', () => {
    expect(isWalkable(map, 1, 1)).toBe(true);
    expect(isWalkable(map, 1, 2)).toBe(true);
    expect(isWalkable(map, 0, 0)).toBe(false);
    expect(isWalkable(map, -1, 1)).toBe(false);
  });

  it('finds cells of a type in the real house map', () => {
    const house = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);
    expect(house.width).toBe(57);
    expect(house.height).toBe(38);
    expect(cellsOfType(house, GridCell.ChickenSpawn)).toHaveLength(1);
    expect(cellsOfType(house, GridCell.Korb)).toHaveLength(1);
  });
});
