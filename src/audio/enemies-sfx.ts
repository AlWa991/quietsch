import { getBus, getNoiseBuffer, onAudioUnlocked } from './context';
import type { AudioBus } from './context';

export type EnemySfxKind = 'socke' | 'hand' | 'rudi' | 'teddy' | 'kuerbis' | 'spinne';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const rnd = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

interface ToneOpts {
  type: OscillatorType;
  f0: number;
  f1: number;
  start?: number;
  dur: number;
  gain: number;
  attack?: number;
  dist?: boolean;
  dest?: AudioNode;
}

let curve: Float32Array<ArrayBuffer> | null = null;
function distCurve(): Float32Array<ArrayBuffer> {
  if (curve) return curve;
  const n = 256;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * 4);
  }
  curve = c;
  return c;
}

function tone(bus: AudioBus, o: ToneOpts): void {
  const { ctx, master } = bus;
  const t0 = ctx.currentTime + (o.start ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.gain, t0 + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  const dest = o.dest ?? master;
  if (o.dist) {
    const ws = ctx.createWaveShaper();
    ws.curve = distCurve();
    osc.connect(ws).connect(g).connect(dest);
  } else {
    osc.connect(g).connect(dest);
  }
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

interface NoiseOpts {
  type: BiquadFilterType;
  f0: number;
  f1: number;
  Q?: number;
  start?: number;
  dur: number;
  gain: number;
  attack?: number;
  dest?: AudioNode;
}

function noise(bus: AudioBus, o: NoiseOpts): void {
  const { ctx, master } = bus;
  const t0 = ctx.currentTime + (o.start ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.Q ?? 1;
  f.frequency.setValueAtTime(o.f0, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.gain, t0 + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src
    .connect(f)
    .connect(g)
    .connect(o.dest ?? master);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + o.dur + 0.02);
}

interface Profile {
  type: OscillatorType;
  f: number; // body pitch
  noiseF: number;
  noiseQ: number;
  pop: number; // death pop pitch
  tail: number; // death burst length
}

const PROFILES: Record<EnemySfxKind, Profile> = {
  socke: { type: 'sawtooth', f: 520, noiseF: 900, noiseQ: 0.8, pop: 380, tail: 0.28 },
  hand: { type: 'square', f: 230, noiseF: 600, noiseQ: 1.5, pop: 260, tail: 0.3 },
  rudi: { type: 'square', f: 300, noiseF: 2200, noiseQ: 4, pop: 160, tail: 0.4 },
  teddy: { type: 'triangle', f: 700, noiseF: 1200, noiseQ: 0.7, pop: 420, tail: 0.35 },
  kuerbis: { type: 'sine', f: 240, noiseF: 400, noiseQ: 1.2, pop: 200, tail: 0.38 },
  spinne: { type: 'square', f: 1700, noiseF: 4200, noiseQ: 2, pop: 620, tail: 0.25 },
};

function hurt(kind: EnemySfxKind): void {
  const bus = getBus();
  if (!bus) return;
  const p = PROFILES[kind];
  const j = rnd(0.94, 1.08);
  tone(bus, { type: p.type, f0: p.f * 1.35 * j, f1: p.f * 0.65 * j, dur: 0.16, gain: 0.4 });
  tone(bus, { type: 'sine', f0: p.f * 0.5 * j, f1: p.f * 0.25, dur: 0.12, gain: 0.35 });
  noise(bus, {
    type: 'bandpass',
    f0: p.noiseF,
    f1: p.noiseF * 0.5,
    Q: p.noiseQ,
    dur: 0.09,
    gain: 0.35,
  });
}

function death(kind: EnemySfxKind): void {
  const bus = getBus();
  if (!bus) return;
  const p = PROFILES[kind];
  // pop
  tone(bus, { type: 'sine', f0: p.pop * 1.6, f1: p.pop * 0.3, dur: 0.2, gain: 0.7 });
  tone(bus, { type: p.type, f0: p.f * 1.2, f1: p.f * 0.35, dur: 0.22, gain: 0.3 });
  // burst of feathers / stuffing
  noise(bus, { type: 'lowpass', f0: p.noiseF * 2.5, f1: 220, Q: 0.7, dur: p.tail, gain: 0.55 });
  noise(bus, { type: 'highpass', f0: 3000, f1: 6000, dur: 0.1, gain: 0.25 });
  // little rising sparkle: the satisfying part
  for (let i = 0; i < 3; i++) {
    tone(bus, {
      type: 'triangle',
      f0: 700 * 1.26 ** i,
      f1: 700 * 1.26 ** i * 1.1,
      start: 0.08 + i * 0.05,
      dur: 0.1,
      gain: 0.18,
    });
  }
}

let lastFeather = -1;
let rollCount = 0;
let roll: { gain: GainNode; nodes: AudioScheduledSourceNode[]; bus: AudioBus } | null = null;
let rollHooked = false;

function syncRoll(): void {
  const bus = getBus();
  if (!bus) return;
  const { ctx, master } = bus;
  if (rollCount > 0 && !roll) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    lp.Q.value = 2;
    const am = ctx.createGain();
    am.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.4;
    lfo.connect(lfoG).connect(am.gain);
    src.connect(lp).connect(am).connect(gain);
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 52;
    const subG = ctx.createGain();
    subG.gain.value = 0.35;
    sub.connect(subG).connect(gain);
    src.start();
    lfo.start();
    sub.start();
    roll = { gain, nodes: [src, lfo, sub], bus };
  }
  if (roll) {
    const target = rollCount > 0 ? 0.55 : 0;
    roll.gain.gain.setTargetAtTime(target, ctx.currentTime, rollCount > 0 ? 0.08 : 0.12);
    if (rollCount === 0) {
      const r = roll;
      roll = null;
      for (const n of r.nodes) n.stop(ctx.currentTime + 0.8);
    }
  }
}

let drums: {
  gain: GainNode;
  riser: OscillatorNode;
  riserGain: GainNode;
  timer: ReturnType<typeof setInterval>;
  bus: AudioBus;
} | null = null;
let drumsWanted = false;
let drumsHooked = false;

function tom(bus: AudioBus, out: AudioNode, t: number, f: number, peak: number): void {
  const { ctx } = bus;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.22);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.26);
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(peak * 0.4, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  src.connect(lp).connect(ng).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + 0.04);
}

