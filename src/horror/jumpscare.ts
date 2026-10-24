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
const DARK_BEAT_MS = 2000;
const DEFAULT_FACE_MS = 700;

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

  const faces = new Map<ScareKind, string>();
  let active = false;
  let count = 0;
  let current: Promise<void> = Promise.resolve();
  let flashTimer = 0;
  let darkTimer = 0;

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

  function faceMarkup(kind: ScareKind): string {
    let html = faces.get(kind);
    if (html === undefined) {
      html = buildFace(kind);
      faces.set(kind, html);
    }
    return html;
  }

  function jumpscare(kind: ScareKind, opts: ScareOpts = {}): Promise<void> {
    if (active) return current;
    const ms = Math.max(120, opts.durationMs ?? DEFAULT_FACE_MS);
    active = true;
    count++;

    const html = faceMarkup(kind);
    layer.innerHTML =
      `<div class="js-copy">${html}</div>` +
      `<div class="js-copy js-r">${html}</div>` +
      `<div class="js-copy js-c">${html}</div>`;
    // chromatic copies are decoration: drop duplicate ids' side effects by keeping them identical
    overlay.style.setProperty('--js-dur', `${ms}ms`);
    window.clearTimeout(darkTimer);
    overlay.classList.remove('js-dark');
    overlay.classList.remove('js-on');
    void overlay.offsetWidth; // restart animations
    overlay.classList.add('js-on');

    runFlash();
    hooks.shake(0.5, 0.3);
    sting(kind, { quiet: opts.quiet, volume: opts.volume });

    current = new Promise<void>((resolve) => {
      window.setTimeout(() => {
        overlay.classList.remove('js-on');
        layer.innerHTML = '';
        overlay.classList.add('js-dark');
        darkTimer = window.setTimeout(() => overlay.classList.remove('js-dark'), DARK_BEAT_MS);
        active = false;
        hooks.silence(2);
        resolve();
      }, ms);
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
