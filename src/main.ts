import * as THREE from 'three';
import './ui/styles.css';
import { readDebugFlags } from './debug';
import { cellsOfType, parseHouseMap } from './core/grid';
import { SONAR, sonarCharge } from './core/sonar';
import { GridCell, type GameState } from './core/types';
import { buy, roomStars, toggleHat } from './core/economy';
import { MISSION_IDS, MISSION_ROOM, type MissionId } from './core/missions';
import { clearSave, loadGame } from './core/save';
import { secretFound } from './core/keller';
import { peacefulCount } from './core/noise';
import {
  canTransition,
  countLocks,
  FINALE_CARDS,
  formatTime,
  REPEATABLE_CARDS,
  takeCard,
  type CardId,
  type EndingId,
  type Phase,
} from './core/story';
import { createPostFx } from './render/postfx';
import { RevealSystem } from './render/reveal';
import { createRenderContext } from './render/scene';
import { createStore, initialGameState } from './ui/store';
import { initUi } from './ui/index';
import { showStoryCard } from './ui/story-card';
import { showTitle } from './ui/title';
import { createPause, createShop } from './ui/shop';
import { showChoice, showEnding, type Choice } from './ui/results';
import { createBattery, createPrompt } from './ui/prompt';
import { PROMPT, rankName, STORY_CARDS, T } from './ui/texts';
import { buildHouse, placeProps } from './world/builder';
import { HOUSE_ASCII, HOUSE_ROOMS, roomIdAt, SOFA_SPOTS } from './world/house-map';
import { createChickenEntity } from './entities/chicken';
import { createHat } from './entities/hats';
import { createCameraRig } from './systems/camera';
import { boxFree, moveAndSlide, type CollisionGrid } from './systems/collision';
import { createInput } from './systems/input';
import { createLightning } from './systems/lightning';
import { createSonarSystem } from './systems/sonar';
import { createSpookManager } from './systems/spooks';
import { createProgress } from './systems/progress';
import { createMissions, type Objective } from './systems/missions';
import { createFlashlight } from './systems/flashlight';
import { createAmbience } from './audio/ambience';
import { installAudioUnlock } from './audio/context';
import { sfx } from './audio/sfx';

/** Test/debug API on window.__game.actions (used by e2e and the playtester). */
export interface GameActions {
  scream(holdSeconds: number): void;
  teleport(room: string | number): void;
  /** Teleport to exact world coordinates (playtests). */
  warp(x: number, z: number): void;
  lightning(): void;
  completeMission(id: MissionId): void;
  giveFeathers(n: number): void;
  openLock(n: number): void;
  openShop(): void;
  gotoFinale(): void;
  chooseEnding(choice: EndingId): void;
  /** Snapshot of every spook (e2e / playtests). */
  spooks(): SpookInfo[];
}

export interface SpookInfo {
  kind: string;
  mode: string;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  peaceful: boolean;
}

declare global {
  interface Window {
    __game?: {
      ready: boolean;
      state: GameState;
      phase: Phase;
      modal: boolean;
      /** Chicken position (x, z) in world metres. */
      pos: { x: number; z: number };
      scene: THREE.Scene;
      /** Only present with ?debug=1. */
      actions?: GameActions;
    };
  }
}

