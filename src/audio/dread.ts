import { getBus, getNoiseBuffer } from './context';
import type { AudioBus } from './context';

export interface DreadContext {
  playTime: number; // s
  inKorb: boolean;
  danger: number; // 0..1
  room: string | null;
}

export interface Dread {
  start(): void;
  stop(): void;
  /** Call every frame; schedules random one-shots. No allocations unless a sound fires. */
  update(dt: number, c: DreadContext): void;
  /** Duck the dread layer and every one-shot to silence for n seconds (after a jumpscare). */
  silence(seconds: number): void;
  creak(): void;
  footstepsOverhead(): void;
  giggle(): void;
  doorSqueak(): void;
  /** Heavy close breathing loop for the Keller scare; on=false fades it out. */
  breathing(on: boolean): void;
  /** Whisper riser over `seconds` (Lauerer build-up); cancelled by silence(). */
  whisperRiser(seconds: number): void;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const rnd = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/**
 * Pure: mean seconds between random dread events. ~14 s at t=0, ~5 s at 600 s (clamped),
 * x3 in the Korb, ~0.7x at full danger.
 */
export function dreadInterval(playTime: number, inKorb: boolean, danger: number): number {
  const t = clamp(Number.isFinite(playTime) ? playTime : 0, 0, 600) / 600;
  const d = clamp(Number.isFinite(danger) ? danger : 0, 0, 1);
  const base = 14 + (5 - 14) * t;
  return base * (inKorb ? 3 : 1) * (1 - 0.3 * d);
}

type EventKind = 0 | 1 | 2 | 3; // creak, footsteps, giggle, door

interface Nodes {
  bus: AudioBus;
  out: GainNode; // dread layer, ducked by silence()
  send: GainNode; // reverb-ish feedback delay input
}

export function createDread(): Dread {
  let running = false;
  let countdown = 8; // first event shortly after start
  let lastKind = -1;
  let silencedUntil = 0;
  let nodes: Nodes | null = null;
  let riser: GainNode | null = null;
  let breath: {
    gain: GainNode;
    src: AudioBufferSourceNode;
    filter: BiquadFilterNode;
    timer: ReturnType<typeof setInterval>;
    next: number;
  } | null = null;

  function ensure(): Nodes | null {
    if (nodes) return nodes;
    const bus = getBus();
    if (!bus) return null;
    const { ctx, master } = bus;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(master);
    // distant-room feel: feedback delay with darkening lowpass
    const send = ctx.createGain();
    send.gain.value = 1;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1700;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    send.connect(delay);
    delay.connect(lp).connect(fb).connect(delay);
    lp.connect(wet).connect(out);
    nodes = { bus, out, send };
    return nodes;
  }

  /** Output node for a one-shot: optional stereo panner feeding dry out + reverb send. */
  function spatial(n: Nodes, pan: number, reverb: number): AudioNode {
    const { ctx } = n.bus;
    const g = ctx.createGain();
    g.gain.value = 1;
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    g.connect(panner);
    panner.connect(n.out);
    if (reverb > 0) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      panner.connect(s).connect(n.send);
    }
    return g;
  }

