import { el } from './dom';
import { CHOICE, ENDINGS, RESULTS } from './texts';
import type { EndingId } from '@/core/story';

export interface Choice {
  readonly result: Promise<EndingId>;
  /** Programmatic pick (e2e / debug). */
  pick(id: EndingId): void;
}

/** Finale choice: scream (Ende A) or stay silent (Ende B). Space = scream. */
export function showChoice(root: HTMLElement): Choice {
  const overlay = el('div', 'q-choice');
  const panel = el('div', 'q-choice__panel');
  panel.append(el('h2', 'q-choice__title', CHOICE.title), el('p', 'q-choice__text', CHOICE.text));
  const row = el('div', 'q-choice__row');
  const mk = (id: EndingId, label: string, sub: string): HTMLButtonElement => {
    const b = el('button', `q-btn q-choice__btn q-choice__btn--${id}`);
    b.type = 'button';
    b.dataset.testid = `choice-${id}`;
    b.append(el('span', 'q-choice__label', label), el('span', 'q-choice__sub', sub));
    b.addEventListener('click', () => pick(id));
    return b;
  };
  row.append(mk('A', CHOICE.scream, CHOICE.screamSub), mk('B', CHOICE.silent, CHOICE.silentSub));
  panel.append(row);
  overlay.append(panel);
  root.append(overlay);

  let resolve: (id: EndingId) => void = () => undefined;
  const result = new Promise<EndingId>((r) => (resolve = r));
  let picked = false;
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      pick('A');
    }
  };
  window.addEventListener('keydown', onKey, true);
  function pick(id: EndingId): void {
    if (picked) return;
    picked = true;
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
    resolve(id);
  }
  return { result, pick };
}

export interface ResultStats {
  feathers: number;
  ghostlights: number;
  stars: number;
  maxStars: number;
  rank: string;
  time: string;
  /** Keller secret found (Spendenkarton opened). */
  secret: boolean;
}

/** Ending text + mobile-game style results screen. */
export function showEnding(
  root: HTMLElement,
  id: EndingId,
  stats: ResultStats,
  onReplay: () => void,
): void {
  const overlay = el('div', `q-ending q-ending--${id}`);
  overlay.dataset.ending = id;
  const panel = el('div', 'q-ending__panel');
  const ending = ENDINGS[id];
  panel.append(el('h2', 'q-ending__title', ending.title), el('p', 'q-ending__text', ending.text));
  const res = el('div', 'q-results');
  res.append(el('h3', 'q-results__heading', RESULTS.heading));
  const rows: [string, string][] = [
    [RESULTS.feathers, String(stats.feathers)],
    [RESULTS.ghostlights, String(stats.ghostlights)],
    [
      RESULTS.stars,
      `${'★'.repeat(stats.stars)}${'☆'.repeat(Math.max(0, stats.maxStars - stats.stars))}  ${stats.stars}/${stats.maxStars}`,
    ],
    [RESULTS.rank, stats.rank],
    [RESULTS.time, stats.time],
    [RESULTS.secret, stats.secret ? RESULTS.yes : RESULTS.no],
  ];
  rows.forEach(([label, value], i) => {
    const r = el('div', 'q-results__row');
    r.style.animationDelay = `${0.25 + i * 0.1}s`;
    r.append(el('span', 'q-results__label', label), el('span', 'q-results__value', value));
    res.append(r);
  });
  panel.append(res);
  const replay = el('button', 'q-btn q-btn--primary', RESULTS.replay);
  replay.type = 'button';
  replay.dataset.testid = 'replay';
  replay.addEventListener('click', onReplay, { once: true });
  panel.append(replay);
  overlay.append(panel);
  root.append(overlay);
}
