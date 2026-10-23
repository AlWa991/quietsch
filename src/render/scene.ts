import * as THREE from 'three';

export interface RenderContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;
  /** Hook for postfx to follow canvas size changes. */
  onResize: (cb: (w: number, h: number) => void) => void;
}

/** Fixed 3/4 camera offset relative to its look-at target. */
export const CAMERA_OFFSET = new THREE.Vector3(0, 11, 9);

export function createRenderContext(): RenderContext {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#game canvas not found');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const navy = new THREE.Color(0x03050b);
  scene.background = navy;
  // Camera sits ~13.4 m from the chicken: fog starts just behind it so far rooms sink into black.
  scene.fog = new THREE.Fog(navy, 13.5, 30);
  // Near-zero ambient: unlit areas are truly dark, only silhouettes survive.
  scene.add(new THREE.AmbientLight(0x2a3a60, 0.06));

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const target = new THREE.Vector3(24, 0, 24);
  camera.position.copy(target).add(CAMERA_OFFSET);
  camera.lookAt(target);

  const listeners: ((w: number, h: number) => void)[] = [];
  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    listeners.forEach((cb) => cb(w, h));
  };
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    clock: new THREE.Clock(),
    onResize: (cb) => listeners.push(cb),
  };
}
