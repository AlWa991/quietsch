import { initUi } from './index';
import { createStore, initialGameState } from './store';
import { el } from './dom';

export function mountUiDemo(root: HTMLElement): void {
  const store = createStore({
    ...initialGameState(),
    feathers: 128,
    ghostlights: 2,
    xp: 140,
    rank: 2,
  });
  const ui = initUi(root, store);
  ui.showMission('Finde den Schlüssel in der richtigen Kiste.', 2, 6);

  const panel = el('div', 'q-demo');
  panel.append(el('div', 'q-demo__title', 'UI-Demo'));
  const add = (label: string, fn: () => void): void => {
    const b = el('button', 'q-btn', label);
    b.type = 'button';
    b.addEventListener('click', fn);
    panel.appendChild(b);
  };
  const rnd = (n: number): number => Math.random() * n;

  add('Federn +5', () => {
    store.set({ feathers: store.get().feathers + 5 });
    store.emit({ type: 'feathers', amount: 5 });
    ui.spawnFloat('+5', innerWidth / 2 + rnd(80) - 40, innerHeight / 2, 'feather');
  });
  add('Combo ×3!', () => ui.spawnFloat('×3!', innerWidth / 2, innerHeight / 2 - 40, 'combo'));
  add('Gefangen (Float)', () =>
    ui.spawnFloat('−30 % Federn', innerWidth / 2, innerHeight / 2, 'danger'),
  );
  add('Info (Float)', () => ui.spawnFloat('Hohl.', innerWidth / 2, innerHeight / 2, 'info'));
  add('Herz verloren', () => {
    const s = store.get();
    store.set({ hearts: s.hearts > 0 ? s.hearts - 1 : s.maxHearts });
    store.emit({ type: 'heart-lost', by: 'socke' });
  });
  add('Geisterlicht', () => {
    store.set({ ghostlights: store.get().ghostlights + 1 });
    store.emit({ type: 'ghostlight', amount: 1 });
  });
  add('Rang-Up', () => {
    const rank = Math.min(5, store.get().rank + 1);
    store.set({ rank, xp: 0 });
    store.emit({ type: 'rank-up', rank });
  });
  add('Toast', () => ui.toast('Schloss 1 von 3 offen', 'Noch zwei Schlüssel.'));
  add('Story-Karte', () => store.emit({ type: 'story-card', cardId: 'twist1' }));
  add('Intro-Karte', () => store.emit({ type: 'story-card', cardId: 'intro' }));
  add('Mission +1', () => {
    miss = (miss + 1) % 7;
    store.emit({ type: 'mission-progress', missionId: 'm1', progress: miss, goal: 6 });
  });
  let miss = 2;
  root.appendChild(panel);
}
