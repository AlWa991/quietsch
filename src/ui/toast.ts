import { el } from './dom';

/** Visible toasts; the newest sits on top at full size, older ones collapse to their title. */
const MAX_TOASTS = 3;
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
  for (const old of Array.from(stack.children)) old.classList.add('q-toast--old');
  stack.prepend(node);
  while (stack.children.length > MAX_TOASTS) stack.lastElementChild?.remove();
  window.setTimeout(() => {
    node.classList.add('q-toast--out');
    const remove = (): void => node.remove();
    node.addEventListener('animationend', remove, { once: true });
    window.setTimeout(remove, 400);
  }, 2200);
}
