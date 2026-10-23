import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  deserialize,
  loadGame,
  saveGame,
  serialize,
  type SaveStorage,
} from '@/core/save';
import { initialGameState } from '@/ui/store';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const defaults = () => initialGameState(() => 0.5);

function wrap(state: unknown, v: number = SAVE_VERSION): string {
  return JSON.stringify({ v, savedAt: 'x', state });
}

describe('serialize / deserialize', () => {
  it('roundtrips a modified state', () => {
    const s = defaults();
    s.feathers = 123;
    s.xp = 90;
    s.rank = 2;
    s.upgrades = { lunge: 1 };
    s.hats = ['krone'];
    s.hat = 'krone';
    s.locksOpened = 2;
    s.flags = { 'lock:1': true, 'lock:2': true };
    s.missions.echo.done = true;
    s.missions.uhr.count = 2;
    s.rooms = { kueche: { time: 12, caught: 1, done: true } };
    const back = deserialize(serialize(s), defaults());
    expect(back).toEqual(s);
  });

  it('returns null for wrong version, corrupt JSON and empty input', () => {
    expect(deserialize(wrap(defaults(), SAVE_VERSION + 1), defaults())).toBeNull();
    expect(deserialize('{not json', defaults())).toBeNull();
    expect(deserialize(null, defaults())).toBeNull();
    expect(deserialize('', defaults())).toBeNull();
    expect(deserialize('[1,2]', defaults())).toBeNull();
    expect(deserialize(JSON.stringify({ v: SAVE_VERSION }), defaults())).toBeNull();
  });

  it('falls back to defaults for missing fields', () => {
    const d = defaults();
    const back = deserialize(wrap({ feathers: 7 }), d);
    expect(back).not.toBeNull();
    expect(back?.feathers).toBe(7);
    expect(back?.maxHearts).toBe(3);
    expect(back?.hearts).toBe(3);
    expect(back?.rank).toBe(1);
    expect(back?.hats).toEqual([]);
    expect(back?.missions).toEqual(d.missions);
  });

  it('drops a worn hat that is not owned', () => {
    const back = deserialize(wrap({ hat: 'krone', hats: ['kuerbis'] }), defaults());
    expect(back?.hat).toBeNull();
    expect(back?.hats).toEqual(['kuerbis']);
  });

  it('clamps hearts to maxHearts and locks to 0..3', () => {
    const back = deserialize(wrap({ maxHearts: 3, hearts: 9, locksOpened: 7 }), defaults());
    expect(back?.hearts).toBe(3);
    expect(back?.locksOpened).toBe(3);
  });

  it('ignores wrongly typed values instead of crashing', () => {
    const back = deserialize(
      wrap({ feathers: 'many', upgrades: { a: 'x', b: 2 }, hats: [1, 'krone'] }),
      defaults(),
    );
    expect(back?.feathers).toBe(0);
    expect(back?.upgrades).toEqual({ b: 2 });
    expect(back?.hats).toEqual(['krone']);
  });
});

describe('storage helpers', () => {
  it('saveGame / loadGame / clearSave work against in-memory storage', () => {
    const st = memoryStorage();
    expect(loadGame(st, defaults())).toBeNull();
    const s = defaults();
    s.feathers = 55;
    expect(saveGame(st, s)).toBe(true);
    expect(st.data.has(SAVE_KEY)).toBe(true);
    expect(loadGame(st, defaults())?.feathers).toBe(55);
    clearSave(st);
    expect(st.data.has(SAVE_KEY)).toBe(false);
    expect(loadGame(st, defaults())).toBeNull();
  });

  it('saveGame returns false when setItem throws', () => {
    const st: SaveStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    expect(saveGame(st, defaults())).toBe(false);
  });

  it('loadGame and clearSave survive a throwing storage', () => {
    const st: SaveStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadGame(st, defaults())).toBeNull();
    expect(() => clearSave(st)).not.toThrow();
  });
});
