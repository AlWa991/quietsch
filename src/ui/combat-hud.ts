import './combat.css';
import { COMBAT_T } from './texts';

export type DamageKind = 'normal' | 'crit' | 'immune' | 'hurt';

export interface CombatHud {
  /** Pooled floating number at a screen point. */
  number(text: string, sx: number, sy: number, kind: DamageKind): void;
  /** Hits in the current chain (0 hides the counter). */
  combo(n: number): void;
}

const POOL = 24;

export function createCombatHud(root: HTMLElement): CombatHud {
  const layer = document.createElement('div');
  layer.className = 'q-dmg-layer';
  const nodes: HTMLDivElement[] = [];
  for (let i = 0; i < POOL; i++) {
    const n = document.createElement('div');
    n.className = 'q-dmg';
    layer.appendChild(n);
    nodes.push(n);
  }
  const comboEl = document.createElement('div');
  comboEl.className = 'q-combo';
  layer.appendChild(comboEl);
  root.appendChild(layer);
  let next = 0;
  let shown = 0;

  return {
    number(text, sx, sy, kind) {
      const n = nodes[next];
      next = (next + 1) % POOL;
      if (!n) return;
      n.textContent = text;
      n.className = kind === 'normal' ? 'q-dmg' : `q-dmg q-dmg--${kind}`;
      n.style.setProperty('--x', `${sx}px`);
      n.style.setProperty('--y', `${sy}px`);
      n.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 50)}px`);
      void n.offsetWidth; // restart the animation on a reused node
      n.classList.add('is-on');
    },
    combo(n) {
      if (n === shown) return;
      shown = n;
      if (n < 2) {
        comboEl.classList.remove('is-on');
        return;
      }
      comboEl.textContent = COMBAT_T.combo(n);
      comboEl.classList.add('is-on');
      comboEl.classList.remove('is-bump');
      void comboEl.offsetWidth;
      comboEl.classList.add('is-bump');
    },
  };
}
