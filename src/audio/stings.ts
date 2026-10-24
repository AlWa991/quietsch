import { getBus, getNoiseBuffer } from './context';

const PEAK = 0.708; // -3 dB into master

interface Recipe {
  /** scream saw base freq (Hz) and the freq it falls to */
  f0: number;
  f1: number;
  detune: number;
  drive: number;
  dur: number;
  noise: number; // noise burst level
  noiseFilter: BiquadFilterType;
  noiseFreq: number;
  sub: number; // sub hit level
  type: OscillatorType;
  wobble: number; // vibrato depth in Hz
}

const BASE: Recipe = {
  f0: 1100,
  f1: 260,
  detune: 14,
  drive: 60,
  dur: 0.7,
  noise: 0.5,
  noiseFilter: 'bandpass',
  noiseFreq: 2200,
  sub: 1,
  type: 'sawtooth',
  wobble: 40,
};

const RECIPES: Record<string, Partial<Recipe>> = {
  socke: { f0: 1250, f1: 300 },
  teddy: { f0: 1900, f1: 700, detune: 25, wobble: 90, drive: 35, dur: 0.6 }, // child-ish shriek
  kuerbis: { f0: 700, f1: 140, drive: 90, noise: 0.7, noiseFreq: 900 },
  rudi: {
    f0: 240,
    f1: 70,
    drive: 140,
    type: 'square',
    noise: 0.9,
    noiseFilter: 'lowpass',
    noiseFreq: 1500,
    wobble: 12,
    dur: 0.8,
  }, // engine roar / metal
  hand: { f0: 900, f1: 180, detune: 30, noise: 0.35 },
  spinne: {
    f0: 2600,
    f1: 1800,
    drive: 20,
    noise: 1.1,
    noiseFilter: 'highpass',
    noiseFreq: 4500,
    wobble: 160,
    dur: 0.75,
  }, // hiss
  spiegel: { f0: 1500, f1: 420, detune: 40, wobble: 70, drive: 80 },
};

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

/** Distorted scream + noise burst + sub-bass hit. No-op before audio is unlocked. */
export function sting(kind: string, opts: { quiet?: boolean; volume?: number } = {}): void {
  const bus = getBus();
  if (!bus) return;
  const { ctx, master } = bus;
  const r: Recipe = { ...BASE, ...(RECIPES[kind] ?? {}) };
  const level = (opts.quiet ? 0.22 : 1) * Math.min(1, Math.max(0, opts.volume ?? 1));
  const t0 = ctx.currentTime;
  const end = t0 + r.dur;

  const out = ctx.createGain();
  out.gain.setValueAtTime(PEAK * level, t0);
  out.gain.setValueAtTime(PEAK * level, t0 + r.dur * 0.35);
  out.gain.exponentialRampToValueAtTime(0.001, end + 0.15);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 6;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  comp.connect(out).connect(master);

  // scream: detuned saws -> waveshaper
  const shaper = ctx.createWaveShaper();
  shaper.curve = distortionCurve(r.drive);
  shaper.oversample = '2x';
  const scream = ctx.createGain();
  scream.gain.setValueAtTime(0.0001, t0);
  scream.gain.linearRampToValueAtTime(0.55, t0 + 0.012);
  scream.gain.setValueAtTime(0.55, t0 + r.dur * 0.5);
  scream.gain.exponentialRampToValueAtTime(0.001, end);
  shaper.connect(scream).connect(comp);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 38;
  lfoGain.gain.value = r.wobble;
  lfo.connect(lfoGain);
  lfo.start(t0);
  lfo.stop(end + 0.05);

  for (const d of [-r.detune, 0, r.detune * 1.7]) {
    const osc = ctx.createOscillator();
    osc.type = r.type;
    osc.detune.value = d;
    osc.frequency.setValueAtTime(r.f0, t0);
    osc.frequency.exponentialRampToValueAtTime(r.f1, end);
    lfoGain.connect(osc.frequency);
    osc.connect(shaper);
    osc.start(t0);
    osc.stop(end + 0.05);
  }

  // noise burst
  const nz = ctx.createBufferSource();
  nz.buffer = getNoiseBuffer(ctx);
  const nf = ctx.createBiquadFilter();
  nf.type = r.noiseFilter;
  nf.frequency.value = r.noiseFreq;
  nf.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(r.noise, t0);
  ng.gain.exponentialRampToValueAtTime(0.001, t0 + r.dur * 0.9);
  nz.connect(nf).connect(ng).connect(comp);
  nz.start(t0);
  nz.stop(end);

  // sub-bass hit: ~45 Hz sine dropping, plus a click
  const sub = ctx.createOscillator();
  const sg = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(95, t0);
  sub.frequency.exponentialRampToValueAtTime(40, t0 + 0.35);
  sg.gain.setValueAtTime(0.0001, t0);
  sg.gain.linearRampToValueAtTime(0.9 * r.sub, t0 + 0.006);
  sg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
  sub.connect(sg).connect(comp);
  sub.start(t0);
  sub.stop(t0 + 0.6);

  const click = ctx.createBufferSource();
  click.buffer = getNoiseBuffer(ctx);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.8, t0);
  cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.02);
  click.connect(cg).connect(comp);
  click.start(t0);
  click.stop(t0 + 0.03);
}
