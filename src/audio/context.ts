/**
 * Shared AudioContext + master bus.
 *
 * ZzFX is intentionally NOT used: importing it creates an AudioContext at module load
 * (autoplay warnings in headless runs) and it routes straight to `destination`, bypassing the
 * master gain. All sound is synthesized with plain WebAudio through `master`.
 */

export const MASTER_GAIN = 0.25; // about -12 dB

export interface AudioBus {
  readonly ctx: AudioContext;
  readonly master: GainNode;
}

let bus: AudioBus | null = null;
let unlocked = false;
let installed = false;
const callbacks: Array<() => void> = [];

function unlock(): void {
  if (unlocked) return;
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    bus = { ctx, master };
    unlocked = true;
    void ctx.resume().catch(() => undefined);
  } catch {
    return; // no WebAudio available: stay silent
  }
  removeListeners();
  for (const cb of callbacks.splice(0)) cb();
}

function removeListeners(): void {
  window.removeEventListener('keydown', unlock);
  window.removeEventListener('pointerdown', unlock);
}

/** Creates/resumes the context on the first keydown/pointerdown (once). */
export function installAudioUnlock(): void {
  if (installed || unlocked) return;
  installed = true;
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** Runs cb once audio is unlocked (immediately if it already is). */
export function onAudioUnlocked(cb: () => void): void {
  if (unlocked) cb();
  else callbacks.push(cb);
}

/** The bus, or null before unlock. Callers treat null as "silent no-op". */
export function getBus(): AudioBus | null {
  return bus;
}

let noise: AudioBuffer | null = null;
/** 2 s of white noise, created once per context. */
export function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}
