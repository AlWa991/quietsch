// Pure mission rules (no three, no DOM). The mission system (systems/missions.ts) owns
// the scene side and calls these functions; all state lives in plain objects for saving.

export type MissionId = 'echo' | 'jaeger' | 'uhr';

export const MISSION_IDS: readonly MissionId[] = ['echo', 'jaeger', 'uhr'];

export const MISSION_ROOM: Record<MissionId, string> = {
  echo: 'kinderzimmer',
  jaeger: 'kueche',
  uhr: 'wohnzimmer',
};

/** Lock on the front door (1..3) each mission opens. */
export const MISSION_LOCK: Record<MissionId, 1 | 2 | 3> = { echo: 1, jaeger: 2, uhr: 3 };

/** Objective texts (GDD "Missionsziele"). */
export const MISSION_TEXT: Record<MissionId, string> = {
  echo: 'Finde den Schlüssel in der richtigen Kiste.',
  jaeger: 'Strom wieder an.',
  uhr: 'Schrei die Uhr 3× im Blitz an.',
};

export const ECHO_BOXES = 6;
export const CLOCK_GOAL = 3;
/** Scream must land within this many seconds of a lightning flash (before or after). */
export const CLOCK_WINDOW = 1;

export interface MissionsState {
  echo: {
    done: boolean;
    /** Index 0..ECHO_BOXES-1 of the box holding the key. */
    answer: number;
    /** Boxes already opened (wrong ones stay open and empty). */
    opened: boolean[];
  };
  jaeger: { done: boolean; power: boolean; flashlight: boolean };
  uhr: { done: boolean; count: number };
}

/** Fresh mission state. `rand` in [0, 1) picks the answering toy box. */
export function createMissions(rand: () => number): MissionsState {
  return {
    echo: {
      done: false,
      answer: Math.min(ECHO_BOXES - 1, Math.floor(rand() * ECHO_BOXES)),
      opened: Array.from({ length: ECHO_BOXES }, () => false),
    },
    jaeger: { done: false, power: false, flashlight: false },
    uhr: { done: false, count: 0 },
  };
}

export function isDone(m: MissionsState, id: MissionId): boolean {
  return m[id].done;
}

export function doneCount(m: MissionsState): number {
  return MISSION_IDS.filter((id) => m[id].done).length;
}

export const MISSION_GOAL: Record<MissionId, number> = { echo: 1, jaeger: 2, uhr: CLOCK_GOAL };

/** Steps done towards MISSION_GOAL (allocation-free, used every frame). */
export function missionSteps(m: MissionsState, id: MissionId): number {
  switch (id) {
    case 'echo':
      return m.echo.done ? 1 : 0;
    case 'jaeger':
      return (m.jaeger.power ? 1 : 0) + (m.jaeger.flashlight ? 1 : 0);
    case 'uhr':
      return m.uhr.count;
  }
}

/** Progress for the objective banner. */
export function missionProgress(
  m: MissionsState,
  id: MissionId,
): { progress: number; goal: number } {
  return { progress: missionSteps(m, id), goal: MISSION_GOAL[id] };
}

/** Current objective text; the Küche text switches once power is on. */
export function objectiveText(m: MissionsState, id: MissionId): string {
  if (id === 'jaeger' && m.jaeger.power && !m.jaeger.flashlight) {
    return 'Hol die Taschenlampe aus der Schublade.';
  }
  return MISSION_TEXT[id];
}

export type BoxResult = 'key' | 'wrong' | 'empty';

/** Open toy box `index`. Mutates `m`. 'empty' = already opened or mission done. */
export function openBox(m: MissionsState, index: number): BoxResult {
  const e = m.echo;
  if (e.done || index < 0 || index >= ECHO_BOXES || e.opened[index]) return 'empty';
  e.opened[index] = true;
  if (index === e.answer) {
    e.done = true;
    return 'key';
  }
  return 'wrong';
}

export type FuseResult = 'power-on' | 'already';

export function flipFuse(m: MissionsState): FuseResult {
  if (m.jaeger.power) return 'already';
  m.jaeger.power = true;
  return 'power-on';
}

export type DrawerResult = 'flashlight' | 'dark' | 'empty';

/** Kitchen drawer: needs power first (too dark to find anything). */
export function openDrawer(m: MissionsState): DrawerResult {
  if (m.jaeger.flashlight) return 'empty';
  if (!m.jaeger.power) return 'dark';
  m.jaeger.flashlight = true;
  m.jaeger.done = true;
  return 'flashlight';
}

/** True when a scream at `screamT` and a flash at `flashT` are within the window. */
export function inLightningWindow(
  screamT: number,
  flashT: number,
  window: number = CLOCK_WINDOW,
): boolean {
  return (
    Number.isFinite(screamT) && Number.isFinite(flashT) && Math.abs(screamT - flashT) <= window
  );
}

export type ClockResult = 'count' | 'open' | 'miss' | 'done';

/**
 * A scream reached the clock. Counts at most once per flash: pass the flash time it matched;
 * `lastCountedFlash` in the caller prevents double counting.
 */
export function clockScream(m: MissionsState, inWindow: boolean): ClockResult {
  if (m.uhr.done) return 'done';
  if (!inWindow) return 'miss';
  m.uhr.count = Math.min(CLOCK_GOAL, m.uhr.count + 1);
  if (m.uhr.count >= CLOCK_GOAL) {
    m.uhr.done = true;
    return 'open';
  }
  return 'count';
}

/** Force-complete a mission (debug / e2e). Mutates `m`. */
export function forceComplete(m: MissionsState, id: MissionId): void {
  switch (id) {
    case 'echo':
      m.echo.done = true;
      m.echo.opened[m.echo.answer] = true;
      break;
    case 'jaeger':
      m.jaeger.power = true;
      m.jaeger.flashlight = true;
      m.jaeger.done = true;
      break;
    case 'uhr':
      m.uhr.count = CLOCK_GOAL;
      m.uhr.done = true;
      break;
  }
}
