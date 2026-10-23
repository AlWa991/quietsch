import { installAudioUnlock } from './context';
import { createAmbience } from './ambience';
import { sfx } from './sfx';

/** Debug panel for ?audio=1. */
export function mountAudioDemo(root: HTMLElement): void {
  installAudioUnlock();
  const amb = createAmbience();
  const panel = document.createElement('div');
  panel.id = 'audio-demo';
  panel.style.cssText =
    'position:fixed;top:8px;left:8px;z-index:9999;pointer-events:auto;display:flex;' +
    'flex-direction:column;gap:6px;padding:10px;background:#000c;color:#fff;' +
    'font:13px sans-serif;border-radius:8px;max-width:260px';

  const row = (): HTMLDivElement => {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;align-items:center';
    panel.appendChild(d);
    return d;
  };
  const button = (parent: HTMLElement, label: string, fn: () => void): void => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', fn);
    parent.appendChild(b);
  };
  const slider = (
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onInput: (v: number) => void,
  ): HTMLInputElement => {
    const l = document.createElement('label');
    l.textContent = label + ' ';
    const i = document.createElement('input');
    i.type = 'range';
    i.min = String(min);
    i.max = String(max);
    i.step = String(step);
    i.value = String(value);
    const out = document.createElement('span');
    out.textContent = i.value;
    i.addEventListener('input', () => {
      out.textContent = i.value;
      onInput(Number(i.value));
    });
    l.append(i, out);
    parent.appendChild(l);
    return i;
  };

  const r1 = row();
  button(r1, 'squeak', () => sfx.squeak());
  button(r1, 'pickup', () => sfx.pickup());
  button(r1, 'caught', () => sfx.caught());
  button(r1, 'rankUp', () => sfx.rankUp());
  button(r1, 'lightning', () => sfx.lightningSting());
  button(r1, 'doorbell', () => sfx.doorbell());
  button(r1, 'uiClick', () => sfx.uiClick());

  const r2 = row();
  let combo = 1;
  button(r2, 'combo (n++)', () => {
    sfx.combo(combo);
    combo = combo >= 12 ? 1 : combo + 1;
  });

  const r3 = row();
  let hold = 0.8;
  slider(r3, 'hold s', 0.2, 1.5, hold, 0.05, (v) => (hold = v));
  button(r3, 'scream', () => sfx.scream(hold));

  const r4 = row();
  button(r4, 'ambience start', () => amb.start());
  button(r4, 'ambience stop', () => amb.stop());
  button(r4, 'thunder', () => amb.thunder(0.8));

  const r5 = row();
  slider(r5, 'danger', 0, 1, 0, 0.01, (v) => amb.setDanger(v));

  root.appendChild(panel);
}
