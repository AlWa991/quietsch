import type { RoomDef } from '@/core/types';

/**
 * ASCII floor plan, 57x38 cells, 1 cell = 1 m. See GridCell in core/types.ts for the legend.
 * Rows 0-31 are the house; rows 32-37 are the secret Keller below the Flur, reached through
 * the hollow wall 'H' in the south wall. The Dachboden (x >= 49) is a separate island reached
 * by the ladder in the Flur (teleport = climbing).
 */
export const HOUSE_ASCII: string[] = [
  '       ##################################       ',
  '       #................T.........T.....#        ########',
  '       #................................#        #......#',
  '       #.....S..........................#        #.T..T.#',
  '       #................................#        #......#',
  '       #........L.......................#        #......#',
  '       #................................#        #......#',
  '       #..............................S.#        #.....T#',
  '       #................................#        #T.....#',
  '       #................................#        ########',
  '       #................................#       ',
  '#######################DD#######################',
  '#...............#..........T...#..........T....#',
  '#...............#..............#...............#',
  '#............T..#..............#.............L.#',
  '#...S...........#..............#...............#',
  '#...............#..............#...............#',
  '#...............#..............#...............#',
  '#.........T.....D..............D...............#',
  '#...T...........#..............#...............#',
  '#...............#..............#.......S.......#',
  '#T..............#..............#...............#',
  '#...............#.....L........#...............#',
  '#...............#..............#...............#',
  '#............T..#..............#...............#',
  '#...............#..............#T..............#',
  '#.........S.....#..............#...............#',
  '#...............#........C.....#...............#',
  '#..T............#......K.......#...............#',
  '#.......T.......#..............#..............T#',
  '#...............#..........T...#...............#',
  '###################H############################',
  '                 #......#                       ',
  '                 #.....T#                       ',
  '                 #......#                       ',
  '                 #...T..#                       ',
  '                 #S.....#                       ',
  '                 ########                       ',
];

/** Room bounds in cell coordinates (interior floor only). */
export const HOUSE_ROOMS: RoomDef[] = [
  { id: 'flur', name: 'Flur', bounds: { x: 17, y: 12, w: 14, h: 19 } },
  { id: 'kinderzimmer', name: 'Kinderzimmer', bounds: { x: 1, y: 12, w: 15, h: 19 } },
  { id: 'kueche', name: 'Küche', bounds: { x: 32, y: 12, w: 15, h: 19 } },
  { id: 'wohnzimmer', name: 'Wohnzimmer', bounds: { x: 8, y: 1, w: 32, h: 10 } },
  { id: 'keller', name: 'Keller', bounds: { x: 18, y: 32, w: 6, h: 5 } },
  { id: 'dachboden', name: 'Dachboden', bounds: { x: 50, y: 2, w: 6, h: 7 } },
];

/** Every wall from this column on belongs to the Dachboden and stays low (diorama view). */
export const ATTIC_MIN_X = 49;

/** Where the chicken arrives after climbing up / down. */
export const ATTIC_ARRIVAL = { x: 51.5, z: 7.2 } as const;
export const LADDER_ARRIVAL = { x: 27.5, z: 13.6 } as const;

/** Horizontal wall runs on this row and below are low cutaways (diorama view from the south). */
export const CUTAWAY_ROW = 31;

/** The hollow wall cell between Flur and Keller. */
export const HOLLOW_CELL = { x: 19, y: 31 } as const;

export type InteractableKind =
  | 'toybox'
  | 'drawing'
  | 'fuse'
  | 'drawer'
  | 'calendar'
  | 'clock'
  | 'window'
  | 'frontdoor'
  | 'hollow'
  | 'donation'
  | 'chest'
  | 'ladder'
  | 'hatch'
  | 'collar'
  | 'dogbed';

export type WallSide = 'n' | 's' | 'e' | 'w';

