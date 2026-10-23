// Pure story rules (no three, no DOM): cards shown once, front-door locks, finale and endings.

export type CardId =
  | 'intro'
  | 'drawing'
  | 'calendar'
  | 'twist1'
  | 'twist2'
  | 'window'
  | 'clock'
  | 'panic'
  | 'twist3'
  | 'finale'
  | 'bello';

export type EndingId = 'A' | 'B';

export type Phase = 'title' | 'play' | 'finale' | 'choice' | 'ending';

export const LOCK_COUNT = 3;

/** Story slice of the game state; `flags` is shared with other systems and persisted. */
export interface StoryState {
  flags: Record<string, boolean>;
  locksOpened: number;
}

const cardFlag = (id: CardId): string => `card:${id}`;
const lockFlag = (n: number): string => `lock:${n}`;

export function cardSeen(s: StoryState, id: CardId): boolean {
  return s.flags[cardFlag(id)] === true;
}

/** Mark a card as seen. Returns true only the first time (caller shows it then). Mutates `s`. */
export function takeCard(s: StoryState, id: CardId): boolean {
  if (cardSeen(s, id)) return false;
  s.flags[cardFlag(id)] = true;
  return true;
}

/** Repeatable cards (Panik) are not tracked. */
export const REPEATABLE_CARDS: ReadonlySet<CardId> = new Set<CardId>(['panic']);

export function isLockOpen(s: StoryState, n: number): boolean {
  return s.flags[lockFlag(n)] === true;
}

/** Open lock `n` (1..3). Returns true if it was newly opened. Mutates `s`. */
export function openLock(s: StoryState, n: number): boolean {
  if (!Number.isInteger(n) || n < 1 || n > LOCK_COUNT || isLockOpen(s, n)) return false;
  s.flags[lockFlag(n)] = true;
  s.locksOpened = countLocks(s);
  return true;
}

export function countLocks(s: StoryState): number {
  let n = 0;
  for (let i = 1; i <= LOCK_COUNT; i++) if (isLockOpen(s, i)) n++;
  return n;
}

export function canOpenDoor(s: StoryState): boolean {
  return countLocks(s) === LOCK_COUNT;
}

/** Toast text for door progress (GDD: "Schloss 1 von 3 offen"). */
export function lockText(s: StoryState): string {
  return `Schloss ${countLocks(s)} von ${LOCK_COUNT} offen`;
}

/** Cards of the finale sequence, in order. */
export const FINALE_CARDS: readonly CardId[] = ['twist3', 'finale'];

/** Choice in the finale: screaming opens the door into the storm (A), silence keeps you in (B). */
export function endingFor(choice: 'scream' | 'silent'): EndingId {
  return choice === 'scream' ? 'A' : 'B';
}

/** Allowed phase transitions; anything else is ignored by the game. */
const NEXT: Record<Phase, readonly Phase[]> = {
  title: ['play'],
  play: ['finale'],
  finale: ['choice'],
  choice: ['ending'],
  ending: [],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return NEXT[from].includes(to);
}

/** Format seconds as m:ss for results. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
