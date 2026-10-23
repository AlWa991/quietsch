import { describe, expect, it } from 'vitest';
import {
  CLOCK_GOAL,
  clockScream,
  createMissions,
  doneCount,
  flipFuse,
  forceComplete,
  inLightningWindow,
  missionProgress,
  objectiveText,
  openBox,
  openDrawer,
} from '@/core/missions';

describe('echo mission', () => {
  it('picks the answer box from rand and never out of range', () => {
    expect(createMissions(() => 0).echo.answer).toBe(0);
    expect(createMissions(() => 0.5).echo.answer).toBe(3);
    expect(createMissions(() => 0.999999).echo.answer).toBe(5);
    expect(createMissions(() => 1).echo.answer).toBe(5);
  });

  it('openBox: wrong, then key, then empty', () => {
    const m = createMissions(() => 0.5); // answer 3
    expect(openBox(m, 0)).toBe('wrong');
    expect(openBox(m, 0)).toBe('empty');
    expect(openBox(m, 3)).toBe('key');
    expect(m.echo.done).toBe(true);
    expect(openBox(m, 1)).toBe('empty');
  });

  it('ignores out-of-range indices', () => {
    const m = createMissions(() => 0);
    expect(openBox(m, -1)).toBe('empty');
    expect(openBox(m, 6)).toBe('empty');
  });
});

describe('jaeger mission', () => {
  it('drawer is dark before power and gives the flashlight after', () => {
    const m = createMissions(() => 0);
    expect(openDrawer(m)).toBe('dark');
    expect(flipFuse(m)).toBe('power-on');
    expect(flipFuse(m)).toBe('already');
    expect(openDrawer(m)).toBe('flashlight');
    expect(m.jaeger.done).toBe(true);
    expect(openDrawer(m)).toBe('empty');
  });

  it('objective text switches after power', () => {
    const m = createMissions(() => 0);
    expect(objectiveText(m, 'jaeger')).toBe('Strom wieder an.');
    flipFuse(m);
    expect(objectiveText(m, 'jaeger')).toBe('Hol die Taschenlampe aus der Schublade.');
    expect(objectiveText(m, 'echo')).toBe('Finde den Schlüssel in der richtigen Kiste.');
  });
});

describe('uhr mission', () => {
  it('lightning window is +-1 s inclusive', () => {
    expect(inLightningWindow(10, 10.9)).toBe(true);
    expect(inLightningWindow(10, 9)).toBe(true);
    expect(inLightningWindow(10, 11.01)).toBe(false);
    expect(inLightningWindow(10, Number.NaN)).toBe(false);
  });

  it('counts three hits then opens, misses do not count', () => {
    const m = createMissions(() => 0);
    expect(clockScream(m, false)).toBe('miss');
    expect(clockScream(m, true)).toBe('count');
    expect(clockScream(m, true)).toBe('count');
    expect(clockScream(m, true)).toBe('open');
    expect(m.uhr.count).toBe(CLOCK_GOAL);
    expect(clockScream(m, true)).toBe('done');
    expect(m.uhr.count).toBe(CLOCK_GOAL);
  });
});

describe('progress helpers', () => {
  it('missionProgress and doneCount follow the state', () => {
    const m = createMissions(() => 0);
    expect(missionProgress(m, 'echo')).toEqual({ progress: 0, goal: 1 });
    expect(missionProgress(m, 'jaeger')).toEqual({ progress: 0, goal: 2 });
    flipFuse(m);
    expect(missionProgress(m, 'jaeger')).toEqual({ progress: 1, goal: 2 });
    clockScream(m, true);
    expect(missionProgress(m, 'uhr')).toEqual({ progress: 1, goal: 3 });
    expect(doneCount(m)).toBe(0);
  });

  it('forceComplete finishes each mission', () => {
    const m = createMissions(() => 0.2);
    forceComplete(m, 'echo');
    expect(m.echo.done && m.echo.opened[m.echo.answer]).toBe(true);
    forceComplete(m, 'jaeger');
    expect(m.jaeger).toEqual({ done: true, power: true, flashlight: true });
    expect(doneCount(m)).toBe(2);
    forceComplete(m, 'uhr');
    expect(m.uhr).toEqual({ done: true, count: 3 });
    expect(doneCount(m)).toBe(3);
  });
});
