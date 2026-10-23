import * as THREE from 'three';
import './ui/styles.css';
import { readDebugFlags } from './debug';
import { cellsOfType, parseHouseMap } from './core/grid';
import { hearSound, stepSpook, SPOOK, type SpookInput } from './core/spook-fsm';
import { SONAR, sonarCharge } from './core/sonar';
import { GridCell, type GameState } from './core/types';
import { createPostFx } from './render/postfx';
import { RevealSystem } from './render/reveal';
import { createRenderContext } from './render/scene';
import { createStore, initialGameState } from './ui/store';
import { initUi } from './ui/index';
import { buildHouse, placeProps } from './world/builder';
import { HOUSE_ASCII, HOUSE_ROOMS } from './world/house-map';
import { createChickenEntity } from './entities/chicken';
import { createSpookEntity, type Spook } from './entities/spook';
import { createCameraRig } from './systems/camera';
import { boxFree, isBlocked, type CollisionGrid } from './systems/collision';
import { createInput } from './systems/input';
import { createLightning } from './systems/lightning';
import { createSonarSystem } from './systems/sonar';
import { createAmbience } from './audio/ambience';
import { installAudioUnlock } from './audio/context';
import { sfx } from './audio/sfx';

interface GameActions {
  scream(holdSeconds: number): void;
  teleport(room: string | number): void;
  lightning(): void;
}

declare global {
  interface Window {
    __game?: {
      ready: boolean;
      state: GameState;
      scene: THREE.Scene;
      actions?: GameActions;
    };
  }
}

const params = new URLSearchParams(window.location.search);
const uiRoot = document.getElementById('ui');
if (!(uiRoot instanceof HTMLElement)) throw new Error('#ui root not found');

if (params.get('ui') === '1') {
  void import('./ui/demo').then((m) => m.mountUiDemo(uiRoot));
} else if (params.get('audio') === '1') {
  void import('./audio/demo').then((m) => m.mountAudioDemo(uiRoot));
} else {
  boot(uiRoot);
}

