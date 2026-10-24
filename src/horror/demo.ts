import { createJumpscares } from './jumpscare';
import type { ScareKind } from './jumpscare';
import { installAudioUnlock } from '../audio/context';

declare global {
  interface Window {
    __scareDemo?: {
      show(kind: ScareKind | 'random', quiet?: boolean, durationMs?: number): Promise<void>;
    };
  }
}

const KINDS: ScareKind[] = ['socke', 'teddy', 'kuerbis', 'rudi', 'hand', 'spinne', 'spiegel'];

/** `?scare=1`: preview every jumpscare face. */
export function mountScareDemo(root: HTMLElement): void {
  installAudioUnlock();
  document.body.style.background = '#1b1b24';

  const flashEl = document.createElement('div');
  flashEl.style.cssText =
    'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:850';
  root.append(flashEl);

  const scares = createJumpscares(root, {
    shake(amp, seconds) {
      const px = amp * 24;
      document.body.animate(
        [
          { transform: `translate(${px}px, ${-px / 2}px)` },
          { transform: `translate(${-px}px, ${px / 2}px)` },
          { transform: `translate(${px / 2}px, ${px}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: seconds * 1000, easing: 'steps(6)' },
      );
    },
    flash(v) {
      flashEl.style.opacity = String(v);
    },
    silence(seconds) {
      console.info(`[scare] silence ${seconds}s`);
    },
  });

  const show = (kind: ScareKind | 'random', quiet = false, durationMs?: number): Promise<void> => {
    const k =
      kind === 'random' ? (KINDS[Math.floor(Math.random() * KINDS.length)] ?? 'socke') : kind;
    return scares.jumpscare(k, { quiet, durationMs });
  };
  window.__scareDemo = { show };

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:16px;top:16px;display:flex;flex-wrap:wrap;gap:8px;max-width:420px;padding:12px;background:#0008;border-radius:8px;z-index:10;font:14px sans-serif;color:#fff';
  const title = document.createElement('div');
  title.style.cssText = 'width:100%';
  title.textContent = 'Jumpscare-Vorschau (Klick = Sting + Fratze)';
  panel.append(title);
  const add = (id: string, label: string, run: () => void): void => {
    const b = document.createElement('button');
    b.id = id;
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'padding:8px 12px;font-size:14px;cursor:pointer';
    b.addEventListener('click', run);
    panel.append(b);
  };
  for (const k of KINDS) add(`scare-${k}`, k, () => void show(k));
  add('scare-quiet-spiegel', 'quiet spiegel', () => void show('spiegel', true));
  add('scare-random', 'random', () => void show('random'));
  root.append(panel);
}
