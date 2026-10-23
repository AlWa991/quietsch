// Pure rules for the secret Keller (no three, no DOM). All state lives in the persisted
// `flags` record, so a reload restores the secret exactly.

export const KELLER_FLAG = {
  /** A scream reached the hollow wall at least once. */
  heard: 'keller:heard',
  open: 'keller:open',
  /** Spendenkarton opened: twist 2, Krone, Geisterlichter. */
  box: 'keller:box',
  chest: 'keller:chest',
} as const;

export const KELLER_REWARD = { hat: 'krone', ghostlights: 3, chestFeathers: 40 } as const;

/** Seconds between two "Hohl." reactions, so a scream spam does not stack toasts. */
export const HOLLOW_COOLDOWN = 3;

export type Flags = Record<string, boolean>;

export type HollowReaction = 'hohl' | 'cooldown' | 'ignored';

/**
 * The sonar ring reached the hollow wall. Only the chicken's own scream counts (no toy box
 * echo, no bait squeak) and only while the wall is closed. Mutates `flags`.
 */
export function hearHollow(
  flags: Flags,
  echo: boolean,
  time: number,
  lastReaction: number,
): HollowReaction {
  if (echo || flags[KELLER_FLAG.open]) return 'ignored';
  flags[KELLER_FLAG.heard] = true;
  return time - lastReaction < HOLLOW_COOLDOWN ? 'cooldown' : 'hohl';
}

/** E works on the hollow wall only after it sounded hollow and while it is still closed. */
export function canOpenHollow(flags: Flags): boolean {
  return flags[KELLER_FLAG.heard] === true && flags[KELLER_FLAG.open] !== true;
}

/** Open the hollow wall. Returns true the first time. Mutates `flags`. */
export function openHollow(flags: Flags): boolean {
  if (!canOpenHollow(flags)) return false;
  flags[KELLER_FLAG.open] = true;
  return true;
}

/** Open the Spendenkarton. Returns true exactly once (rewards + twist 2). Mutates `flags`. */
export function openDonation(flags: Flags): boolean {
  if (flags[KELLER_FLAG.box]) return false;
  flags[KELLER_FLAG.box] = true;
  return true;
}

/** Open the feather chest. Returns true exactly once. Mutates `flags`. */
export function openKellerChest(flags: Flags): boolean {
  if (flags[KELLER_FLAG.chest]) return false;
  flags[KELLER_FLAG.chest] = true;
  return true;
}

/** Results screen: "Geheimnis gefunden". */
export function secretFound(flags: Flags): boolean {
  return flags[KELLER_FLAG.box] === true;
}

/** Add a hat to the owned list (no duplicates) and wear it. Returns new values. */
export function grantHat(hats: readonly string[], id: string): { hats: string[]; hat: string } {
  return { hats: hats.includes(id) ? [...hats] : [...hats, id], hat: id };
}
