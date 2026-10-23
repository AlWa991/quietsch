import * as THREE from 'three';
import { distToRect } from '@/core/sonar';
import type { RevealSystem } from '@/render/reveal';
import { WINDOW_BASE, windowMaterial } from '@/world/builder';

const MIN_GAP = 15;
const MAX_GAP = 25;
const FLASH = 0.15;
/** Everything within this distance of the chicken counts as "in view". */
const VIEW_RADIUS = 17;

export interface LightningHooks {
  onFlash(): void;
  /** Thunder follows the flash after 0.4–1 s. */
  onThunder(intensity: number): void;
  shake(amount: number, seconds: number): void;
}

export interface LightningSystem {
  update(dt: number, cx: number, cz: number): void;
  /** Trigger a strike now (debug / e2e). */
  strike(): void;
}

export function createLightning(
  scene: THREE.Scene,
  reveal: RevealSystem,
  hooks: LightningHooks,
): LightningSystem {
  const light = new THREE.DirectionalLight(0xdfe9ff, 0);
  light.position.set(-8, 30, -14);
  scene.add(light);
  scene.add(light.target);

  let next = 6 + Math.random() * 6; // first strike comes early so players learn it
  let flashT = -1;
  let thunderIn = -1;
  let thunderIntensity = 0;
  let pendingStrike = false;
  let revealedThisFlash = false;

  const schedule = (): void => {
    next = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
  };

  return {
    strike() {
      pendingStrike = true;
    },
    update(dt, cx, cz) {
      next -= dt;
      if (next <= 0 || pendingStrike) {
        pendingStrike = false;
        schedule();
        flashT = 0;
        revealedThisFlash = false;
        thunderIn = 0.4 + Math.random() * 0.6;
        thunderIntensity = 0.5 + Math.random() * 0.5;
        light.target.position.set(cx, 0, cz);
        hooks.onFlash();
        hooks.shake(0.18, 0.08);
      }

      if (flashT >= 0) {
        flashT += dt;
        // Double flicker: on, dip, on, off.
        const p = flashT / FLASH;
        const env = p < 0.35 ? 1 : p < 0.5 ? 0.25 : p < 1 ? 1 - (p - 0.5) * 1.6 : 0;
        light.intensity = env * 3.2;
        const w = 1 + env * 14;
        windowMaterial.color.setRGB(WINDOW_BASE.r * w, WINDOW_BASE.g * w, WINDOW_BASE.b * w);
        if (!revealedThisFlash) {
          revealedThisFlash = true;
          for (const r of reveal.items) {
            if (distToRect(cx, cz, r.minX, r.minZ, r.maxX, r.maxZ) <= VIEW_RADIUS) {
              reveal.hit(r, r.kind === 'floor' ? 0.6 : 0.85);
            }
          }
        }
        if (p >= 1) {
          flashT = -1;
          light.intensity = 0;
          windowMaterial.color.copy(WINDOW_BASE);
        }
      }

      if (thunderIn >= 0) {
        thunderIn -= dt;
        if (thunderIn < 0) hooks.onThunder(thunderIntensity);
      }
    },
  };
}