/** One 'T' cell in HOUSE_ASCII. `wall` = wall the object is mounted on (none = free standing). */
export interface InteractableDef {
  id: string;
  kind: InteractableKind;
  room: string;
  cell: { x: number; y: number };
  wall?: WallSide;
  /** Toy box index 0..5 (Echo-Rätsel). */
  index?: number;
  /** Interaction reach in metres (default INTERACT_RADIUS). */
  reach?: number;
}

export const INTERACTABLES: InteractableDef[] = [
  { id: 'box-0', kind: 'toybox', room: 'kinderzimmer', cell: { x: 13, y: 14 }, index: 0 },
  { id: 'box-1', kind: 'toybox', room: 'kinderzimmer', cell: { x: 4, y: 19 }, index: 1 },
  { id: 'box-2', kind: 'toybox', room: 'kinderzimmer', cell: { x: 10, y: 18 }, index: 2 },
  { id: 'box-3', kind: 'toybox', room: 'kinderzimmer', cell: { x: 13, y: 24 }, index: 3 },
  { id: 'box-4', kind: 'toybox', room: 'kinderzimmer', cell: { x: 3, y: 28 }, index: 4 },
  { id: 'box-5', kind: 'toybox', room: 'kinderzimmer', cell: { x: 8, y: 29 }, index: 5 },
  { id: 'drawing', kind: 'drawing', room: 'kinderzimmer', cell: { x: 1, y: 21 }, wall: 'w' },
  { id: 'fuse', kind: 'fuse', room: 'kueche', cell: { x: 46, y: 29 }, wall: 'e' },
  { id: 'drawer', kind: 'drawer', room: 'kueche', cell: { x: 42, y: 12 }, wall: 'n' },
  { id: 'calendar', kind: 'calendar', room: 'kueche', cell: { x: 32, y: 25 }, wall: 'w' },
  { id: 'clock', kind: 'clock', room: 'wohnzimmer', cell: { x: 24, y: 1 }, wall: 'n' },
  { id: 'window', kind: 'window', room: 'wohnzimmer', cell: { x: 34, y: 1 }, wall: 'n' },
  {
    id: 'frontdoor',
    kind: 'frontdoor',
    room: 'flur',
    cell: { x: 27, y: 30 },
    wall: 's',
    reach: 2.6,
  },
  { id: 'hollow', kind: 'hollow', room: 'flur', cell: HOLLOW_CELL },
  { id: 'donation', kind: 'donation', room: 'keller', cell: { x: 21, y: 35 } },
  { id: 'keller-chest', kind: 'chest', room: 'keller', cell: { x: 23, y: 33 } },
  { id: 'ladder', kind: 'ladder', room: 'flur', cell: { x: 27, y: 12 }, wall: 'n' },
  { id: 'hatch', kind: 'hatch', room: 'dachboden', cell: { x: 50, y: 8 } },
  { id: 'collar', kind: 'collar', room: 'dachboden', cell: { x: 54, y: 3 } },
  { id: 'dogbed', kind: 'dogbed', room: 'dachboden', cell: { x: 51, y: 3 } },
  { id: 'attic-chest', kind: 'chest', room: 'dachboden', cell: { x: 55, y: 7 } },
];

/** Sofa centres in the Wohnzimmer; each hides a hand. */
export const SOFA_SPOTS: { x: number; z: number }[] = [
  { x: 19.5, z: 6 },
  { x: 29.5, z: 6 },
];

/** Room id containing world point (x, z), or null (walls, doors). Allocation-free. */
export function roomIdAt(x: number, z: number): string | null {
  for (const r of HOUSE_ROOMS) {
    const b = r.bounds;
    if (x >= b.x && x < b.x + b.w && z >= b.y && z < b.y + b.h) return r.id;
  }
  return null;
}

export function roomBounds(id: string): RoomDef['bounds'] | undefined {
  return HOUSE_ROOMS.find((r) => r.id === id)?.bounds;
}
