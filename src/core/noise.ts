// Pure hearing and pacifying rules (no three). Every sound a spook can react to is a noise
// source; light decides whether a scream pacifies instead of attracting.

import type { SpookMode } from './spook-fsm';
import type { SpookKind } from './types';

/** Where a sonar ring came from. Only the chicken's own scream can pacify. */
export type NoiseSource = 'scream' | 'echo';

/** Light sources as bit flags; `lights` values are OR-ed masks. */
export const LIGHT = {
  night: 1,
  fridge: 2,
  lightning: 4,
  torch: 8,
} as const;

/** Which lights calm which spook: socks any light, Rudi fridge/torch, hands only lightning. */
export const PACIFY_LIGHTS: Record<SpookKind, number> = {
  socke: LIGHT.night | LIGHT.fridge | LIGHT.lightning | LIGHT.torch,
  rudi: LIGHT.fridge | LIGHT.torch,
  hand: LIGHT.lightning,
};

export const isPeacefulMode = (mode: SpookMode): boolean => mode === 'follow' || mode === 'rest';

/** True if a scream at a spook standing in `lights` makes it peaceful. */
export function canPacify(kind: SpookKind, mode: SpookMode, lights: number): boolean {
  if (mode === 'dormant' || isPeacefulMode(mode)) return false;
  return (PACIFY_LIGHTS[kind] & lights) !== 0;
}

export type NoiseReaction = 'pacify' | 'hear' | 'ignore';

/** How a spook reacts to a noise reaching it. 'hear' = walk/drive to the noise origin. */
export function noiseReaction(
  kind: SpookKind,
  mode: SpookMode,
  source: NoiseSource,
  lights: number,
): NoiseReaction {
  if (mode === 'dormant' || isPeacefulMode(mode)) return 'ignore';
  if (source === 'scream' && canPacify(kind, mode, lights)) return 'pacify';
  return kind === 'hand' ? 'ignore' : 'hear';
}

/** Results line "Befriedete Spuks n/m". */
export function peacefulCount(spooks: readonly { peaceful: boolean }[]): { n: number; m: number } {
  let n = 0;
  for (const s of spooks) if (s.peaceful) n++;
  return { n, m: spooks.length };
}
