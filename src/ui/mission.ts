import { el, replay } from './dom';

let banner: HTMLElement | null = null;
let textEl: HTMLElement | null = null;
let barEl: HTMLElement | null = null;
let fillEl: HTMLElement | null = null;
let countEl: HTMLElement | null = null;

export function mountMission(root: HTMLElement): void {
  banner = el('div', 'q-mission');
  banner.hidden = true;
  textEl = el('div', 'q-mission__text');
  barEl = el('div', 'q-mission__bar');
  fillEl = el('div', 'q-mission__fill');
  barEl.appendChild(fillEl);
  countEl = el('div', 'q-mission__count');
  banner.append(textEl, barEl, countEl);
  root.appendChild(banner);
}

export function showMission(text: string, progress?: number, goal?: number): void {
  if (!banner || !textEl || !barEl || !fillEl || !countEl) return;
  const wasHidden = banner.hidden;
  banner.hidden = false;
  textEl.textContent = text;
  const hasProgress = progress !== undefined && goal !== undefined && goal > 0;
  barEl.hidden = countEl.hidden = !hasProgress;
  if (hasProgress) {
    fillEl.style.width = `${Math.min(100, (progress / goal) * 100)}%`;
    countEl.textContent = `${progress}/${goal}`;
    if (!wasHidden) replay(countEl, 'q-pop');
  }
  if (wasHidden) replay(banner, 'q-mission--in');
}

/** Update only the progress of the currently shown mission. */
export function updateMissionProgress(progress: number, goal: number): void {
  if (!banner || banner.hidden || !textEl) return;
  showMission(textEl.textContent ?? '', progress, goal);
}

export function hideMission(): void {
  if (banner) banner.hidden = true;
}