function boot(root: HTMLElement): void {
  const flags = readDebugFlags();
  const ctx = createRenderContext();
  // Composer renders several passes; count draw calls per frame, not per pass.
  ctx.renderer.info.autoReset = false;
  const postfx = createPostFx(ctx);
  const store = createStore(initialGameState());
  const ui = initUi(root, store);
  const reveal = new RevealSystem();

  installAudioUnlock();
  const ambience = createAmbience();
  ambience.start();

  const map = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);
  const house = buildHouse(map, reveal);
  ctx.scene.add(house.group);
  const grid: CollisionGrid = { width: map.width, height: map.height, blocked: house.blocked };
  const wallsOnly: CollisionGrid = {
    width: map.width,
    height: map.height,
    blocked: house.blocked.slice(),
  };

  // Faint cold light in every doorway, warm night light in the hub.
  for (const d of house.doors) {
    const l = new THREE.PointLight(0x6d8fc0, 1.6, 3.2, 1.5);
    l.position.set(d.x, 1.2, d.z);
    ctx.scene.add(l);
  }
  const nightCell = cellsOfType(map, GridCell.LightSource).find(
    (c) => c.x >= 17 && c.x <= 30 && c.y >= 12,
  );
  if (nightCell) {
    const night = new THREE.PointLight(0xffa860, 3.5, 4.5, 1.3);
    night.position.set(nightCell.x + 0.5, 0.35, nightCell.y + 0.5);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffb070 }),
    );
    bulb.position.copy(night.position);
    ctx.scene.add(night, bulb);
  }

  const spawnCell = cellsOfType(map, GridCell.ChickenSpawn)[0] ?? { x: 24, y: 24 };
  const chicken = createChickenEntity(spawnCell.x + 0.5, spawnCell.y + 0.5);
  ctx.scene.add(chicken.object);

  // One Socken-Geist in the Kinderzimmer, the spawn closest to the Flur door.
  const spookCells = cellsOfType(map, GridCell.SpookSpawn).filter((c) => c.x < 16 && c.y > 11);
  const spookCell = spookCells.sort((a, b) => b.y - a.y)[0] ?? { x: 10, y: 26 };
  const spooks: Spook[] = [createSpookEntity(spookCell.x + 0.5, spookCell.y + 0.5, reveal)];
  for (const s of spooks) ctx.scene.add(s.object);

  const rig = createCameraRig(ctx.camera);
  rig.snap(chicken.pos.x, chicken.pos.z);
  const input = createInput();

  // --- HUD helpers -------------------------------------------------------
  const tmp = new THREE.Vector3();
  const toScreen = (x: number, y: number, z: number): { sx: number; sy: number } => {
    tmp.set(x, y, z).project(ctx.camera);
    return {
      sx: (tmp.x * 0.5 + 0.5) * window.innerWidth,
      sy: (-tmp.y * 0.5 + 0.5) * window.innerHeight,
    };
  };
  const addFeathers = (amount: number, x: number, z: number): void => {
    store.set({ feathers: store.get().feathers + amount });
    store.emit({ type: 'feathers', amount, at: { x, y: z } });
  };

  const floorMask = { texture: house.floorMask, width: map.width, height: map.height };
  const sonar = createSonarSystem(ctx.scene, reveal, floorMask, {
    onFirstReveal(r) {
      addFeathers(SONAR.featherBase, r.center.x, r.center.z);
      const p = toScreen(r.center.x, r.center.y + 0.6, r.center.z);
      ui.spawnFloat(`+${SONAR.featherBase}`, p.sx, p.sy, 'feather');
      sfx.pickup();
    },
    onCombo(count, bonus, x, z) {
      addFeathers(bonus, x, z);
      const p = toScreen(chicken.pos.x, 1.2, chicken.pos.z);
      ui.spawnFloat(`×${count}!  +${bonus}`, p.sx, p.sy - 30, 'combo');
      sfx.combo(count);
      if (count >= 3) ui.toast(`Combo ×${count}!`, `+${bonus} Federn`);
    },
    onSpookHeard(r, ox, oz) {
      const s = spooks.find((sp) => sp.reveal === r);
      if (s) hearSound(s.state, ox, oz);
    },
  });

  const lightning = createLightning(ctx.scene, reveal, {
    onFlash: () => sfx.lightningSting(),
    onThunder: (i) => ambience.thunder(i),
    shake: (a, t) => rig.shake(a, t),
  });

  // --- Scream input ------------------------------------------------------
  let holdStart = -1;
  const scream = (hold: number): void => {
    const radius = sonar.fire(hold, chicken.pos.x, chicken.pos.z);
    store.emit({
      type: 'sonar',
      origin: { x: chicken.pos.x, y: chicken.pos.z },
      strength: radius / SONAR.maxRadius,
    });
    if (hold < SONAR.tapThreshold) {
      sfx.squeak();
      chicken.kick(0.18);
    } else {
      sfx.scream(hold);
      chicken.kick(0.35);
      rig.punch(-2.5 * sonarCharge(hold));
      rig.shake(0.06 + 0.12 * sonarCharge(hold), 0.12);
    }
  };
  input.onScreamStart(() => {
    holdStart = ctx.clock.elapsedTime;
  });
  input.onScreamEnd(() => {
    if (holdStart < 0) return;
    const hold = ctx.clock.elapsedTime - holdStart;
    holdStart = -1;
    chicken.charge = 0;
    scream(Math.min(hold, SONAR.maxHold));
  });

  // --- Debug -------------------------------------------------------------
  const roomCentre = (room: string | number): { x: number; z: number } | null => {
    const r = typeof room === 'number' ? HOUSE_ROOMS[room] : HOUSE_ROOMS.find((x) => x.id === room);
    if (!r) return null;
    let x = r.bounds.x + r.bounds.w / 2;
    let z = r.bounds.y + r.bounds.h / 2;
    // Nudge off furniture if the exact centre is blocked.
    for (let i = 0; i < 12 && !boxFree(grid, x, z, 0.25); i++) {
      x += i % 2 === 0 ? i + 1 : -(i + 1);
    }
    for (let i = 0; i < 12 && !boxFree(grid, x, z, 0.25); i++) z += 1;
    return { x, z };
  };
  const teleport = (room: string | number): void => {
    const c = roomCentre(room);
    if (!c) return;
    chicken.teleport(c.x, c.z);
    rig.snap(c.x, c.z);
  };

  let debugEl: HTMLDivElement | null = null;
  const hearRings: THREE.Mesh[] = [];
  if (flags.debug) {
    debugEl = document.createElement('div');
    debugEl.style.cssText =
      'position:fixed;right:8px;bottom:8px;font:12px monospace;color:#9fd;' +
      'background:#000a;padding:6px 8px;border-radius:6px;white-space:pre;z-index:50';
    document.body.appendChild(debugEl);
    const ringGeo = new THREE.RingGeometry(SPOOK.noticeRadius - 0.04, SPOOK.noticeRadius, 40);
    ringGeo.rotateX(-Math.PI / 2);
    for (const s of spooks) {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.6 }),
      );
      m.position.set(s.state.x, 0.05, s.state.z);
      hearRings.push(m);
      ctx.scene.add(m);
    }
    input.onKey((code) => {
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
      if (i >= 0) teleport(i);
      if (code === 'KeyL') lightning.strike();
    });
    console.info('[QUIETSCH] debug mode on: 1-4 teleport, L lightning');
  }

  // --- Props (async) -----------------------------------------------------
  // `wallsOnly` was copied before props block cells: ghosts float through furniture, not walls.
  placeProps(map, house, reveal).catch((err: unknown) => {
    console.warn('[QUIETSCH] props failed to load', err);
  });
  const r = SPOOK.radius;
  const spookCanMove = (x: number, z: number): boolean =>
    !isBlocked(wallsOnly, x - r, z) &&
    !isBlocked(wallsOnly, x + r, z) &&
    !isBlocked(wallsOnly, x, z - r) &&
    !isBlocked(wallsOnly, x, z + r);

  // --- Loop --------------------------------------------------------------
  const axis = { x: 0, z: 0 };
  // Reused every frame: no allocations in the hot loop.
  const spookInput: SpookInput = {
    dt: 0,
    chickenX: 0,
    chickenZ: 0,
    chickenMoving: false,
    canMove: spookCanMove,
    rand: Math.random,
  };
  const korb = house.korb;
  let fpsFrames = 0;
  let fpsTime = 0;

  ctx.renderer.setAnimationLoop(() => {
    const dt = Math.min(ctx.clock.getDelta(), 0.1);
    ctx.renderer.info.reset();
    const time = ctx.clock.elapsedTime;

    input.axis(axis);
    if (holdStart >= 0) {
      const hold = Math.min(time - holdStart, SONAR.maxHold);
      chicken.charge = sonarCharge(hold);
      sonar.preview(hold, chicken.pos.x, chicken.pos.z, time);
    } else {
      sonar.preview(-1, 0, 0, time);
    }
    chicken.update(dt, axis, grid, time);
    sonar.update(dt);

    let nearest = Infinity;
    let chasing = false;
    for (const s of spooks) {
      spookInput.dt = dt;
      spookInput.chickenX = chicken.pos.x;
      spookInput.chickenZ = chicken.pos.z;
      spookInput.chickenMoving = chicken.moving;
      const ev = stepSpook(s.state, spookInput);
      s.update(dt, time, chicken.pos.x, chicken.pos.z);
      nearest = Math.min(nearest, s.dist);
      if (s.state.mode === 'chase') chasing = true;
      if (ev === 'caught') {
        const hearts = Math.max(0, store.get().hearts - 1);
        store.set({ hearts });
        store.emit({ type: 'caught', by: 'socke' });
        store.emit({ type: 'heart-lost', by: 'socke' });
        sfx.caught();
        ui.toast('Gefangen! −1 Herz', 'Zurück in den Korb.');
        rig.shake(0.35, 0.25);
        chicken.teleport(korb.x + 0.9, korb.z - 0.6);
        rig.snap(chicken.pos.x, chicken.pos.z);
      }
    }
    const danger = Math.min(1, Math.max(0, (8 - nearest) / 6.5) + (chasing ? 0.25 : 0));
    ambience.setDanger(danger);

    lightning.update(dt, chicken.pos.x, chicken.pos.z);
    reveal.update(dt);
    rig.update(dt, chicken.pos.x, chicken.pos.z, chicken.vel.x, chicken.vel.z);
    postfx.render(dt);

    if (debugEl) {
      fpsFrames++;
      fpsTime += dt;
      for (let i = 0; i < spooks.length; i++) {
        const s = spooks[i];
        const m = hearRings[i];
        if (s && m) m.position.set(s.state.x, 0.05, s.state.z);
      }
      if (fpsTime >= 0.5) {
        const s0 = spooks[0];
        debugEl.textContent =
          `fps ${Math.round(fpsFrames / fpsTime)}\n` +
          `pos ${chicken.pos.x.toFixed(1)}, ${chicken.pos.z.toFixed(1)}\n` +
          `spook ${s0?.state.mode ?? '-'} d=${nearest.toFixed(1)} danger=${danger.toFixed(2)}\n` +
          `calls ${ctx.renderer.info.render.calls}`;
        fpsFrames = 0;
        fpsTime = 0;
      }
    }
  });

  window.__game = {
    ready: true,
    get state() {
      return store.get();
    },
    scene: ctx.scene,
    actions: {
      scream: (hold) => scream(Math.max(0, Math.min(hold, SONAR.maxHold))),
      teleport,
      lightning: () => lightning.strike(),
    },
  };
}