  function noiseSrc(ctx: AudioContext, t0: number, dur: number): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur);
    return src;
  }

  function creak(): void {
    const n = ensure();
    if (!n) return;
    const { ctx } = n.bus;
    const t0 = ctx.currentTime + 0.02;
    const dur = rnd(1.1, 2.4);
    const end = t0 + dur;
    const dest = spatial(n, rnd(-0.8, 0.8), 0.25);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(0.3, t0 + dur * 0.25);
    env.gain.linearRampToValueAtTime(0.18, t0 + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    env.connect(dest);

    // resonant saw "wood under stress": pitch wobbles slowly
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const f = rnd(75, 150);
    osc.frequency.setValueAtTime(f, t0);
    osc.frequency.linearRampToValueAtTime(f * rnd(1.15, 1.6), t0 + dur * 0.5);
    osc.frequency.linearRampToValueAtTime(f * rnd(0.8, 1.1), end);
    const wob = ctx.createOscillator();
    wob.frequency.value = rnd(5, 11);
    const wobG = ctx.createGain();
    wobG.gain.value = f * 0.06;
    wob.connect(wobG).connect(osc.frequency);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 12;
    bp.frequency.setValueAtTime(rnd(300, 500), t0);
    bp.frequency.linearRampToValueAtTime(rnd(450, 900), t0 + dur * 0.6);
    bp.frequency.linearRampToValueAtTime(rnd(250, 500), end);
    osc.connect(bp).connect(env);

    // friction: noise chopped by a fast LFO
    const nz = noiseSrc(ctx, t0, dur + 0.05);
    const nbp = ctx.createBiquadFilter();
    nbp.type = 'bandpass';
    nbp.Q.value = 6;
    nbp.frequency.value = rnd(700, 1400);
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const chopLfo = ctx.createOscillator();
    chopLfo.type = 'square';
    chopLfo.frequency.value = rnd(9, 20);
    const chopG = ctx.createGain();
    chopG.gain.value = 0.5;
    chopLfo.connect(chopG).connect(chop.gain);
    nz.connect(nbp).connect(chop).connect(env);

    for (const o of [osc, wob, chopLfo]) {
      o.start(t0);
      o.stop(end + 0.05);
    }
  }

  function footstepsOverhead(): void {
    const n = ensure();
    if (!n) return;
    const { ctx } = n.bus;
    const steps = 3 + Math.floor(Math.random() * 4); // 3..6
    const pan = rnd(-0.6, 0.6);
    const dest = spatial(n, pan, 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    lp.connect(dest);
    let t = ctx.currentTime + 0.05;
    for (let i = 0; i < steps; i++) {
      const g = ctx.createGain();
      const peak = rnd(0.22, 0.38);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      g.connect(lp);
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f = rnd(60, 95);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.18);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.24);
      const nz = noiseSrc(ctx, t, 0.08);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(peak * 0.8, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      nz.connect(ng).connect(lp);
      t += rnd(0.42, 0.95) * (Math.random() < 0.2 ? 1.6 : 1); // irregular, occasional pause
    }
  }

  function giggle(): void {
    const n = ensure();
    if (!n) return;
    const { ctx } = n.bus;
    const syll = 3 + Math.floor(Math.random() * 3);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dest = spatial(n, side * rnd(0.5, 0.95), 0.9);
    let t = ctx.currentTime + 0.05;
    const base = rnd(620, 820);
    for (let i = 0; i < syll; i++) {
      const dur = 0.1;
      const f = base * (i % 2 === 0 ? 1 : 1.18) * rnd(0.97, 1.05);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.12, t + dur);
      const vib = ctx.createOscillator();
      vib.frequency.value = 38;
      const vibG = ctx.createGain();
      vibG.gain.value = f * 0.02;
      vib.connect(vibG).connect(osc.frequency);
      // two formants approximate a small "i" vowel
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 450;
      f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 2700;
      f2.Q.value = 7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(f1).connect(g);
      osc.connect(f2).connect(g);
      g.connect(dest);
      osc.start(t);
      vib.start(t);
      osc.stop(t + dur + 0.02);
      vib.stop(t + dur + 0.02);
      t += 0.15 + (i === syll - 2 ? 0.07 : 0);
    }
  }

  function doorSqueak(): void {
    const n = ensure();
    if (!n) return;
    const { ctx } = n.bus;
    const t0 = ctx.currentTime + 0.02;
    const dur = rnd(0.9, 1.7);
    const end = t0 + dur;
    const dest = spatial(n, rnd(-0.9, 0.9), 0.35);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(0.26, t0 + dur * 0.3);
    env.gain.setValueAtTime(0.26, t0 + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    env.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const f = rnd(330, 520);
    osc.frequency.setValueAtTime(f, t0);
    osc.frequency.linearRampToValueAtTime(f * rnd(1.2, 1.6), t0 + dur * 0.7);
    osc.frequency.linearRampToValueAtTime(f * rnd(1.0, 1.3), end);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 16;
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.linearRampToValueAtTime(rnd(1500, 2400), t0 + dur * 0.6);
    bp.frequency.linearRampToValueAtTime(1000, end);
    const trem = ctx.createOscillator();
    trem.frequency.value = rnd(6, 12);
    const tremG = ctx.createGain();
    tremG.gain.value = 0.35;
    const am = ctx.createGain();
    am.gain.value = 0.65;
    trem.connect(tremG).connect(am.gain);
    osc.connect(bp).connect(am).connect(env);
    for (const o of [osc, trem]) {
      o.start(t0);
      o.stop(end + 0.05);
    }
  }

  function breathCycle(b: NonNullable<typeof breath>, t: number): number {
    const inhale = rnd(1.0, 1.25);
    const hold = rnd(0.15, 0.3);
    const exhale = rnd(1.2, 1.6);
    const pause = rnd(0.3, 0.6);
    const g = b.gain.gain;
    const f = b.filter.frequency;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(1, t + inhale);
    g.linearRampToValueAtTime(0.85, t + inhale + hold);
    g.linearRampToValueAtTime(0.0001, t + inhale + hold + exhale);
    f.setValueAtTime(380, t);
    f.linearRampToValueAtTime(900, t + inhale);
    f.linearRampToValueAtTime(520, t + inhale + hold + exhale);
    return t + inhale + hold + exhale + pause;
  }

  function breathing(on: boolean): void {
    const bus = getBus();
    if (!bus) return;
    const { ctx } = bus;
    if (!on) {
      if (!breath) return;
      const b = breath;
      breath = null;
      clearInterval(b.timer);
      b.gain.gain.cancelScheduledValues(ctx.currentTime);
      b.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      b.src.stop(ctx.currentTime + 1.5);
      return;
    }
    if (breath) return;
    const n = ensure();
    if (!n) return;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.value = 400;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const env = ctx.createGain();
    env.gain.value = 0;
    const level = ctx.createGain();
    level.gain.value = 0.5;
    const dest = spatial(n, 0, 0.15);
    src.connect(filter).connect(lp).connect(env).connect(level).connect(dest);
    src.start();
    const b = {
      gain: env,
      src,
      filter,
      next: ctx.currentTime + 0.05,
      timer: setInterval(() => {
        const now = ctx.currentTime;
        while (b.next < now + 1.2) b.next = breathCycle(b, b.next);
      }, 300),
    };
    breath = b;
    while (b.next < ctx.currentTime + 1.2) b.next = breathCycle(b, b.next);
  }

  function whisperRiser(seconds: number): void {
    const n = ensure();
    if (!n) return;
    const { ctx } = n.bus;
    const total = clamp(Number.isFinite(seconds) ? seconds : 4, 0.5, 20);
    if (riser) riser.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(spatial(n, 0, 0.3));
    riser = bus;
    const t0 = ctx.currentTime + 0.05;

    // rising tone with unsteady tremolo
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(180, t0);
    tone.frequency.exponentialRampToValueAtTime(760, t0 + total);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t0);
    tg.gain.linearRampToValueAtTime(0.13, t0 + total);
    tg.gain.linearRampToValueAtTime(0.0001, t0 + total + 0.15);
    tone.connect(tg).connect(bus);
    tone.start(t0);
    tone.stop(t0 + total + 0.2);

    // whisper bursts get denser and louder
    let t = t0;
    while (t < t0 + total) {
      const p = (t - t0) / total;
      const dur = rnd(0.12, 0.26);
      const src = noiseSrc(ctx, t, dur + 0.02);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 2.5;
      bp.frequency.setValueAtTime(rnd(1800, 3200), t);
      bp.frequency.linearRampToValueAtTime(rnd(3000, 5200) * (0.8 + 0.4 * p), t + dur);
      const g = ctx.createGain();
      const peak = 0.04 + 0.26 * p;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(bus);
      t += (0.5 - 0.4 * p) * rnd(0.7, 1.3);
    }
  }

  function fire(kind: EventKind): void {
    if (kind === 0) creak();
    else if (kind === 1) footstepsOverhead();
    else if (kind === 2) giggle();
    else doorSqueak();
  }

  function pickKind(playTime: number): EventKind {
    // weights: creak, footsteps, giggle (rarer early), door
    const w0 = 0.35;
    const w1 = 0.25;
    const w2 = 0.1 + 0.1 * clamp(playTime / 300, 0, 1);
    const w3 = 0.25;
    for (let tries = 0; tries < 3; tries++) {
      const r = Math.random() * (w0 + w1 + w2 + w3);
      let k: EventKind = 3;
      if (r < w0) k = 0;
      else if (r < w0 + w1) k = 1;
      else if (r < w0 + w1 + w2) k = 2;
      if (k !== lastKind) return k;
    }
    return 0;
  }

  return {
    start(): void {
      running = true;
      countdown = Math.max(countdown, 6);
    },
    stop(): void {
      running = false;
      breathing(false);
    },
    update(dt: number, c: DreadContext): void {
      if (!running) return;
      countdown -= dt;
      if (countdown > 0) return;
      const mean = dreadInterval(c.playTime, c.inKorb, c.danger);
      // jittered gap around the mean, never tighter than 2 s
      countdown = Math.max(2, mean * (0.5 + Math.random()));
      const bus = getBus();
      if (!bus || bus.ctx.currentTime < silencedUntil) return;
      const kind = pickKind(c.playTime);
      lastKind = kind;
      fire(kind);
    },
    silence(seconds: number): void {
      const n = ensure();
      if (!n) return;
      const s = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 30);
      const now = n.bus.ctx.currentTime;
      silencedUntil = now + s;
      n.out.gain.cancelScheduledValues(now);
      n.out.gain.setTargetAtTime(0, now, 0.03);
      n.out.gain.setTargetAtTime(1, now + s, 0.4);
      if (riser) {
        riser.gain.cancelScheduledValues(now);
        riser.gain.setTargetAtTime(0, now, 0.03);
        riser = null;
      }
    },
    creak,
    footstepsOverhead,
    giggle,
    doorSqueak,
    breathing,
    whisperRiser,
  };
}
