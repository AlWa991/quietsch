import { el } from './dom';

export interface Prompt {
  /** Show "E · <text>"; null hides. Cheap to call every frame (only touches the DOM on change). */
  set(text: string | null): void;
}

export function createPrompt(root: HTMLElement): Prompt {
  const node = el('div', 'q-prompt');
  const key = el('span', 'q-prompt__key', 'E');
  const label = el('span', 'q-prompt__label');
  node.append(key, label);
  node.hidden = true;
  root.append(node);
  let current: string | null = null;
  return {
    set(text) {
      if (text === current) return;
      current = text;
      node.hidden = text === null;
      if (text !== null) label.textContent = text;
    },
  };
}

export interface BatteryHud {
  set(visible: boolean, level: number, on: boolean): void;
}

/** Flashlight battery chip (bottom left). Quantised to avoid DOM writes every frame. */
export function createBattery(root: HTMLElement): BatteryHud {
  const node = el('div', 'q-battery');
  const key = el('span', 'q-prompt__key', 'F');
  const bar = el('div', 'q-battery__bar');
  const fill = el('div', 'q-battery__fill');
  bar.append(fill);
  node.append(key, bar);
  node.hidden = true;
  root.append(node);
  let lastVisible = false;
  let lastLevel = -1;
  let lastOn = false;
  return {
    set(visible, level, on) {
      const q = Math.round(level * 40);
      if (visible === lastVisible && q === lastLevel && on === lastOn) return;
      lastVisible = visible;
      lastLevel = q;
      lastOn = on;
      node.hidden = !visible;
      fill.style.width = `${Math.round(level * 100)}%`;
      node.classList.toggle('q-battery--on', on);
      node.classList.toggle('q-battery--low', level < 0.2);
    },
  };
}
