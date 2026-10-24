import '../ui/jumpscare.css';
import { sting } from '../audio/stings';
import { buildFace } from './faces';

export type ScareKind = 'socke' | 'teddy' | 'kuerbis' | 'rudi' | 'hand' | 'spinne' | 'spiegel';

export interface ScareHooks {
  shake(amplitude: number, seconds: number): void;
  flash(v: number): void;
  silence(seconds: number): void;
}

export interface ScareOpts {
  durationMs?: number;
  volume?: number;
  quiet?: boolean;
}

export interface Jumpscares {
  jumpscare(kind: ScareKind, opts?: ScareOpts): Promise<void>;
  readonly active: boolean;
  readonly count: number;
}

/** White flash: full opacity for FLASH_HOLD_MS, then linear fade to 0 within FLASH_FADE_MS. */
const FLASH_HOLD_MS = 80;
const FLASH_FADE_MS = 120;
const FLASH_STEP_MS = 16;
/** Darkness beat after the face. */
const DARK_BEAT_MS = 1500;
/** Face hold before the fade (configurable per call). */
const DEFAULT_FACE_MS = 1800;
const FADE_OUT_MS = 150;
/** Input that must not reach the game while a face is up (key/mouse releases stay allowed). */
const BLOCKED_EVENTS = ['keydown', 'mousedown', 'mousemove', 'wheel', 'pointerdown', 'click'];

const KINDS: ScareKind[] = ['socke', 'teddy', 'kuerbis', 'rudi', 'hand', 'spinne', 'spiegel'];

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Pure-channel filters for the chromatic split (red copy, cyan copy). */
function channelDefs(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'js-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<filter id="js-ch-r" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>' +
    '<filter id="js-ch-c" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>';
  return svg;
}

export function createJumpscares(root: HTMLElement, hooks: ScareHooks): Jumpscares {
  const overlay = document.createElement('div');
  overlay.className = 'js-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const jitter = document.createElement('div');
  jitter.className = 'js-jitter';
  const layer = document.createElement('div');
  layer.className = 'js-layer';
  jitter.append(layer);
  overlay.append(channelDefs(), jitter);
  root.append(overlay);

  // All faces are built at boot and live in the DOM (hidden via visibility), so showing is a class toggle.
  const faceEls = new Map<ScareKind, HTMLElement>();
  for (const kind of KINDS) {
    const html = buildFace(kind);
    const el = document.createElement('div');
    el.className = 'js-face';
    el.innerHTML =
      `<div class="js-copy">${html}</div>` +
      `<div class="js-copy js-r">${html}</div>` +
      `<div class="js-copy js-c">${html}</div>`;
    layer.append(el);
    faceEls.set(kind, el);
  }
  let active = false;
  let count = 0;
  let current: Promise<void> = Promise.resolve();
  let flashTimer = 0;
  let darkTimer = 0;
  let warming = true;

  const blockInput = (e: Event): void => {
    e.stopImmediatePropagation();
    e.preventDefault();
  };
  const setInputBlocked = (on: boolean): void => {
    for (const t of BLOCKED_EVENTS) {
      if (on) window.addEventListener(t, blockInput, true);
      else window.removeEventListener(t, blockInput, true);
    }
  };

  /** Rasterise every face once (near-invisible, one frame each) so the first real scare paints at once. */
  function warmUp(): void {
    const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
    void (async () => {
      overlay.classList.add('js-warm');
      for (const kind of KINDS) {
        if (!warming) break;
        const el = faceEls.get(kind);
        el?.classList.add('js-show');
        await frame();
        await frame();
        el?.classList.remove('js-show');
      }
      overlay.classList.remove('js-warm');
    })();
  }
  warmUp();

  /** Wall-clock driven (setTimeout), independent of the game's dt, so it can never stick at white. */
  function runFlash(): void {
    window.clearTimeout(flashTimer);
    hooks.flash(1);
    const t0 = performance.now();
    const step = (): void => {
      const e = performance.now() - t0 - FLASH_HOLD_MS;
      const v = Math.max(0, 1 - e / FLASH_FADE_MS);
      hooks.flash(v);
      if (v > 0) flashTimer = window.setTimeout(step, FLASH_STEP_MS);
    };
    flashTimer = window.setTimeout(step, FLASH_HOLD_MS);
  }

  function jumpscare(kind: ScareKind, opts: ScareOpts = {}): Promise<void> {
    if (active) return current;
    const ms = Math.max(120, opts.durationMs ?? DEFAULT_FACE_MS);
    active = true;
    count++;

    warming = false;
    overlay.classList.remove('js-warm');
    for (const el of faceEls.values()) el.classList.remove('js-show');
    faceEls.get(kind)?.classList.add('js-show');
    overlay.style.setProperty('--js-dur', `${ms}ms`);
    window.clearTimeout(darkTimer);
    overlay.classList.remove('js-dark');
    overlay.classList.remove('js-on');
    void overlay.offsetWidth; // restart animations
    overlay.classList.add('js-on'); // same frame: face visible, no timer before it
    setInputBlocked(true);

    runFlash();
    hooks.shake(0.5, 0.3);
    sting(kind, { quiet: opts.quiet, volume: opts.volume });

    current = new Promise<void>((resolve) => {
      window.setTimeout(() => {
        overlay.classList.remove('js-on');
        for (const el of faceEls.values()) el.classList.remove('js-show');
        overlay.classList.add('js-dark');
        darkTimer = window.setTimeout(() => overlay.classList.remove('js-dark'), DARK_BEAT_MS);
        setInputBlocked(false);
        active = false;
        hooks.silence(2);
        resolve();
      }, ms + FADE_OUT_MS);
    });
    return current;
  }

  return {
    jumpscare,
    get active() {
      return active;
    },
    get count() {
      return count;
    },
  };
}
