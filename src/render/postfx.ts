import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { RenderContext } from './scene';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, strength: { value: 0.9 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - smoothstep(0.35, 0.85, d) * strength;
      gl_FragColor = c;
    }
  `,
};

export interface PostFx {
  render(dt: number): void;
}

export function createPostFx(ctx: RenderContext): PostFx {
  const { renderer, scene, camera } = ctx;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(size, 0.35, 0.6, 0.85));
  composer.addPass(new ShaderPass(VignetteShader));
  composer.addPass(new OutputPass());

  ctx.onResize((w, h) => composer.setSize(w, h));
  composer.setSize(size.x, size.y);

  return { render: (dt) => composer.render(dt) };
}
