import type { Store } from './store';
import { el, prefersReducedMotion, replay } from './dom';
import { mountFloatLayer, spawnFloat } from './float';
import { createHud, type Hud } from './hud';
import { hideMission, mountMission, showMission, updateMissionProgress } from './mission';
import { mountStoryCardHost, showStoryCard } from './story-card';
import { mountToastStack, toast } from './toast';
import { rankName } from './texts';

export interface Ui {
  hud: Hud;
  spawnFloat: typeof spawnFloat;
  toast: typeof toast;
  showStoryCard: typeof showStoryCard;
  showMission: typeof showMission;
  hideMission: typeof hideMission;
}

/**
 * Mounts the DOM overlay and binds store events.
 * Contract: systems call store.set() first, then store.emit(); the UI only reads store.get().
 */
export function initUi(root: HTMLElement, store: Store): Ui {
  const flash = el('div', 'q-flash');
  root.append(flash);
  const hud = createHud(root, store);
  mountMission(root);
  mountFloatLayer(root);
  mountToastStack(root);
  mountStoryCardHost(root);

  store.on('feathers', () => hud.onFeathers());
  store.on('ghostlight', () => hud.onGhostlight());
  store.on('mission-complete', () => hud.onStars());
  store.on('heart-lost', () => {
    hud.onHeartLost();
    if (!prefersReducedMotion()) replay(flash, 'q-flash--danger');
  });
  store.on('rank-up', () => {
    hud.onRankUp();
    toast('Neuer Rang!', rankName(store.get().rank));
    if (!prefersReducedMotion()) replay(flash, 'q-flash--rank');
  });
  store.on('mission-progress', (e) => updateMissionProgress(e.progress, e.goal));

  return { hud, spawnFloat, toast, showStoryCard, showMission, hideMission };
}

export { spawnFloat, toast, showStoryCard, showMission, hideMission };
export type { Hud };
