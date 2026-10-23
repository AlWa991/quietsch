import type { GameEvent, GameState } from '@/core/types';
import { createMissions } from '@/core/missions';

type EventType = GameEvent['type'];
type Handler<T extends EventType> = (event: Extract<GameEvent, { type: T }>) => void;

export interface Store {
  get(): GameState;
  set(partial: Partial<GameState>): void;
  /** Subscribe to a game event type. Returns an unsubscribe function. */
  on<T extends EventType>(type: T, handler: Handler<T>): () => void;
  emit(event: GameEvent): void;
}

export function createStore(initial: GameState): Store {
  let state = initial;
  const handlers = new Map<EventType, Set<(event: GameEvent) => void>>();

  return {
    get: () => state,
    set(partial) {
      state = { ...state, ...partial };
    },
    on(type, handler) {
      const set = handlers.get(type) ?? new Set();
      const wrapped = handler as (event: GameEvent) => void;
      set.add(wrapped);
      handlers.set(type, set);
      return () => set.delete(wrapped);
    },
    emit(event) {
      handlers.get(event.type)?.forEach((h) => h(event));
    },
  };
}

export function initialGameState(rand: () => number = Math.random): GameState {
  return {
    feathers: 0,
    ghostlights: 0,
    hearts: 3,
    maxHearts: 3,
    xp: 0,
    rank: 1,
    stars: {},
    upgrades: {},
    hats: [],
    hat: null,
    locksOpened: 0,
    flags: {},
    feathersEarned: 0,
    time: 0,
    rooms: {},
    missions: createMissions(rand),
  };
}
