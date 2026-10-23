import { el } from './dom';

export type FloatKind = 'feather' | 'combo' | 'danger' | 'info';

let layer: HTMLElement | null = null;

export function mountFloatLayer(root: HTMLElement): void {
  layer = el('div', 'q-float-layer');
  root.appendChild(layer);
}

export function spawnFloat(text: string, screenX: number, screenY: number, kind: FloatKind): void {
  if (!layer) return;
  const node = el('div', `q-float q-float--${kind}`, text);
  node.style.left = `${screenX}px`;
  node.style.top = `${screenY}px`;
  const remove = (): void => node.remove();
  node.addEventListener('animationend', remove, { once: true });
  window.setTimeout(remove, 1500); // safety net if animations are disabled
  layer.appendChild(node);
}
