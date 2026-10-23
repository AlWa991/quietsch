import { el } from './dom';

let host: HTMLElement | null = null;

export function mountStoryCardHost(root: HTMLElement): void {
  host = root;
}

export function showStoryCard(card: {
  title: string;
  text: string;
  button?: string;
}): Promise<void> {
  const parent = host;
  if (!parent) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const overlay = el('div', 'q-story');
    const panel = el('div', 'q-story__card');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.appendChild(el('h2', 'q-story__title', card.title));
    const body = el('div', 'q-story__text');
    for (const para of card.text.split('\n\n')) body.appendChild(el('p', undefined, para));
    panel.appendChild(body);
    const btn = el('button', 'q-btn q-btn--primary', card.button ?? 'Weiter');
    btn.type = 'button';
    panel.appendChild(btn);
    overlay.appendChild(panel);

    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKey, true);
      overlay.classList.add('q-story--out');
      const remove = (): void => overlay.remove();
      overlay.addEventListener('animationend', remove, { once: true });
      window.setTimeout(remove, 500);
      resolve();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    btn.addEventListener('click', close);
    parent.appendChild(overlay);
    btn.focus({ preventScroll: true });
  });
}
