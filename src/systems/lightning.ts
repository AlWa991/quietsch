import * as THREE from 'three';
import { distToRect } from '@/core/sonar';
import type { RevealSystem } from '@/render/reveal';
import { WINDOW_BASE, WINDOW_SPOTS, windowMaterial } from '@/world/builder';

const MIN_GAP = 15;
const MAX_GAP = 25;
/** Strike length (s): full-screen wash with a double flicker, then window light fades. */
const FLASH = 0.25;
/** Window light patches on the floor linger a bit after the wash. */
const AFTERGLOW = 0.6;
const PATCH_DEPTH = 3.4;
/** Everything within this distance of the chicken counts as "in view". */
const VIEW_RADIUS = 17;

export interface LightningHooks {
  onFlash(): void;
  /** Thunder follows the flash after 0.4–1 s. */
  onThunder(intensity: number): void;
  shake(amount: number, seconds: number): void;
  /** Full-screen white wash 0..1 (post-processing). */
  flash(v: number): void;
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

  const patchMat = new THREE.MeshBasicMaterial({
    map: windowPatchTexture(),
    color: 0xdfe9ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const patchGeo = new THREE.PlaneGeometry(2.2, PATCH_DEPTH);
  const patches = new THREE.Group();
  patches.visible = false;
  for (const [x, z, rot] of WINDOW_SPOTS) {
    const holder = new THREE.Group();
    holder.position.set(x, 0.02, z);
    holder.rotation.y = rot;
    const quad = new THREE.Mesh(patchGeo, patchMat);
    quad.rotation.x = -Math.PI / 2;
    quad.position.z = PATCH_DEPTH / 2 + 0.05;
    quad.userData.noReveal = true;
    holder.add(quad);
    patches.add(holder);
  }
  scene.add(patches);

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
        // Double flicker: on, dip, on, fade.
        const p = flashT / FLASH;
        const env = p < 0.35 ? 1 : p < 0.5 ? 0.3 : p < 1 ? 1 - (p - 0.5) * 1.6 : 0;
        light.intensity = env * 3.2;
        // Screen wash: blinding white first, then a dim second pulse in which the window
        // silhouettes on the floor carry the image.
        hooks.flash(p < 0.3 ? 0.92 : p < 0.5 ? 0.08 : p < 1 ? 0.4 * (1 - (p - 0.5) * 2) : 0);
        const w = 1 + env * 14;
        windowMaterial.color.setRGB(WINDOW_BASE.r * w, WINDOW_BASE.g * w, WINDOW_BASE.b * w);
        const glow = flashT < FLASH ? Math.max(env, 0.6) : 0.6 * (1 - (flashT - FLASH) / AFTERGLOW);
        patchMat.opacity = Math.max(0, glow);
        patches.visible = patchMat.opacity > 0.01;
        if (!revealedThisFlash) {
          revealedThisFlash = true;
          for (const r of reveal.items) {
            if (distToRect(cx, cz, r.minX, r.minZ, r.maxX, r.maxZ) <= VIEW_RADIUS) {
              reveal.hit(r, r.kind === 'floor' ? 0.6 : 0.85);
            }
          }
        }
        if (p >= 1) {
          light.intensity = 0;
          hooks.flash(0);
          windowMaterial.color.copy(WINDOW_BASE);
        }
        if (flashT >= FLASH + AFTERGLOW) {
          flashT = -1;
          patches.visible = false;
        }
      }

      if (thunderIn >= 0) {
        thunderIn -= dt;
        if (thunderIn < 0) hooks.onThunder(thunderIntensity);
      }
    },
  };
}

/**
 * Light falling through a window onto the floor: four panes split by a cross frame, with a
 * bare tree branch across them. Top of the texture = wall side.
 */
function windowPatchTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0.15)');
    g.fillStyle = grad;
    g.beginPath();
    // Slight trapezoid: the light spreads as it travels into the room.
    g.moveTo(18, 0);
    g.lineTo(110, 0);
    g.lineTo(128, c.height);
    g.lineTo(0, c.height);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    g.fillRect(60, 0, 9, c.height); // vertical mullion
    g.fillRect(0, 88, c.width, 9); // transom
    g.lineCap = 'round';
    g.strokeStyle = '#000';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 150);
    g.quadraticCurveTo(50, 120, 96, 40);
    g.moveTo(52, 118);
    g.lineTo(26, 70);
    g.moveTo(80, 70);
    g.lineTo(120, 60);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
