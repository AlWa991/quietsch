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

export interface BaitHud {
  /** `ready` 0..1 = cooldown progress (1 = can throw). */
  set(visible: boolean, ready: number): void;
}

/** Köder chip (bottom left, above the battery): Shift key + ball with a cooldown sweep. */
export function createBaitHud(root: HTMLElement): BaitHud {
  const node = el('div', 'q-bait');
  const key = el('span', 'q-prompt__key q-bait__key', '⇧');
  const ball = el('div', 'q-bait__ball');
  node.append(key, ball);
  node.hidden = true;
  node.title = 'Köder';
  root.append(node);
  let lastVisible = false;
  let lastReady = -1;
  return {
    set(visible, ready) {
      const q = Math.round(ready * 24);
      if (visible === lastVisible && q === lastReady) return;
      lastVisible = visible;
      lastReady = q;
      node.hidden = !visible;
      ball.style.setProperty('--ready', String(q / 24));
      node.classList.toggle('q-bait--ready', q === 24);
    },
  };
}

export interface CollarHud {
  set(visible: boolean, active: number, cooldown: number): void;
}

/** Bellos Halsband chip (bottom left, above the Köder): Q + countdown while worn / recharging. */
export function createCollarHud(root: HTMLElement): CollarHud {
  const node = el('div', 'q-collar');
  const key = el('span', 'q-prompt__key', 'Q');
  const label = el('span', 'q-collar__label');
  node.append(key, label);
  node.hidden = true;
  root.append(node);
  let last = '';
  return {
    set(visible, active, cooldown) {
      const text = !visible
        ? ''
        : active > 0
          ? `Halsband ${Math.ceil(active)} s`
          : cooldown > 0
            ? `bereit in ${Math.ceil(cooldown)} s`
            : 'Halsband bereit';
      if (text === last) return;
      last = text;
      node.hidden = !visible;
      label.textContent = text;
      node.classList.toggle('q-collar--on', active > 0);
    },
  };
}
