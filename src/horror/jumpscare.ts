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
    const ms = Math.max(120, opts.durationMs ?? 500);
    active = true;
    count++;

    const html = faceMarkup(kind);
    layer.innerHTML =
      `<div class="js-copy">${html}</div>` +
      `<div class="js-copy js-r">${html}</div>` +
      `<div class="js-copy js-c">${html}</div>`;
    // chromatic copies are decoration: drop duplicate ids' side effects by keeping them identical
    overlay.style.setProperty('--js-dur', `${ms}ms`);
    overlay.classList.remove('js-on');
    void overlay.offsetWidth; // restart animations
    overlay.classList.add('js-on');

    hooks.flash(1);
    hooks.shake(0.5, 0.3);
    sting(kind, { quiet: opts.quiet, volume: opts.volume });

    current = new Promise<void>((resolve) => {
      window.setTimeout(() => {
        overlay.classList.remove('js-on');
        layer.innerHTML = '';
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
