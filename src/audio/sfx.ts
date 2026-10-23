import { getBus, getNoiseBuffer } from './context';
import type { AudioBus } from './context';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

interface ToneOpts {
  type: OscillatorType;
  f0: number;
  f1: number;
  start?: number; // offset in s
  dur: number;
  gain: number;
  attack?: number;
}

/** One oscillator with exponential pitch glide and attack/decay envelope into master. */
function tone(bus: AudioBus, o: ToneOpts): void {
  const { ctx, master } = bus;
  const t0 = ctx.currentTime + (o.start ?? 0);
  const attack = o.attack ?? 0.005;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

function squeakAt(bus: AudioBus, start: number, f0: number, f1: number, dur: number, gain: number) {
  tone(bus, { type: 'sawtooth', f0, f1, start, dur, gain, attack: 0.008 });
  tone(bus, { type: 'square', f0: f0 * 2.01, f1: f1 * 2.01, start, dur, gain: gain * 0.3 });
}

function scream(holdSeconds: number): void {
  const bus = getBus();
  if (!bus) return;
  const { ctx, master } = bus;
  const h = clamp(Number.isFinite(holdSeconds) ? holdSeconds : 0.2, 0.2, 1.5);
  const t = (h - 0.2) / 1.3; // 0..1
  const dur = 0.3 + t * 1.5; // 0.3..1.8 s
  const base = 480 + t * 420; // start pitch 480..900 Hz
  const peak = base * (1.45 + t * 0.35);
  const t0 = ctx.currentTime;
  const end = t0 + dur;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(base, t0);
  osc.frequency.exponentialRampToValueAtTime(peak, t0 + dur * 0.4); // "AAA" climbs
  osc.frequency.exponentialRampToValueAtTime(peak * 0.8, end); // "EEH" sags

  // vibrato, speeds up and deepens along the scream
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(7, t0);
  lfo.frequency.linearRampToValueAtTime(13, end);
  lfoGain.gain.setValueAtTime(base * 0.01, t0);
  lfoGain.gain.linearRampToValueAtTime(base * (0.04 + t * 0.03), end);
  lfo.connect(lfoGain).connect(osc.frequency);

  // formant sweep: open "AAA" (~800 Hz) to bright "EEE" (~2400 Hz)
  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.Q.value = 3;
  formant.frequency.setValueAtTime(800, t0);
  formant.frequency.exponentialRampToValueAtTime(2400, t0 + dur * 0.55);
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = 5000;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(1.1, t0 + 0.03);
  g.gain.setValueAtTime(1.1, Math.max(t0 + 0.04, end - 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(formant).connect(body).connect(g).connect(master);
  // breathy rasp layer
  const rasp = ctx.createBufferSource();
  rasp.buffer = getNoiseBuffer(ctx);
  rasp.loop = true;
  const raspF = ctx.createBiquadFilter();
  raspF.type = 'bandpass';
  raspF.frequency.value = 2800;
  raspF.Q.value = 1;
  const raspG = ctx.createGain();
  raspG.gain.value = 0.12;
  rasp.connect(raspF).connect(raspG).connect(g);

  osc.start(t0);
  lfo.start(t0);
  rasp.start(t0);
  osc.stop(end + 0.02);
  lfo.stop(end + 0.02);
  rasp.stop(end + 0.02);
}

export const sfx = {
  squeak(): void {
    const bus = getBus();
    if (!bus) return;
    const j = 1 + (Math.random() - 0.5) * 0.12;
    squeakAt(bus, 0, 900 * j, 1700 * j, 0.09, 0.25);
    squeakAt(bus, 0.07, 1500 * j, 1000 * j, 0.07, 0.2);
  },

  scream,

  pickup(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'square', f0: 880, f1: 880, dur: 0.07, gain: 0.18 });
    tone(bus, { type: 'square', f0: 1320, f1: 1320, start: 0.07, dur: 0.12, gain: 0.18 });
  },

  combo(n: number): void {
    const bus = getBus();
    if (!bus) return;
    const step = clamp(Number.isFinite(n) ? n : 1, 1, 16) - 1;
    const f = 520 * Math.pow(2, (step * 2) / 12); // whole tone per combo step
    tone(bus, { type: 'triangle', f0: f, f1: f * 1.5, dur: 0.14, gain: 0.3 });
    tone(bus, { type: 'square', f0: f * 2, f1: f * 3, start: 0.04, dur: 0.12, gain: 0.1 });
  },

  caught(): void {
    const bus = getBus();
    if (!bus) return;
    squeakAt(bus, 0, 1400, 140, 0.7, 0.3);
    const { ctx, master } = bus; // airy deflate hiss
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(3000, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    src.connect(f).connect(g).connect(master);
    src.start();
    src.stop(ctx.currentTime + 0.72);
  },

  rankUp(): void {
    const bus = getBus();
    if (!bus) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C major arpeggio
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      tone(bus, {
        type: 'square',
        f0: f,
        f1: f,
        start: i * 0.1,
        dur: last ? 0.4 : 0.12,
        gain: 0.16,
      });
      tone(bus, {
        type: 'triangle',
        f0: f / 2,
        f1: f / 2,
        start: i * 0.1,
        dur: last ? 0.4 : 0.12,
        gain: 0.2,
      });
    });
  },

  lightningSting(): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx, master } = bus;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6000, t0);
    hp.frequency.exponentialRampToValueAtTime(1500, t0 + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    src.connect(hp).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + 0.37);
    tone(bus, { type: 'sawtooth', f0: 3200, f1: 400, dur: 0.12, gain: 0.12 });
  },

  doorbell(): void {
    const bus = getBus();
    if (!bus) return;
    for (const [f, start, dur] of [
      [659.25, 0, 0.7],
      [523.25, 0.4, 1.0],
    ] as const) {
      tone(bus, { type: 'sine', f0: f, f1: f * 0.995, start, dur, gain: 0.3 });
      tone(bus, { type: 'sine', f0: f * 2.76, f1: f * 2.74, start, dur: dur * 0.4, gain: 0.08 });
    }
  },

  uiClick(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'square', f0: 1200, f1: 700, dur: 0.04, gain: 0.12 });
  },
  /** Small, slightly muffled squeak answering from a toy box (Echo-Rätsel). */
  echo(delay: number): void {
    const bus = getBus();
    if (!bus) return;
    squeakAt(bus, delay, 1100, 1900, 0.08, 0.14);
    squeakAt(bus, delay + 0.09, 1700, 1200, 0.06, 0.1);
  },

  wrong(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'square', f0: 220, f1: 140, dur: 0.25, gain: 0.18 });
    tone(bus, { type: 'square', f0: 160, f1: 100, start: 0.12, dur: 0.3, gain: 0.15 });
  },

  /** Key found / lock opened jingle. */
  unlock(): void {
    const bus = getBus();
    if (!bus) return;
    [784, 988, 1175, 1568].forEach((f, i) =>
      tone(bus, { type: 'triangle', f0: f, f1: f, start: i * 0.07, dur: 0.18, gain: 0.22 }),
    );
    tone(bus, { type: 'square', f0: 2400, f1: 1800, start: 0.3, dur: 0.06, gain: 0.08 });
  },

  powerOn(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sawtooth', f0: 40, f1: 120, dur: 0.6, gain: 0.25, attack: 0.05 });
    tone(bus, { type: 'square', f0: 60, f1: 60, start: 0.05, dur: 0.5, gain: 0.08 });
    tone(bus, { type: 'square', f0: 3000, f1: 2000, dur: 0.05, gain: 0.12 });
  },

  cuckoo(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sine', f0: 740, f1: 735, dur: 0.22, gain: 0.25, attack: 0.02 });
    tone(bus, { type: 'sine', f0: 587, f1: 580, start: 0.26, dur: 0.32, gain: 0.25, attack: 0.02 });
  },

  /** Scripted scare: something bursts out of the sofa. */
  handPop(): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx, master } = bus;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    src.connect(f).connect(g).connect(master);
    src.start();
    src.stop(ctx.currentTime + 0.5);
    tone(bus, { type: 'sawtooth', f0: 90, f1: 45, dur: 0.5, gain: 0.3 });
  },

  /** Hollow double knock: the wall answers the scream (Keller secret). */
  knock(): void {
    const bus = getBus();
    if (!bus) return;
    for (const start of [0, 0.16, 0.42]) {
      tone(bus, { type: 'sine', f0: 190, f1: 70, start, dur: 0.22, gain: 0.45 });
      tone(bus, { type: 'triangle', f0: 420, f1: 160, start, dur: 0.06, gain: 0.12 });
    }
  },

  /** Heavy stone slab sliding down. */
  slide(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sawtooth', f0: 70, f1: 38, dur: 1.1, gain: 0.22, attack: 0.08 });
    tone(bus, { type: 'square', f0: 55, f1: 30, start: 0.9, dur: 0.25, gain: 0.18 });
  },

  click(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'square', f0: 2200, f1: 1800, dur: 0.025, gain: 0.1 });
  },

  buy(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'square', f0: 988, f1: 988, dur: 0.06, gain: 0.15 });
    tone(bus, { type: 'square', f0: 1319, f1: 1319, start: 0.06, dur: 0.16, gain: 0.15 });
  },
};

export interface MotorLoop {
  /** 0 = silent, 1 = full roar. Smoothly ramped. */
  set(level: number): void;
}

/** Continuous vacuum motor for Rudi (created lazily once audio is unlocked). */
export function createMotor(): MotorLoop {
  let nodes: { g: GainNode; osc: OscillatorNode; ctx: AudioContext } | null = null;
  let last = -1;
  return {
    set(level) {
      const v = Math.round(clamp(level, 0, 1) * 50) / 50;
      if (v === last) return;
      last = v;
      if (!nodes) {
        const bus = getBus();
        if (!bus) return;
        const { ctx, master } = bus;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 70;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        noise.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900;
        bp.Q.value = 0.8;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;
        const g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(lp).connect(g);
        noise.connect(bp).connect(g);
        g.connect(master);
        osc.start();
        noise.start();
        nodes = { g, osc, ctx };
      }
      const t = nodes.ctx.currentTime;
      nodes.g.gain.setTargetAtTime(v * 0.35, t, 0.12);
      nodes.osc.frequency.setTargetAtTime(60 + v * 70, t, 0.2);
    },
  };
}
