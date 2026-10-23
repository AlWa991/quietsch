import { describe, expect, it } from 'vitest';
import {
  FINALE_CARDS,
  canOpenDoor,
  canTransition,
  doorbellDue,
  countLocks,
  endingFor,
  formatTime,
  lockText,
  openLock,
  takeCard,
  type StoryState,
} from '@/core/story';

const fresh = (): StoryState => ({ flags: {}, locksOpened: 0 });

describe('cards', () => {
  it('takeCard returns true only the first time per card', () => {
    const s = fresh();
    expect(takeCard(s, 'intro')).toBe(true);
    expect(takeCard(s, 'intro')).toBe(false);
    expect(takeCard(s, 'drawing')).toBe(true);
  });

  it('finale sequence is twist3 then finale', () => {
    expect(FINALE_CARDS).toEqual(['twist3', 'finale']);
  });
});

describe('locks', () => {
  it('opens locks 1..3 once and tracks locksOpened', () => {
    const s = fresh();
    expect(openLock(s, 2)).toBe(true);
    expect(openLock(s, 2)).toBe(false);
    expect(s.locksOpened).toBe(1);
    expect(countLocks(s)).toBe(1);
  });

  it('ignores invalid lock numbers', () => {
    const s = fresh();
    for (const n of [0, 4, -1, 1.5, Number.NaN]) expect(openLock(s, n)).toBe(false);
    expect(countLocks(s)).toBe(0);
    expect(s.locksOpened).toBe(0);
  });

  it('door opens only with all three locks; text counts them', () => {
    const s = fresh();
    expect(lockText(s)).toBe('Schloss 0 von 3 offen');
    openLock(s, 1);
    openLock(s, 3);
    expect(canOpenDoor(s)).toBe(false);
    openLock(s, 2);
    expect(lockText(s)).toBe('Schloss 3 von 3 offen');
    expect(canOpenDoor(s)).toBe(true);
    const t = fresh();
    openLock(t, 1);
    openLock(t, 2);
    expect(lockText(t)).toBe('Schloss 2 von 3 offen');
  });
});

describe('endings and phases', () => {
  it('scream -> A, silent -> B', () => {
    expect(endingFor('scream')).toBe('A');
    expect(endingFor('silent')).toBe('B');
  });

  it('allows only the forward chain title -> play -> finale -> choice -> ending', () => {
    expect(canTransition('title', 'play')).toBe(true);
    expect(canTransition('play', 'finale')).toBe(true);
    expect(canTransition('finale', 'choice')).toBe(true);
    expect(canTransition('choice', 'ending')).toBe(true);
    expect(canTransition('play', 'ending')).toBe(false);
    expect(canTransition('ending', 'title')).toBe(false);
    expect(canTransition('title', 'title')).toBe(false);
  });

  it('formatTime renders m:ss and clamps negatives', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('doorbell', () => {
  it('rings once at 120 s or with the 2nd lock, whichever comes first', () => {
    expect(doorbellDue(119, 1, false)).toBe(false);
    expect(doorbellDue(120, 0, false)).toBe(true);
    expect(doorbellDue(30, 2, false)).toBe(true);
    expect(doorbellDue(500, 3, true)).toBe(false);
  });
});
