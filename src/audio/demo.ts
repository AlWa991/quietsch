import { installAudioUnlock } from './context';
import { createAmbience } from './ambience';
import { sfx } from './sfx';
import { createDread } from './dread';
import { enemySfx } from './enemies-sfx';
import type { EnemySfxKind } from './enemies-sfx';

/** Debug panel for ?audio=1. */
export function mountAudioDemo(root: HTMLElement): void {
  installAudioUnlock();
  const amb = createAmbience();
  const dread = createDread();
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

  const r6 = row();
  button(r6, 'dread start', () => dread.start());
  button(r6, 'dread stop', () => dread.stop());
  button(r6, 'creak', () => dread.creak());
  button(r6, 'steps overhead', () => dread.footstepsOverhead());
  button(r6, 'giggle', () => dread.giggle());
  button(r6, 'door squeak', () => dread.doorSqueak());
  button(r6, 'breathing on', () => dread.breathing(true));
  button(r6, 'breathing off', () => dread.breathing(false));
  button(r6, 'whisper riser 5s', () => dread.whisperRiser(5));
  button(r6, 'silence 3s', () => dread.silence(3));
  let dreadTime = 0;
  const dreadTimer = setInterval(() => {
    dreadTime += 0.1;
    dread.update(0.1, { playTime: dreadTime * 10, inKorb: false, danger: 0, room: null });
  }, 100);
  void dreadTimer;

  const kinds: EnemySfxKind[] = ['socke', 'hand', 'rudi', 'teddy', 'kuerbis', 'spinne'];
  const r7 = row();
  button(r7, 'peckWhoosh', () => enemySfx.peckWhoosh());
  let peck = 1;
  button(r7, 'peckHit (n++)', () => {
    enemySfx.peckHit(peck);
    peck = peck >= 3 ? 1 : peck + 1;
  });
  button(r7, 'playerHurt', () => enemySfx.playerHurt());
  button(r7, 'feather', () => enemySfx.featherPickup());
  button(r7, 'streak 2', () => enemySfx.streak(2));
  button(r7, 'streak 3', () => enemySfx.streak(3));
  button(r7, 'stun', () => enemySfx.stun());

  const r8 = row();
  for (const k of kinds) button(r8, 'hurt ' + k, () => enemySfx.hurt(k));
  const r9 = row();
  for (const k of kinds) button(r9, 'death ' + k, () => enemySfx.death(k));

  const r10 = row();
  button(r10, 'teddySwing', () => enemySfx.teddySwing());
  button(r10, 'roll on', () => enemySfx.pumpkinRoll(true));
  button(r10, 'roll off', () => enemySfx.pumpkinRoll(false));
  button(r10, 'beep', () => enemySfx.pumpkinBeep());
  button(r10, 'pumpkin boom', () => enemySfx.pumpkinExplode());
  button(r10, 'spiderDrop', () => enemySfx.spiderDrop());
  button(r10, 'spiderHiss', () => enemySfx.spiderHiss());
  button(r10, 'rudiStun', () => enemySfx.rudiStun());
  button(r10, 'rudiExplode', () => enemySfx.rudiExplode());
  button(r10, 'drums on', () => enemySfx.hordeDrums(true));
  button(r10, 'drums off', () => enemySfx.hordeDrums(false));
  button(r10, 'hordeWin', () => enemySfx.hordeWin());

  root.appendChild(panel);
}