/** Scripted doorbell scare after this much play time (s). */
const DOORBELL_AT = 300;
const KORB_REACH = 1.6;

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
  const prompt = createPrompt(root);
  const battery = createBattery(root);

  installAudioUnlock();
  const ambience = createAmbience();
  ambience.start();

  const map = parseHouseMap(HOUSE_ASCII, HOUSE_ROOMS);
  const house = buildHouse(map, reveal);
  ctx.scene.add(house.group);
  const grid: CollisionGrid = { width: map.width, height: map.height, blocked: house.blocked };
  // Copied before props/interactables block cells: ghosts float through furniture, not walls.
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
  const lightCells = cellsOfType(map, GridCell.LightSource);
  const nightCell = lightCells.find((c) => roomIdAt(c.x, c.y) === 'flur');
  const fridgeCell = lightCells.find((c) => roomIdAt(c.x, c.y) === 'kueche') ?? { x: 45, y: 14 };
  let nightLight: { x: number; z: number } | null = null;
  if (nightCell) {
    nightLight = { x: nightCell.x + 0.5, z: nightCell.y + 0.5 };
    const night = new THREE.PointLight(0xffa860, 3.5, 4.5, 1.3);
    night.position.set(nightLight.x, 0.35, nightLight.z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffb070 }),
    );
    bulb.position.copy(night.position);
    ctx.scene.add(night, bulb);
  }

  const korb = house.korb;
  const spawnCell = cellsOfType(map, GridCell.ChickenSpawn)[0] ?? { x: 24, y: 24 };
  const chicken = createChickenEntity(spawnCell.x + 0.5, spawnCell.y + 0.5);
  ctx.scene.add(chicken.object);
  const flashlight = createFlashlight(chicken.object);

  const rig = createCameraRig(ctx.camera);
  rig.snap(chicken.pos.x, chicken.pos.z);
  const input = createInput();
  const progress = createProgress(store);

  // --- State: phase + modal overlays -------------------------------------------------
  let phase: Phase = 'title';
  let cardsOpen = 0;
  let cardChain: Promise<void> = Promise.resolve();
  const setPhase = (p: Phase): void => {
    if (canTransition(phase, p)) phase = p;
  };
  const card = (id: CardId, force = false): Promise<void> => {
    if (!force && !REPEATABLE_CARDS.has(id) && !takeCard(store.get(), id)) return cardChain;
    if (force) takeCard(store.get(), id);
    const text = STORY_CARDS[id];
    cardsOpen++;
    store.emit({ type: 'story-card', cardId: id });
    cardChain = cardChain
      .then(() => showStoryCard(text))
      .then(() => {
        cardsOpen--;
      });
    return cardChain;
  };
  const shop = createShop(root, store, {
    buy(id) {
      const s = store.get();
      const res = buy({ feathers: s.feathers, upgrades: s.upgrades, hats: s.hats, hat: s.hat }, id);
      if (!res.ok) return;
      store.set(res.wallet);
      store.emit({ type: 'pickup', itemId: id });
      store.emit({ type: 'feathers', amount: 0 });
      sfx.buy();
      applyLoadout();
      progress.save();
    },
    toggleHat(id) {
      const s = store.get();
      store.set({ hat: toggleHat(s, id) });
      sfx.uiClick();
      applyLoadout();
      progress.save();
    },
    onClose: () => ui.hud.sync(),
  });
  const pause = createPause(root, () => undefined);
  const isModal = (): boolean =>
    cardsOpen > 0 || shop.isOpen || pause.isOpen || phase === 'choice' || phase === 'ending';
  const playing = (): boolean => phase === 'play' && !isModal();

  // --- Helpers ---------------------------------------------------------------------
  const tmp = new THREE.Vector3();
  const toScreen = (x: number, y: number, z: number): { sx: number; sy: number } => {
    tmp.set(x, y, z).project(ctx.camera);
    return {
      sx: (tmp.x * 0.5 + 0.5) * window.innerWidth,
      sy: (-tmp.y * 0.5 + 0.5) * window.innerHeight,
    };
  };
  const atKorb = (): boolean =>
    Math.hypot(chicken.pos.x - korb.x, chicken.pos.z - korb.z) < KORB_REACH;
  const teleportTo = (x: number, z: number): void => {
    chicken.teleport(x, z);
    rig.snap(x, z);
  };

  let hatObj: THREE.Object3D | null = null;
  /** Upgrades, hat and flashlight → entities. */
  function applyLoadout(): void {
    progress.applyUpgrades();
    chicken.speedMul = progress.stats.speedMul;
    const want = store.get().hat;
    if (hatObj) chicken.hatAnchor.remove(hatObj);
    hatObj = want ? createHat(want) : null;
    if (hatObj) chicken.hatAnchor.add(hatObj);
    ui.hud.sync();
  }

  // --- Spooks -----------------------------------------------------------------------
  /** Catch freeze-frame (s): simulation paused, camera close-up, then `afterFreeze`. */
  const FREEZE = 0.5;
  let freeze = 0;
  let afterFreeze: (() => void) | null = null;
  const spooks = createSpookManager(ctx.scene, reveal, wallsOnly, {
    onCaught(s) {
      if (!playing()) return;
      const room = roomIdAt(chicken.pos.x, chicken.pos.z);
      const res = progress.caught(room);
      store.emit({ type: 'caught', by: s.state.kind });
      store.emit({ type: 'heart-lost', by: s.state.kind });
      store.emit({ type: 'feathers', amount: -res.lost });
      sfx.caught();
      rig.shake(0.35, 0.25);
      // Freeze-frame: the world stops, the camera snaps onto the spook, then the knock-back.
      rig.closeUp((s.state.x * 2 + chicken.pos.x) / 3, (s.state.z * 2 + chicken.pos.z) / 3, FREEZE);
      reveal.hit(s.reveal);
      freeze = FREEZE;
      ui.toast(T.caught, T.caughtSub(Math.round(progress.stats.lossShare * 100)));
      if (res.lost > 0) {
        const p = toScreen(chicken.pos.x, 1.2, chicken.pos.z);
        ui.spawnFloat(`−${res.lost}`, p.sx, p.sy, 'danger');
      }
      const sx = s.state.x;
      const sz = s.state.z;
      afterFreeze = () => {
        if (res.panic) {
          teleportTo(korb.x + 0.9, korb.z - 0.6);
          void card('panic');
        } else {
          // Knock the chicken away from the spook so it can flee.
          const dx = chicken.pos.x - sx;
          const dz = chicken.pos.z - sz;
          const len = Math.hypot(dx, dz) || 1;
          moveAndSlide(grid, chicken.pos, (dx / len) * 1.2, (dz / len) * 1.2, 0.28);
        }
      };
    },
    onDelivered(s) {
      // Map spawns have stable indices: remember them so a reload keeps them in the Korb.
      const index = spooks.list.indexOf(s);
      if (index >= 0 && index < baseSpooks) store.get().flags[`peace:${index}`] = true;
      store.set({ ghostlights: store.get().ghostlights + 1 });
      store.emit({ type: 'ghostlight', amount: 1 });
      sfx.combo(4);
      ui.toast(T.ghostlight, T.ghostlightSub);
      progress.save();
    },
  });
  for (const c of cellsOfType(map, GridCell.SpookSpawn)) {
    const room = roomIdAt(c.x, c.y);
    spooks.spawn(room === 'kueche' ? 'rudi' : 'socke', c.x + 0.5, c.y + 0.5);
  }
  for (const p of SOFA_SPOTS) spooks.spawn('hand', p.x, p.z + 0.7);
  /** Spooks from the map (wrong-box socks spawn later and are not persisted). */
  const baseSpooks = spooks.list.length;

  // --- Sonar / lightning / missions ---------------------------------------------------
  const floorMask = { texture: house.floorMask, width: map.width, height: map.height };
  // Late-bound: sonar hooks need missions, missions need sonar.
  let missionsRef: ReturnType<typeof createMissions> | null = null;
  const sonar = createSonarSystem(ctx.scene, reveal, floorMask, {
    onFirstReveal(r) {
      store.set({ revealed: [...store.get().revealed, r.id] });
      progress.addFeathers(SONAR.featherBase, r.center.x, r.center.z);
      const p = toScreen(r.center.x, r.center.y + 0.6, r.center.z);
      ui.spawnFloat(`+${SONAR.featherBase}`, p.sx, p.sy, 'feather');
      sfx.pickup();
    },
    onCombo(count, bonus, x, z) {
      progress.addFeathers(bonus, x, z);
      const p = toScreen(chicken.pos.x, 1.2, chicken.pos.z);
      ui.spawnFloat(`×${count}!  +${bonus}`, p.sx, p.sy - 30, 'combo');
      sfx.combo(count);
      if (count >= 3) ui.toast(`×${count}!`, `+${bonus} Federn`);
    },
    onSpookHeard(r, ox, oz, echo) {
      const s = spooks.byReveal(r);
      if (!s || !missionsRef) return;
      const t = ctx.clock.elapsedTime;
      const lights = missionsRef.lights(
        s.state.x,
        s.state.z,
        t,
        chicken.pos.x,
        chicken.pos.z,
        chicken.facing,
      );
      if (spooks.heard(s, ox, oz, echo ? 'echo' : 'scream', lights)) {
        ui.toast(T.peaceful, T.peacefulSub);
        sfx.peaceful();
      }
    },
    onPropHit(r, echo) {
      missionsRef?.onPropHit(r, echo, ctx.clock.elapsedTime);
    },
  });

  const lightning = createLightning(ctx.scene, reveal, {
    onFlash: () => {
      sfx.lightningSting();
      missionsRef?.onFlash(ctx.clock.elapsedTime, roomIdAt(chicken.pos.x, chicken.pos.z));
    },
    onThunder: (i) => ambience.thunder(i),
    shake: (a, t) => rig.shake(a, t),
    flash: (v) => postfx.setFlash(v),
  });

  const missions = createMissions({
    scene: ctx.scene,
    reveal,
    store,
    ui,
    sonar,
    spooks,
    progress,
    flashlight,
    grid,
    nightLight,
    fridgeLight: { x: fridgeCell.x + 0.5, z: fridgeCell.y + 0.5 },
    card,
    shake: (a, t) => rig.shake(a, t),
    startFinale: () => startFinale(),
    openPassage(cx, cy) {
      const i = cy * map.width + cx;
      house.blocked[i] = 0;
      wallsOnly.blocked[i] = 0;
      house.mask[i] = 255;
      house.floorMask.needsUpdate = true;
    },
    onLoadout: () => applyLoadout(),
  });
  missionsRef = missions;

  // --- Finale + endings ---------------------------------------------------------------
  let choice: Choice | null = null;
  let forcedEnding: EndingId | null = null;
  async function startFinale(): Promise<void> {
    if (phase !== 'play') return;
    shop.close();
    pause.close();
    setPhase('finale');
    prompt.set(null);
    ui.hideMission();
    flashlight.owned = false;
    const dx = missions.door.x;
    const dz = missions.door.z - 0.9;
    teleportTo(dx, dz);
    spooks.gather(dx, dz);
    for (const s of spooks.list) reveal.hit(s.reveal);
    for (const id of FINALE_CARDS) {
      if (forcedEnding) break;
      await card(id, true);
    }
    setPhase('choice');
    let ending = forcedEnding;
    if (!ending) {
      choice = showChoice(root);
      ending = await choice.result;
    }
    finish(ending);
  }

  function finish(id: EndingId): void {
    setPhase('ending');
    if (id === 'A') {
      missions.door.setOpen(true);
      sfx.scream(SONAR.maxHold);
    } else {
      teleportTo(korb.x, korb.z);
      spooks.gather(korb.x, korb.z + 2.4);
    }
    store.emit({ type: 'ending', endingId: id });
    progress.addXp(100);
    const s = store.get();
    let stars = 0;
    for (const mid of MISSION_IDS) {
      const room = progress.room(MISSION_ROOM[mid]);
      stars += roomStars(room);
    }
    progress.save();
    showEnding(
      root,
      id,
      {
        feathers: s.feathersEarned,
        ghostlights: s.ghostlights,
        stars,
        maxStars: MISSION_IDS.length * 3,
        rank: rankName(store.get().rank),
        time: formatTime(s.time),
        secret: secretFound(s.flags),
        peaceful: peacefulCount(spooks.list.map((x) => x.state)),
      },
      () => {
        try {
          clearSave(window.localStorage);
        } catch {
          // storage unavailable
        }
        window.location.reload();
      },
    );
  }

  // --- Scream input ------------------------------------------------------------------
  let holdStart = -1;
  const scream = (hold: number): void => {
    const st = progress.stats;
    const radius = sonar.fire(hold, chicken.pos.x, chicken.pos.z, {
      maxRadius: st.maxRadius,
      maxHold: st.maxHold,
    });
    store.emit({
      type: 'sonar',
      origin: { x: chicken.pos.x, y: chicken.pos.z },
      strength: radius / st.maxRadius,
    });
    missions.onScream(ctx.clock.elapsedTime, roomIdAt(chicken.pos.x, chicken.pos.z));
    if (hold < SONAR.tapThreshold) {
      sfx.squeak();
      chicken.kick(0.18);
    } else {
      sfx.scream(hold);
      chicken.kick(0.35);
      rig.punch(-2.5 * sonarCharge(hold, st.maxHold));
      rig.shake(0.06 + 0.12 * sonarCharge(hold, st.maxHold), 0.12);
    }
  };
  input.onScreamStart(() => {
    if (playing()) holdStart = ctx.clock.elapsedTime;
  });
  input.onScreamEnd(() => {
    if (holdStart < 0) return;
    const hold = ctx.clock.elapsedTime - holdStart;
    holdStart = -1;
    chicken.charge = 0;
    if (playing()) scream(Math.min(hold, progress.stats.maxHold));
  });

  input.onKey((code) => {
    if (!playing()) return;
    if (code === 'KeyE') {
      const it = missions.nearest(chicken.pos.x, chicken.pos.z);
      if (it) missions.interact(it);
      else if (atKorb()) shop.open();
    } else if (code === 'Escape') {
      if (atKorb()) shop.open();
      else pause.open();
    } else if (code === 'KeyF') {
      if (flashlight.owned) {
        flashlight.toggle();
        sfx.click();
      }
    }
  });

  // --- Debug -------------------------------------------------------------------------
  const roomCentre = (room: string | number): { x: number; z: number } | null => {
    const r = typeof room === 'number' ? HOUSE_ROOMS[room] : HOUSE_ROOMS.find((x) => x.id === room);
    if (!r) return null;
    let x = r.bounds.x + r.bounds.w / 2;
    let z = r.bounds.y + r.bounds.h / 2;
    // Nudge off furniture if the exact centre is blocked.
    for (let i = 0; i < 12 && !boxFree(grid, x, z, 0.3); i++) {
      x += i % 2 === 0 ? i + 1 : -(i + 1);
    }
    for (let i = 0; i < 12 && !boxFree(grid, x, z, 0.3); i++) z += 1;
    return { x, z };
  };
  const teleport = (room: string | number): void => {
    const c = roomCentre(room);
    if (c) teleportTo(c.x, c.z);
  };

  let debugEl: HTMLDivElement | null = null;
  if (flags.debug) {
    debugEl = document.createElement('div');
    debugEl.style.cssText =
      'position:fixed;right:8px;bottom:8px;font:12px monospace;color:#9fd;' +
      'background:#000a;padding:6px 8px;border-radius:6px;white-space:pre;z-index:50';
    document.body.appendChild(debugEl);
    input.onKey((code) => {
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(code);
      if (i >= 0) teleport(i);
      if (code === 'KeyL') lightning.strike();
    });
    console.info('[QUIETSCH] debug mode on: 1-5 teleport, L lightning');
  }

  // --- Props (async) -----------------------------------------------------------------
  /** Props revealed in a saved run never pay first-reveal feathers again. */
  const applyRevealed = (): void => {
    const done = new Set(store.get().revealed);
    for (const r of reveal.items) if (done.has(r.id)) r.rewarded = true;
  };
  placeProps(map, house, reveal)
    .then(applyRevealed)
    .catch((err: unknown) => {
      console.warn('[QUIETSCH] props failed to load', err);
    });

  // --- Title -------------------------------------------------------------------------
  let saved: GameState | null = null;
  try {
    saved = loadGame(window.localStorage, initialGameState());
  } catch {
    saved = null;
  }
  void showTitle(root, saved !== null).then((choiceTitle) => {
    if (choiceTitle === 'continue' && saved) {
      store.set(saved);
      applyRevealed();
      missions.restore();
      spooks.list.forEach((sp, i) => {
        if (i < baseSpooks && saved?.flags[`peace:${i}`]) spooks.restAtKorb(sp, korb.x, korb.z);
      });
      applyLoadout();
      setPhase('play');
      ui.toast(rankName(saved.rank), `Schloss ${countLocks(saved)} von 3 offen`);
    } else {
      try {
        clearSave(window.localStorage);
      } catch {
        // storage unavailable
      }
      applyLoadout();
      setPhase('play');
      void card('intro');
    }
    sfx.uiClick();
  });

  // --- Loop --------------------------------------------------------------------------
  const axis = { x: 0, z: 0 };
  const frame = {
    dt: 0,
    time: 0,
    chickenX: 0,
    chickenZ: 0,
    chickenMoving: false,
    hopNoise: 1,
    active: false,
    korbX: korb.x,
    korbZ: korb.z,
  };
  let fpsFrames = 0;
  let fpsTime = 0;
  const objective: Objective = { text: '', progress: 0, goal: 0 };
  let shownText = '';
  let shownProgress = -1;
  // The Keller swallows light: fog closes in while the chicken is down there.
  const fog = ctx.scene.fog instanceof THREE.Fog ? ctx.scene.fog : null;
  const FOG_HOUSE = { near: fog?.near ?? 13.5, far: fog?.far ?? 30 };
  const FOG_KELLER = { near: 10.5, far: 19 };

  ctx.renderer.setAnimationLoop(() => {
    const rawDt = Math.min(ctx.clock.getDelta(), 0.1);
    let dt = rawDt;
    if (freeze > 0) {
      freeze -= rawDt;
      dt = 0;
      if (freeze <= 0 && afterFreeze) {
        const next = afterFreeze;
        afterFreeze = null;
        next();
      }
    }
    ctx.renderer.info.reset();
    const time = ctx.clock.elapsedTime;
    const active = playing();
    const room = roomIdAt(chicken.pos.x, chicken.pos.z);

    if (active) input.axis(axis);
    else {
      axis.x = 0;
      axis.z = 0;
    }
    const maxHold = progress.stats.maxHold;
    if (holdStart >= 0 && active) {
      const hold = Math.min(time - holdStart, maxHold);
      chicken.charge = sonarCharge(hold, maxHold);
      sonar.preview(hold, chicken.pos.x, chicken.pos.z, time, progress.stats.maxRadius, maxHold);
    } else {
      sonar.preview(-1, 0, 0, time);
    }
    chicken.update(dt, axis, grid, time);
    sonar.update(dt);

    frame.dt = dt;
    frame.time = time;
    frame.chickenX = chicken.pos.x;
    frame.chickenZ = chicken.pos.z;
    frame.chickenMoving = chicken.moving;
    frame.hopNoise = progress.stats.hopNoise;
    frame.active =
      dt > 0 && (active || phase === 'finale' || phase === 'choice' || phase === 'ending');
    spooks.update(frame);
    const danger = active
      ? Math.min(1, Math.max(0, (8 - spooks.nearest) / 6.5) + (spooks.chasing ? 0.25 : 0))
      : 0;
    ambience.setDanger(danger);

    const korbNear = atKorb();
    if (active) {
      if (progress.update(dt, room, korbNear)) ui.hud.sync();
      const near = missions.nearest(chicken.pos.x, chicken.pos.z);
      prompt.set(near ? (PROMPT[near.def.kind] ?? null) : korbNear ? (PROMPT.korb ?? null) : null);

      // Objective banner per room; hub shows door progress. Touches the DOM only on change.
      const hasObj = missions.objective(room, objective);
      const locks = store.get().locksOpened;
      const text = hasObj
        ? objective.text
        : room === 'flur'
          ? locks === 3
            ? T.toDoor
            : T.hub
          : '';
      const prog = hasObj ? objective.progress : locks;
      if (text !== shownText || prog !== shownProgress) {
        shownText = text;
        shownProgress = prog;
        if (text === '') ui.hideMission();
        else ui.showMission(text, prog, hasObj ? objective.goal : 3);
      }

      const s = store.get();
      if (s.time >= DOORBELL_AT && !s.flags.doorbell) {
        s.flags.doorbell = true;
        sfx.doorbell();
        missions.door.showShadow(4.5);
        ui.toast(T.doorbell);
      }
    } else if (phase !== 'play') {
      prompt.set(null);
    }
    if (flashlight.update(active ? dt : 0, korbNear, time))
      ui.toast(T.batteryEmpty, T.batteryEmptySub);
    battery.set(flashlight.owned && phase === 'play', flashlight.battery, flashlight.on);

    missions.update(dt, time);
    lightning.update(dt, chicken.pos.x, chicken.pos.z);
    if (fog) {
      const want = room === 'keller' ? FOG_KELLER : FOG_HOUSE;
      const k = 1 - Math.exp(-2.5 * rawDt);
      fog.near += (want.near - fog.near) * k;
      fog.far += (want.far - fog.far) * k;
    }
    reveal.update(dt);
    rig.update(rawDt, chicken.pos.x, chicken.pos.z, chicken.vel.x, chicken.vel.z, grid);
    postfx.render(rawDt);

    if (debugEl) {
      fpsFrames++;
      fpsTime += dt;
      if (fpsTime >= 0.5) {
        debugEl.textContent =
          `fps ${Math.round(fpsFrames / fpsTime)}  phase ${phase}\n` +
          `pos ${chicken.pos.x.toFixed(1)}, ${chicken.pos.z.toFixed(1)} ${room ?? '-'}\n` +
          `spook d=${spooks.nearest.toFixed(1)} danger=${danger.toFixed(2)}\n` +
          `calls ${ctx.renderer.info.render.calls}`;
        fpsFrames = 0;
        fpsTime = 0;
      }
    }
  });

  const actions: GameActions = {
    scream: (hold) => scream(Math.max(0, Math.min(hold, progress.stats.maxHold))),
    teleport,
    warp: (x, z) => teleportTo(x, z),
    lightning: () => lightning.strike(),
    completeMission: (id) => missions.complete(id, true),
    giveFeathers: (n) => progress.addFeathers(Math.max(0, Math.floor(n))),
    openLock: (n) => missions.openLock(n),
    openShop: () => shop.open(),
    gotoFinale: () => {
      for (let n = 1; n <= 3; n++) missions.openLock(n);
      if (phase === 'title') setPhase('play');
      void startFinale();
    },
    spooks: () =>
      spooks.list.map(({ state: s }) => ({
        kind: s.kind,
        mode: s.mode,
        x: s.x,
        z: s.z,
        targetX: s.targetX,
        targetZ: s.targetZ,
        peaceful: s.peaceful,
      })),
    chooseEnding: (id) => {
      if (phase !== 'finale' && phase !== 'choice') return;
      forcedEnding = id;
      if (choice) choice.pick(id);
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    },
  };

  window.__game = {
    ready: true,
    get state() {
      return store.get();
    },
    get phase() {
      return phase;
    },
    get modal() {
      return isModal();
    },
    get pos() {
      return { x: chicken.pos.x, z: chicken.pos.z };
    },
    scene: ctx.scene,
    actions: params.get('debug') === '1' ? actions : undefined,
  };
}