function syncDrums(): void {
  const bus = getBus();
  if (!bus) return;
  const { ctx, master } = bus;
  if (drumsWanted && !drums) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    gain.gain.setTargetAtTime(0.7, ctx.currentTime, 0.3);
    const riser = ctx.createOscillator();
    riser.type = 'sawtooth';
    riser.frequency.value = 73;
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 500;
    const riserGain = ctx.createGain();
    riserGain.gain.value = 0.02;
    riser.connect(rf).connect(riserGain).connect(gain);
    riser.start();
    const startT = ctx.currentTime;
    let nextStep = startT + 0.1;
    let step = 0;
    // 8-step bar: pulse on 0/4, toms on 2, 3, 6, 7
    const timer = setInterval(() => {
      const now = ctx.currentTime;
      const tension = clamp((now - startT) / 40, 0, 1);
      riser.frequency.setTargetAtTime(73 * (1 + tension), now, 0.5);
      riserGain.gain.setTargetAtTime(0.02 + 0.1 * tension, now, 0.5);
      const stepDur = 60 / (110 + 45 * tension) / 2;
      if (nextStep < now) nextStep = now + 0.02;
      while (nextStep < now + 0.15) {
        const s = step % 8;
        if (s === 0 || s === 4) tom(bus, gain, nextStep, 48, s === 0 ? 0.8 : 0.6);
        if (s === 2 || s === 3 || s === 6) tom(bus, gain, nextStep, 110, 0.55 + 0.2 * tension);
        if (s === 7) tom(bus, gain, nextStep, 140, 0.5 + 0.25 * tension);
        nextStep += stepDur;
        step++;
      }
    }, 40);
    drums = { gain, riser, riserGain, timer, bus };
  } else if (!drumsWanted && drums) {
    const d = drums;
    drums = null;
    clearInterval(d.timer);
    d.gain.gain.cancelScheduledValues(ctx.currentTime);
    d.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    d.riser.stop(ctx.currentTime + 1.2);
  }
}

