import * as THREE from 'three';
import {
  SONAR,
  comboBonus,
  crossed,
  distToRect,
  ringAlpha,
  ringFront,
  ringLifetime,
  sonarRadius,
} from '@/core/sonar';
import type { RevealSystem, Revealable } from '@/render/reveal';

const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const RING_FRAG = /* glsl */ `
  uniform float uFront;
  uniform float uMax;
  uniform float uAlpha;
  uniform float uWidth;
  uniform float uFill;
  uniform vec3 uColor;
  uniform sampler2D uMask;
  uniform vec2 uMapSize;
  varying vec2 vUv;
  varying vec2 vWorld;
  void main() {
    float d = length(vUv - 0.5) * 2.0 * uMax;
    if (d > uMax + uWidth) discard;
    // Only paint walkable floor (mask = 1), never walls or the void outside.
    float mask = texture2D(uMask, vWorld / uMapSize).r;
    if (mask < 0.5) discard;
    float x = (d - uFront) / uWidth;
    float band = exp(-x * x);
    float inside = step(d, uFront);
    float trail = inside * smoothstep(0.0, uFront + 0.001, d) * uFill;
    float ripple = inside * uFill * 1.2 * (0.5 + 0.5 * sin((uFront - d) * 4.0)) * smoothstep(uFront - 2.5, uFront, d);
    float a = (band + trail + ripple) * uAlpha;
    gl_FragColor = vec4(uColor, a);
  }
`;

const planeGeo = new THREE.PlaneGeometry(2, 2);
planeGeo.rotateX(-Math.PI / 2);

export interface FloorMask {
  texture: THREE.Texture;
  width: number;
  height: number;
}

