import * as THREE from 'three';
import './ui/styles.css';
import { readDebugFlags } from './debug';
import { cellsOfType, parseHouseMap } from './core/grid';
import { GridCell, type GameState } from './core/types';
import { createPostFx } from './render/postfx';
import { CAMERA_OFFSET, createRenderContext } from './render/scene';
import { createStore, initialGameState } from './ui/store';
import { buildHouse } from './world/builder';
import { HOUSE_ASCII, HOUSE_ROOMS } from './world/house-map';

declare global {
  interface Window {
    __game?: { ready: boolean; state: GameState; scene: THREE.Scene };
  }
}

const flags = readDebugFlags();
const ctx = createRenderContext();
const postfx = createPostFx(ctx);
const store = createStore(initialGameState());

const map = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);
ctx.scene.add(buildHouse(map));

// Placeholder chicken: yellow capsule at the 'C' spawn.
const spawn = cellsOfType(map, GridCell.ChickenSpawn)[0];
if (spawn) {
  const chicken = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.4, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x201800 }),
  );
  chicken.position.set(spawn.x + 0.5, 0.5, spawn.y + 0.5);
  ctx.scene.add(chicken);
  // Camera follows the spawn point until the camera system exists.
  const target = new THREE.Vector3(spawn.x + 0.5, 0, spawn.y + 0.5);
  ctx.camera.position.copy(target).add(CAMERA_OFFSET);
  ctx.camera.lookAt(target);
}

// A little light so the placeholder scene is visible before the lighting system exists.
const glow = new THREE.PointLight(0xffb060, 90, 30, 2);
glow.position.set((spawn?.x ?? 24) + 0.5, 3, (spawn?.y ?? 16) + 2.5);
ctx.scene.add(glow);

if (flags.debug) console.info('[QUIETSCH] debug mode on');

ctx.renderer.setAnimationLoop(() => postfx.render(ctx.clock.getDelta()));

window.__game = {
  ready: true,
  get state() {
    return store.get();
  },
  scene: ctx.scene,
};