export const enemySfx = {
  peckWhoosh(): void {
    const bus = getBus();
    if (!bus) return;
    const j = rnd(0.9, 1.15);
    noise(bus, {
      type: 'bandpass',
      f0: 600 * j,
      f1: 2400 * j,
      Q: 1.5,
      dur: 0.15,
      gain: 0.35,
      attack: 0.03,
    });
  },

  peckHit(combo: number): void {
    const bus = getBus();
    if (!bus) return;
    const c = clamp(Math.round(Number.isFinite(combo) ? combo : 1), 1, 3);
    const k = 1 + 0.2 * (c - 1);
    tone(bus, { type: 'sine', f0: 190 * k, f1: 60, dur: 0.14, gain: 0.7 });
    tone(bus, { type: 'triangle', f0: 460 * k, f1: 210 * k, dur: 0.09, gain: 0.35 });
    noise(bus, { type: 'highpass', f0: 1500, f1: 3000, dur: 0.05, gain: 0.45 });
    if (c >= 3) {
      tone(bus, { type: 'square', f0: 900, f1: 1300, start: 0.02, dur: 0.12, gain: 0.15 });
      noise(bus, { type: 'lowpass', f0: 2500, f1: 300, dur: 0.18, gain: 0.3 });
    }
  },

  hurt,
  death,

  playerHurt(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sawtooth', f0: 320, f1: 90, dur: 0.32, gain: 0.45, dist: true });
    tone(bus, { type: 'sine', f0: 100, f1: 38, dur: 0.3, gain: 0.7 });
    noise(bus, { type: 'lowpass', f0: 2000, f1: 200, dur: 0.25, gain: 0.4 });
  },

  featherPickup(): void {
    const bus = getBus();
    if (!bus) return;
    const now = bus.ctx.currentTime;
    if (now - lastFeather < 0.03) return;
    lastFeather = now;
    const f = rnd(1800, 2500);
    tone(bus, { type: 'triangle', f0: f, f1: f * 1.15, dur: 0.045, gain: 0.12, attack: 0.002 });
  },

  streak(n: number): void {
    const bus = getBus();
    if (!bus) return;
    const notes = n >= 3 ? [523, 659, 784, 1046] : [523, 784];
    notes.forEach((f, i) => {
      tone(bus, { type: 'square', f0: f, f1: f * 1.01, start: i * 0.07, dur: 0.14, gain: 0.22 });
      tone(bus, { type: 'triangle', f0: f * 2, f1: f * 2, start: i * 0.07, dur: 0.14, gain: 0.15 });
    });
    const last = notes.length * 0.07;
    tone(bus, {
      type: 'triangle',
      f0: notes[notes.length - 1] ?? 784,
      f1: 800,
      start: last,
      dur: n >= 3 ? 0.5 : 0.3,
      gain: 0.3,
    });
    if (n >= 3)
      noise(bus, { type: 'highpass', f0: 5000, f1: 8000, start: last, dur: 0.4, gain: 0.2 });
  },

  teddySwing(): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx } = bus;
    // wind-up groan (0.6 s telegraph)
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t0);
    o.frequency.linearRampToValueAtTime(150, t0 + 0.55);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t0);
    lp.frequency.linearRampToValueAtTime(700, t0 + 0.55);
    lp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.45, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.62);
    o.connect(lp).connect(g).connect(bus.master);
    o.start(t0);
    o.stop(t0 + 0.65);
    noise(bus, {
      type: 'bandpass',
      f0: 500,
      f1: 2000,
      Q: 1.2,
      start: 0.5,
      dur: 0.2,
      gain: 0.5,
      attack: 0.05,
    });
  },

  pumpkinRoll(on: boolean): void {
    rollCount = on ? rollCount + 1 : Math.max(0, rollCount - 1);
    if (!getBus()) {
      if (!rollHooked) {
        rollHooked = true;
        onAudioUnlocked(() => {
          rollHooked = false;
          syncRoll();
        });
      }
      return;
    }
    syncRoll();
  },

  pumpkinBeep(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'square', f0: 1400, f1: 1400, dur: 0.07, gain: 0.3, attack: 0.002 });
    tone(bus, { type: 'sine', f0: 2800, f1: 2800, dur: 0.05, gain: 0.12, attack: 0.002 });
  },

  pumpkinExplode(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sine', f0: 130, f1: 35, dur: 0.5, gain: 0.8 });
    noise(bus, { type: 'lowpass', f0: 3000, f1: 200, dur: 0.5, gain: 0.7 });
    for (let i = 0; i < 6; i++) {
      noise(bus, {
        type: 'highpass',
        f0: 2500,
        f1: 4500,
        start: 0.05 + i * rnd(0.03, 0.06),
        dur: 0.04,
        gain: 0.2,
      });
    }
  },

  spiderDrop(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sine', f0: 1800, f1: 450, dur: 0.25, gain: 0.2, attack: 0.03 });
    tone(bus, { type: 'sine', f0: 110, f1: 45, start: 0.25, dur: 0.12, gain: 0.55 });
    noise(bus, { type: 'lowpass', f0: 1500, f1: 250, start: 0.25, dur: 0.1, gain: 0.35 });
  },

  spiderHiss(): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx, master } = bus;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.4, t0 + 0.08);
    g.gain.setValueAtTime(0.3, t0 + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 26;
    const fg = ctx.createGain();
    fg.gain.value = 0.12;
    flutter.connect(fg).connect(g.gain);
    src.connect(hp).connect(g).connect(master);
    src.start(t0, Math.random() * 1.5);
    flutter.start(t0);
    src.stop(t0 + 0.52);
    flutter.stop(t0 + 0.52);
  },

  rudiStun(): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx, master } = bus;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, t0);
    o.frequency.exponentialRampToValueAtTime(110, t0 + 0.5);
    const ws = ctx.createWaveShaper();
    ws.curve = distCurve();
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 32;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.5;
    lfo.connect(lfoG).connect(am.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.4, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(ws).connect(am).connect(g).connect(master);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + 0.52);
    lfo.stop(t0 + 0.52);
    noise(bus, { type: 'highpass', f0: 3000, f1: 5000, dur: 0.15, gain: 0.3 });
  },

  rudiExplode(): void {
    const bus = getBus();
    if (!bus) return;
    tone(bus, { type: 'sine', f0: 140, f1: 30, dur: 0.8, gain: 0.8 });
    tone(bus, { type: 'sawtooth', f0: 200, f1: 40, dur: 0.6, gain: 0.35, dist: true });
    noise(bus, { type: 'lowpass', f0: 4000, f1: 150, dur: 0.9, gain: 0.7 });
    // metal clangs
    tone(bus, { type: 'square', f0: 330, f1: 300, start: 0.05, dur: 0.3, gain: 0.2 });
    tone(bus, { type: 'square', f0: 497, f1: 460, start: 0.1, dur: 0.25, gain: 0.15 });
    noise(bus, { type: 'highpass', f0: 2000, f1: 5000, start: 0.08, dur: 0.3, gain: 0.25 });
  },

  stun(): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx, master } = bus;
    const t0 = ctx.currentTime;
    const freqs = [880, 1175, 1480, 1175, 1760];
    freqs.forEach((f, i) => {
      const t = t0 + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const vib = ctx.createOscillator();
      vib.frequency.value = 12;
      const vg = ctx.createGain();
      vg.gain.value = f * 0.02;
      vib.connect(vg).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(master);
      o.start(t);
      vib.start(t);
      o.stop(t + 0.24);
      vib.stop(t + 0.24);
    });
  },

  hordeDrums(on: boolean): void {
    drumsWanted = on;
    if (!getBus()) {
      if (on && !drumsHooked) {
        drumsHooked = true;
        onAudioUnlocked(() => {
          drumsHooked = false;
          syncDrums();
        });
      }
      return;
    }
    syncDrums();
  },

  hordeWin(): void {
    const bus = getBus();
    if (!bus) return;
    const notes = [392, 523, 659, 784, 1046];
    notes.forEach((f, i) => {
      tone(bus, { type: 'square', f0: f, f1: f, start: i * 0.1, dur: 0.18, gain: 0.25 });
      tone(bus, { type: 'triangle', f0: f * 2, f1: f * 2, start: i * 0.1, dur: 0.18, gain: 0.15 });
    });
    const t = notes.length * 0.1;
    for (const f of [523, 659, 784, 1046]) {
      tone(bus, { type: 'triangle', f0: f, f1: f, start: t, dur: 0.9, gain: 0.2, attack: 0.01 });
    }
    noise(bus, { type: 'highpass', f0: 5000, f1: 7000, start: t, dur: 0.8, gain: 0.25 });
  },
};
