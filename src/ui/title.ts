import { el } from './dom';
import { TITLE } from './texts';

/** Title screen. Resolves with the player's choice and removes itself. */
export function showTitle(root: HTMLElement, hasSave: boolean): Promise<'new' | 'continue'> {
  return new Promise((resolve) => {
    const overlay = el('div', 'q-title');
    const card = el('div', 'q-title__card');
    card.append(
      el('h1', 'q-title__logo', TITLE.title),
      el('div', 'q-title__sub', TITLE.subtitle),
      el('p', 'q-title__premise', TITLE.premise),
    );
    const controls = el('dl', 'q-title__controls');
    for (const [key, what] of TITLE.controls) {
      controls.append(el('dt', undefined, key), el('dd', undefined, what));
    }
    card.append(controls);
    const buttons = el('div', 'q-title__buttons');
    const play = el('button', 'q-btn q-btn--primary', TITLE.play);
    play.type = 'button';
    play.dataset.testid = 'play';
    buttons.append(play);
    let cont: HTMLButtonElement | null = null;
    if (hasSave) {
      cont = el('button', 'q-btn q-btn--primary', TITLE.continue);
      cont.type = 'button';
      cont.dataset.testid = 'continue';
      buttons.prepend(cont);
    }
    card.append(buttons);
    overlay.append(card);
    root.append(overlay);
    (cont ?? play).focus({ preventScroll: true });

    const done = (choice: 'new' | 'continue'): void => {
      overlay.classList.add('q-title--out');
      window.setTimeout(() => overlay.remove(), 350);
      resolve(choice);
    };
    play.addEventListener('click', () => done('new'), { once: true });
    cont?.addEventListener('click', () => done('continue'), { once: true });
  });
}
