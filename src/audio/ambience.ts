import { getBus, getNoiseBuffer, onAudioUnlocked } from './context';
import type { AudioBus } from './context';

export interface Ambience {
  start(): void;
  stop(): void;
  thunder(intensity?: number): void;
  setDanger(level: number): void;
}

const LOOKAHEAD_S = 0.15;
const TICK_MS = 40;
const FADE = 0.4; // setTargetAtTime time constant

export function createAmbience(): Ambience {
  let wanted = false;
  let danger = 0;
  let nodes: { amb: GainNode; heart: GainNode; thunderOut: GainNode; bus: AudioBus } | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let nextBeat = 0;

  function build(bus: AudioBus): void {
    const { ctx, master } = bus;
    const amb = ctx.createGain();
    amb.gain.value = 0;
    amb.connect(master);

    // wind: looped noise -> bandpass (slow LFO on cutoff) -> gain (slow LFO)
    const wind = ctx.createBufferSource();
    wind.buffer = getNoiseBuffer(ctx);
    wind.loop = true;
    const windF = ctx.createBiquadFilter();
    windF.type = 'bandpass';
    windF.frequency.value = 450;
    windF.Q.value = 0.8;
    const windG = ctx.createGain();
    windG.gain.value = 0.35;
    wind.connect(windF).connect(windG).connect(amb);
    const lfoF = ctx.createOscillator();
    lfoF.frequency.value = 0.11;
    const lfoFG = ctx.createGain();
    lfoFG.gain.value = 250;
    lfoF.connect(lfoFG).connect(windF.frequency);
    const lfoG = ctx.createOscillator();
    lfoG.frequency.value = 0.07;
    const lfoGG = ctx.createGain();
    lfoGG.gain.value = 0.2;
    lfoG.connect(lfoGG).connect(windG.gain);

    // drone: two detuned low oscillators
    const droneG = ctx.createGain();
    droneG.gain.value = 0.06;
    droneG.connect(amb);
    for (const f of [55, 55.8]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(droneG);
      o.start();
    }

    const heart = ctx.createGain();
    heart.gain.value = 0;
    heart.connect(master);
    const thunderOut = ctx.createGain();
    thunderOut.gain.value = 1;
    thunderOut.connect(master);

    wind.start();
    lfoF.start();
    lfoG.start();
    nodes = { amb, heart, thunderOut, bus };
  }

  function thump(bus: AudioBus, out: GainNode, t: number, f: number, peak: number): void {
    const osc = bus.ctx.createOscillator();
    const g = bus.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  function tick(): void {
    if (!nodes || danger <= 0.01) return;
    const { bus, heart } = nodes;
    const now = bus.ctx.currentTime;
    if (nextBeat < now) nextBeat = now + 0.02;
    const period = 60 / (60 + 80 * danger);
    while (nextBeat < now + LOOKAHEAD_S) {
      thump(bus, heart, nextBeat, 62, 1);
      thump(bus, heart, nextBeat + 0.16 + 0.06 * (1 - danger), 52, 0.7);
      nextBeat += period;
    }
  }

  function applyDanger(): void {
    if (!nodes) return;
    const { ctx } = nodes.bus;
    nodes.heart.gain.setTargetAtTime(wanted ? danger * 0.9 : 0, ctx.currentTime, 0.15);
  }

  function activate(): void {
    const bus = getBus();
    if (!bus || !wanted) return;
    if (!nodes) build(bus);
    if (!nodes) return;
    nodes.amb.gain.setTargetAtTime(0.5, bus.ctx.currentTime, FADE);
    applyDanger();
    if (timer === null) timer = setInterval(tick, TICK_MS);
  }

  return {
    start(): void {
      wanted = true;
      onAudioUnlocked(activate); // immediate if unlocked, otherwise deferred
    },
    stop(): void {
      wanted = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (nodes) {
        const t = nodes.bus.ctx.currentTime;
        nodes.amb.gain.setTargetAtTime(0, t, FADE);
        nodes.heart.gain.setTargetAtTime(0, t, 0.1);
      }
    },
    thunder(intensity = 0.7): void {
      const bus = getBus();
      if (!bus || !nodes) {
        if (!bus) return;
        build(bus);
      }
      if (!nodes) return;
      const { ctx } = bus;
      const k = Math.min(1, Math.max(0, intensity));
      const dur = 2 + 2 * k;
      const t0 = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 1;
      lp.frequency.setValueAtTime(900 + 700 * k, t0);
      lp.frequency.exponentialRampToValueAtTime(70, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.4 + 0.9 * k, t0 + 0.06);
      g.gain.setTargetAtTime(0.0001, t0 + 0.2, dur / 4);
      src.connect(lp).connect(g).connect(nodes.thunderOut);
      src.start(t0, Math.random() * 1.5);
      src.stop(t0 + dur + 0.2);
    },
    setDanger(level: number): void {
      danger = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0));
      applyDanger();
    },
  };
}