function ringMaterial(color: THREE.Color, mask: FloorMask): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    uniforms: {
      uFront: { value: 0 },
      uMax: { value: 1 },
      uAlpha: { value: 0 },
      uWidth: { value: 0.45 },
      uFill: { value: 0.025 },
      uColor: { value: color },
      uMask: { value: mask.texture },
      uMapSize: { value: new THREE.Vector2(mask.width, mask.height) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  x: number;
  z: number;
  max: number;
  t: number;
  prevFront: number;
  combo: number;
  comboDone: boolean;
  /** Fired by an object (toy box echo), not by the chicken. */
  echo: boolean;
}

export interface FireOptions {
  /** Upgrade stats (Große Lunge). */
  maxRadius?: number;
  maxHold?: number;
  /** Fixed radius override (echo rings). */
  radius?: number;
  echo?: boolean;
}

export interface SonarHooks {
  /** A prop was revealed by sonar for the first time. */
  onFirstReveal(r: Revealable, comboCount: number): void;
  /** Combo bonus at the end of a scream with >= 2 first-time reveals. */
  onCombo(count: number, bonus: number, x: number, z: number): void;
  /** Ring front passed a spook. */
  onSpookHeard(r: Revealable, originX: number, originZ: number, echo: boolean): void;
  /** Ring front passed any prop (every time, not only the first). */
  onPropHit(r: Revealable, echo: boolean): void;
}

export interface SonarSystem {
  /** Fire a ring at (x, z) for a given hold duration. Returns the max radius. */
  fire(holdSeconds: number, x: number, z: number, opts?: FireOptions): number;
  /** Charge preview while holding (radius preview circle); hold < 0 hides it. */
  preview(
    holdSeconds: number,
    x: number,
    z: number,
    time: number,
    maxRadius?: number,
    maxHold?: number,
  ): void;
  update(dt: number): void;
}

export function createSonarSystem(
  scene: THREE.Scene,
  reveal: RevealSystem,
  mask: FloorMask,
  hooks: SonarHooks,
): SonarSystem {
  const color = new THREE.Color(0.42, 0.72, 1.3);
  const echoColor = new THREE.Color(1.3, 0.95, 0.35);
  const rings: Ring[] = [];
  for (let i = 0; i < 4; i++) {
    const mat = ringMaterial(color, mask);
    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    scene.add(mesh);
    rings.push({
      mesh,
      mat,
      active: false,
      x: 0,
      z: 0,
      max: 0,
      t: 0,
      prevFront: 0,
      combo: 0,
      comboDone: false,
      echo: false,
    });
  }

  const previewMat = ringMaterial(new THREE.Color(1.0, 0.85, 0.4), mask);
  previewMat.uniforms.uWidth!.value = 0.08;
  previewMat.uniforms.uFill!.value = 0;
  const previewMesh = new THREE.Mesh(planeGeo, previewMat);
  previewMesh.visible = false;
  previewMesh.renderOrder = 3;
  scene.add(previewMesh);

  const setU = (m: THREE.ShaderMaterial, name: string, v: number): void => {
    const u = m.uniforms[name];
    if (u) u.value = v;
  };

  return {
    fire(hold, x, z, opts) {
      const max = opts?.radius ?? sonarRadius(hold, opts?.maxRadius, opts?.maxHold);
      let ring = rings.find((r) => !r.active);
      if (!ring) ring = rings.reduce((a, b) => (a.t > b.t ? a : b));
      ring.active = true;
      ring.x = x;
      ring.z = z;
      ring.max = max;
      ring.t = 0;
      ring.prevFront = 0;
      ring.combo = 0;
      ring.comboDone = false;
      ring.echo = opts?.echo === true;
      ring.mat.uniforms.uColor!.value = ring.echo ? echoColor : color;
      ring.mesh.visible = true;
      ring.mesh.position.set(x, 0.04, z);
      ring.mesh.scale.set(max + 0.5, 1, max + 0.5);
      setU(ring.mat, 'uMax', max + 0.5);
      setU(ring.mat, 'uWidth', max > SONAR.tapRadius + 0.5 ? 0.4 : 0.28);
      return max;
    },
    preview(hold, x, z, time, maxRadius, maxHold) {
      if (hold < 0) {
        previewMesh.visible = false;
        return;
      }
      const r = sonarRadius(hold, maxRadius, maxHold);
      previewMesh.visible = true;
      previewMesh.position.set(x, 0.03, z);
      previewMesh.scale.set(r + 0.3, 1, r + 0.3);
      setU(previewMat, 'uMax', r + 0.3);
      setU(previewMat, 'uFront', r);
      setU(previewMat, 'uAlpha', 0.35 + 0.15 * Math.sin(time * 18));
    },
    update(dt) {
      for (const ring of rings) {
        if (!ring.active) continue;
        ring.t += dt;
        const front = ringFront(ring.t, ring.max);
        setU(ring.mat, 'uFront', front);
        setU(ring.mat, 'uAlpha', ringAlpha(ring.t, ring.max));

        for (const r of reveal.items) {
          const d = distToRect(ring.x, ring.z, r.minX, r.minZ, r.maxX, r.maxZ);
          if (!crossed(d, ring.prevFront, front) && !(ring.prevFront === 0 && d === 0)) continue;
          reveal.hit(r);
          if (r.kind === 'spook') hooks.onSpookHeard(r, ring.x, ring.z, ring.echo);
          else if (r.kind === 'prop') {
            hooks.onPropHit(r, ring.echo);
            if (!r.rewarded) {
              r.rewarded = true;
              ring.combo++;
              hooks.onFirstReveal(r, ring.combo);
            }
          }
        }
        ring.prevFront = front;

        if (!ring.comboDone && front >= ring.max) {
          ring.comboDone = true;
          if (ring.combo >= 2) hooks.onCombo(ring.combo, comboBonus(ring.combo), ring.x, ring.z);
        }
        if (ring.t >= ringLifetime(ring.max)) {
          ring.active = false;
          ring.mesh.visible = false;
        }
      }
    },
  };
}
