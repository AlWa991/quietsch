import { el } from './dom';

const MAX_TOASTS = 4;
let stack: HTMLElement | null = null;

export function mountToastStack(root: HTMLElement): void {
  stack = el('div', 'q-toasts');
  stack.setAttribute('role', 'status');
  stack.setAttribute('aria-live', 'polite');
  root.appendChild(stack);
}

export function toast(title: string, sub?: string): void {
  if (!stack) return;
  const node = el('div', 'q-toast');
  node.appendChild(el('div', 'q-toast__title', title));
  if (sub) node.appendChild(el('div', 'q-toast__sub', sub));
  stack.appendChild(node);
  while (stack.children.length > MAX_TOASTS) stack.firstElementChild?.remove();
  window.setTimeout(() => {
    node.classList.add('q-toast--out');
    const remove = (): void => node.remove();
    node.addEventListener('animationend', remove, { once: true });
    window.setTimeout(remove, 400);
  }, 2200);
}
