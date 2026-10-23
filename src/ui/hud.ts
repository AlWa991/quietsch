import type { Store } from './store';
import { el, prefersReducedMotion, replay } from './dom';
import { rankName, rankProgress } from './texts';

export interface Hud {
  readonly el: HTMLElement;
  /** Snap every element to the current store state (no animation). */
  sync(): void;
  /** Count feathers up to store.get().feathers and pop. */
  onFeathers(): void;
  onHeartLost(): void;
  onGhostlight(): void;
  /** Update rank label + bar after a rank-up. */
  onRankUp(): void;
}

const COUNT_UP_MS = 600;

const HEART_PATH =
  'M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2 0 3.5 1 5.4 3 1.9-2 3.4-3 5.4-3 3.6 0 5.8 3.7 4.2 7.300C19.5 16.4 12 21 12 21z';

function heartSvg(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', HEART_PATH);
  svg.appendChild(path);
  return svg;
}

export function createHud(root: HTMLElement, store: Store): Hud {
  const wrap = el('div', 'q-hud');

  const hearts = el('div', 'q-hearts');
  hearts.setAttribute('aria-label', 'Herzen');
  const heartEls: HTMLElement[] = [];

  const feathers = el('div', 'q-chip q-chip--feather');
  feathers.append(el('span', 'q-chip__icon', '❖'));
  const featherVal = el('span', 'q-chip__value', '0');
  feathers.append(featherVal);
  feathers.title = 'Federn';

  const lights = el('div', 'q-chip q-chip--light');
  lights.append(el('span', 'q-chip__icon', '✶'));
  const lightVal = el('span', 'q-chip__value', '0');
  lights.append(lightVal);
  lights.title = 'Geisterlichter';

  const rank = el('div', 'q-rank');
  const rankLabel = el('div', 'q-rank__name');
  const rankBar = el('div', 'q-rank__bar');
  const rankFill = el('div', 'q-rank__fill');
  rankBar.appendChild(rankFill);
  rank.append(rankLabel, rankBar);

  const row = el('div', 'q-hud__row');
  row.append(feathers, lights);
  wrap.append(hearts, row, rank);
  root.appendChild(wrap);

  let displayed = 0;
  let raf = 0;

  function renderHearts(): void {
    const { hearts: cur, maxHearts } = store.get();
    while (heartEls.length < maxHearts) {
      const h = el('span', 'q-heart');
      h.appendChild(heartSvg());
      hearts.appendChild(h);
      heartEls.push(h);
    }
    while (heartEls.length > maxHearts) heartEls.pop()?.remove();
    heartEls.forEach((h, i) => h.classList.toggle('q-heart--empty', i >= cur));
  }

  function renderRank(): void {
    const s = store.get();
    rankLabel.textContent = rankName(s.rank);
    rankFill.style.width = `${Math.round(rankProgress(s.rank, s.xp) * 100)}%`;
  }

  function setFeathers(v: number): void {
    displayed = v;
    featherVal.textContent = String(Math.round(v));
  }

  function sync(): void {
    cancelAnimationFrame(raf);
    const s = store.get();
    setFeathers(s.feathers);
    lightVal.textContent = String(s.ghostlights);
    renderHearts();
    renderRank();
  }

  function onFeathers(): void {
    const target = store.get().feathers;
    cancelAnimationFrame(raf);
    replay(feathers, 'q-pop');
    if (prefersReducedMotion() || target === displayed) {
      setFeathers(target);
      return;
    }
    const from = displayed;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setFeathers(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setFeathers(target);
    };
    raf = requestAnimationFrame(tick);
  }

  function onHeartLost(): void {
    renderHearts();
    // The heart that was just lost is the first empty one.
    const lost = heartEls[store.get().hearts];
    if (lost) replay(lost, 'q-heart--break');
    replay(hearts, 'q-shake');
  }

  function onGhostlight(): void {
    lightVal.textContent = String(store.get().ghostlights);
    replay(lights, 'q-pop');
  }

  function onRankUp(): void {
    renderRank();
    replay(rank, 'q-pop');
  }

  sync();
  return { el: wrap, sync, onFeathers, onHeartLost, onGhostlight, onRankUp };
}
