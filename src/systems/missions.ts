import * as THREE from 'three';
import {
  clockScream,
  flipFuse,
  forceComplete,
  inLightningWindow,
  MISSION_GOAL,
  MISSION_IDS,
  MISSION_LOCK,
  MISSION_ROOM,
  missionProgress,
  missionSteps,
  objectiveText,
  openBox,
  openDrawer,
  type MissionId,
} from '@/core/missions';
import { MISSION_REWARD } from '@/core/economy';
import {
  canOpenHollow,
  grantHat,
  hearHollow,
  KELLER_FLAG,
  KELLER_REWARD,
  openDonation,
  openHollow,
  openKellerChest,
} from '@/core/keller';
import { countLocks, lockText, openLock, type CardId } from '@/core/story';
import { popHand, wakeRudi } from '@/core/spook-fsm';
import { LIGHT } from '@/core/noise';
import { createInteractable, INTERACT_RADIUS, type Interactable } from '@/entities/interactable';
import type { RevealSystem, Revealable } from '@/render/reveal';
import type { Store } from '@/ui/store';
import type { Ui } from '@/ui/index';
import { T } from '@/ui/texts';
import { sfx } from '@/audio/sfx';
import { HOLLOW_CELL, INTERACTABLES } from '@/world/house-map';
import type { CollisionGrid } from './collision';
import type { Progress } from './progress';
import type { SpookManager } from './spooks';
import type { SonarSystem } from './sonar';
import type { Flashlight } from './flashlight';

const ECHO_DELAY = 0.45;
const ECHO_RADIUS = 2.6;
const WRONG_BOX_FEATHERS = 10;
const NIGHT_LIGHT_RADIUS = 2.6;
const FRIDGE_RADIUS = 3.2;
/** A lightning flash lights spooks for this long (ring travel included). */
const FLASH_LIT = 1.2;
/** Seconds between the hollow wall's outline pulses. */
const PULSE_GAP = 0.3;

export interface MissionDeps {
  scene: THREE.Scene;
  reveal: RevealSystem;
  store: Store;
  ui: Ui;
  sonar: SonarSystem;
  spooks: SpookManager;
  progress: Progress;
  flashlight: Flashlight;
  /** Chicken collision grid: interactable cells get blocked. */
  grid: CollisionGrid;
  nightLight: { x: number; z: number } | null;
  fridgeLight: { x: number; z: number };
  /** Show a story card once (or always with force). */
  card(id: CardId, force?: boolean): Promise<void>;
  shake(amount: number, seconds: number): void;
  /** Start the finale (front door with all locks open). */
  startFinale(): void;
  /** Unblock a wall cell for chicken, spooks and the sonar floor mask. */
  openPassage(cellX: number, cellY: number): void;
  /** Hat / upgrades changed outside the shop: rebuild the chicken loadout. */
  onLoadout(): void;
}

export interface Objective {
  text: string;
  progress: number;
  goal: number;
}

export interface Missions {
  readonly interactables: Interactable[];
  readonly door: Interactable;
  /** Nearest enabled interactable within reach, or null. */
  nearest(x: number, z: number): Interactable | null;
  interact(it: Interactable): void;
  /** Sonar ring passed a prop. */
  onPropHit(r: Revealable, echo: boolean, time: number): void;
  /** Chicken screamed (any length). */
  onScream(time: number, roomId: string | null): void;
  onFlash(time: number, roomId: string | null): void;
  /** Lights shining on a point as a core/noise LIGHT mask (0 = dark). */
  lights(x: number, z: number, time: number, cx: number, cz: number, facing: number): number;
  /** Mission objective for the room the chicken is in, written into `out`; false = none. */
  objective(roomId: string | null, out: Objective): boolean;
  complete(id: MissionId, debug: boolean): void;
  openLock(n: number): void;
  /** Re-apply visuals after loading a save. */
  restore(): void;
  update(dt: number, time: number): void;
}

export function createMissions(d: MissionDeps): Missions {
  const { store, ui, progress } = d;
  const m = (): ReturnType<Store['get']>['missions'] => store.get().missions;

  const interactables = INTERACTABLES.map((def) => {
    const it = createInteractable(def, d.reveal);
    d.scene.add(it.object);
    d.grid.blocked[def.cell.y * d.grid.width + def.cell.x] = 1;
    return it;
  });
  const byId = (id: string): Interactable => {
    const it = interactables.find((i) => i.def.id === id);
    if (!it) throw new Error(`interactable ${id} missing`);
    return it;
  };
  const door = byId('frontdoor');
  const clock = byId('clock');
  const boxes = interactables.filter((i) => i.def.kind === 'toybox');
  const hollow = byId('hollow');
  const donation = byId('donation');
  const kellerChest = byId('keller-chest');
  let lastHollow = -10;
  /** Remaining outline pulses of the hollow wall (one every PULSE_GAP seconds). */
  let hollowPulses = 0;
  let pulseIn = 0;

  // Fridge light island (off until the fuse is flipped).
  const fridge = new THREE.PointLight(0xcfe8ff, 0, 5.5, 1.3);
  fridge.position.set(d.fridgeLight.x, 1.0, d.fridgeLight.z);
  d.scene.add(fridge);
  let flicker = -1;

  let echoAt = -1;
  let lastEcho = -10;
  let lastFlash = -10;
  let lastScream = -10;
  let pendingClock = -10;
  let countedFlash = -10;
  let wasInWindowCount = -10;

  const answerBox = (): Interactable | undefined =>
    boxes.find((b) => b.def.index === m().echo.answer);

  const lockLamps = (): void => door.setLocks(countLocks(store.get()));

  const doOpenLock = (n: number): void => {
    const s = store.get();
    if (!openLock(s, n)) return;
    store.set({ locksOpened: countLocks(s) });
    store.emit({ type: 'lock-opened', lockId: `lock-${n}` });
    lockLamps();
    door.pulse();
    sfx.unlock();
    if (countLocks(s) === 3) ui.toast(T.allLocks, T.allLocksSub);
    else ui.toast(lockText(s));
    progress.save();
  };

  const powerOn = (): void => {
    fridge.intensity = 6;
    flicker = 1.4;
    for (const s of d.spooks.list) if (s.state.kind === 'rudi') wakeRudi(s.state);
  };

  const complete = (id: MissionId, debug: boolean): void => {
    const s = store.get();
    const flag = `mission:${id}`;
    if (s.flags[flag]) return;
    s.flags[flag] = true;
    if (debug) {
      forceComplete(s.missions, id);
      applyVisuals();
    }
    progress.markRoomDone(id);
    store.emit({ type: 'mission-complete', missionId: id });
    progress.addFeathers(MISSION_REWARD.feathers);
    progress.addXp(MISSION_REWARD.xp);
    ui.toast(T.missionDone, T.missionDoneSub(MISSION_REWARD.feathers));
    doOpenLock(MISSION_LOCK[id]);
  };

  /** Bring meshes in line with the mission state (after load / debug completion). */
  const applyVisuals = (): void => {
    const ms = m();
    for (const b of boxes) {
      const opened = ms.echo.opened[b.def.index ?? 0] === true;
      b.setOpen(opened);
      b.enabled = !opened && !ms.echo.done;
    }
    if (ms.jaeger.power && fridge.intensity === 0) powerOn();
    byId('fuse').setOpen(ms.jaeger.power);
    byId('drawer').setOpen(ms.jaeger.flashlight);
    d.flashlight.owned = ms.jaeger.flashlight;
    clock.setOpen(ms.uhr.done);
    clock.enabled = !ms.uhr.done;
    const flags = store.get().flags;
    byId('drawing').enabled = !flags['card:drawing'];
    byId('calendar').enabled = !flags['card:calendar'];
    byId('window').enabled = !flags['card:window'];
    const f = store.get().flags;
    hollow.enabled = canOpenHollow(f);
    if (f[KELLER_FLAG.open]) {
      hollow.setOpen(true);
      d.openPassage(HOLLOW_CELL.x, HOLLOW_CELL.y);
    }
    donation.enabled = !f[KELLER_FLAG.box];
    donation.setOpen(f[KELLER_FLAG.box] === true);
    kellerChest.enabled = !f[KELLER_FLAG.chest];
    kellerChest.setOpen(f[KELLER_FLAG.chest] === true);
    lockLamps();
  };

  const self: Missions = {
    interactables,
    door,
    nearest(x, z) {
      let best: Interactable | null = null;
      let bestD = INTERACT_RADIUS;
      for (const it of interactables) {
        if (!it.enabled) continue;
        const dist = Math.hypot(it.x - x, it.z - z);
        if (dist <= bestD) {
          bestD = dist;
          best = it;
        }
      }
      return best;
    },
    interact(it) {
      const ms = m();
      switch (it.def.kind) {
        case 'toybox': {
          const res = openBox(ms, it.def.index ?? -1);
          it.setOpen(res !== 'empty');
          it.enabled = false;
          if (res === 'key') {
            sfx.unlock();
            ui.toast(T.keyFound);
            for (const b of boxes) b.enabled = false;
            complete('echo', false);
          } else if (res === 'wrong') {
            sfx.wrong();
            const s = store.get();
            const lost = Math.min(WRONG_BOX_FEATHERS, s.feathers);
            store.set({ feathers: s.feathers - lost });
            store.emit({ type: 'feathers', amount: -lost });
            ui.toast(T.wrongBox, T.wrongBoxSub(lost));
            // A Socken-Geist crawls out and goes for the noise.
            const sock = d.spooks.spawn('socke', it.x + 0.9, it.z + 0.9);
            d.spooks.heard(sock, it.x, it.z, 'echo', 0);
            d.shake(0.15, 0.2);
          } else {
            ui.toast(T.boxEmpty);
          }
          break;
        }
        case 'drawing':
        case 'window':
          it.enabled = false;
          void d.card(it.def.kind);
          break;
        case 'calendar':
          it.enabled = false;
          void d.card('calendar');
          void d.card('twist1');
          break;
        case 'fuse':
          if (flipFuse(ms) === 'power-on') {
            it.setOpen(true);
            it.pulse();
            sfx.powerOn();
            d.shake(0.25, 0.4);
            powerOn();
            ui.toast(T.powerOn, T.powerOnSub);
            store.emit({ type: 'mission-progress', missionId: 'jaeger', progress: 1, goal: 2 });
            progress.save();
          }
          it.enabled = false;
          break;
        case 'drawer': {
          const res = openDrawer(ms);
          if (res === 'dark') {
            sfx.wrong();
            ui.toast(T.drawerDark, T.drawerDarkSub);
            break;
          }
          it.setOpen(true);
          it.enabled = false;
          if (res === 'flashlight') {
            it.pulse();
            d.flashlight.owned = true;
            ui.toast(T.flashlight, T.flashlightSub);
            complete('jaeger', false);
          }
          break;
        }
        case 'clock':
          ui.toast(T.clockMiss, T.clockMissSub);
          break;
        case 'hollow':
          if (openHollow(store.get().flags)) {
            it.setOpen(true);
            it.enabled = false;
            d.openPassage(HOLLOW_CELL.x, HOLLOW_CELL.y);
            sfx.slide();
            d.shake(0.2, 0.9);
            ui.toast(T.kellerOpen, T.kellerOpenSub);
            progress.save();
          }
          break;
        case 'donation': {
          const s = store.get();
          it.enabled = false;
          if (!openDonation(s.flags)) break;
          it.setOpen(true);
          it.pulse();
          sfx.unlock();
          store.set({
            ...grantHat(s.hats, KELLER_REWARD.hat),
            ghostlights: s.ghostlights + KELLER_REWARD.ghostlights,
          });
          store.emit({ type: 'ghostlight', amount: KELLER_REWARD.ghostlights });
          store.emit({ type: 'pickup', itemId: KELLER_REWARD.hat });
          d.onLoadout();
          ui.toast(T.crown, T.crownSub);
          progress.save();
          void d.card('twist2');
          break;
        }
        case 'chest':
          it.enabled = false;
          if (!openKellerChest(store.get().flags)) break;
          it.setOpen(true);
          it.pulse();
          sfx.combo(5);
          progress.addFeathers(KELLER_REWARD.chestFeathers, it.x, it.z);
          ui.toast(T.chest, T.chestSub(KELLER_REWARD.chestFeathers));
          progress.save();
          break;
        case 'frontdoor':
          if (countLocks(store.get()) === 3) d.startFinale();
          else {
            sfx.wrong();
            ui.toast(lockText(store.get()));
          }
          break;
      }
    },
    onPropHit(r, echo, time) {
      if (r === hollow.revealable) {
        const res = hearHollow(store.get().flags, echo, time, lastHollow);
        if (res === 'hohl') {
          lastHollow = time;
          hollow.enabled = canOpenHollow(store.get().flags);
          hollowPulses = 4;
          pulseIn = 0;
          window.setTimeout(() => sfx.knock(), 120);
          ui.toast(T.hollow, T.hollowSub);
        }
        return;
      }
      if (echo) return;
      const ms = m();
      if (!ms.echo.done) {
        const ans = answerBox();
        if (ans && r === ans.revealable && echoAt < 0 && time - lastEcho > 1.5) {
          echoAt = time + ECHO_DELAY;
        }
      }
      if (r === clock.revealable && !ms.uhr.done) {
        if (inLightningWindow(lastScream, lastFlash) && countedFlash !== lastFlash) {
          countedFlash = lastFlash;
          clockCount();
        } else {
          pendingClock = lastScream;
          if (wasInWindowCount !== lastScream) {
            wasInWindowCount = lastScream;
            ui.toast(T.clockMiss, T.clockMissSub);
          }
        }
      }
    },
    onScream(time, roomId) {
      lastScream = time;
      if (roomId === 'wohnzimmer' && !store.get().flags['scare:hand']) {
        store.get().flags['scare:hand'] = true;
        // Scripted scare: the hand nearest to the chicken bursts out of the sofa.
        let best: (typeof d.spooks.list)[number] | null = null;
        for (const s of d.spooks.list) {
          if (s.state.kind !== 'hand') continue;
          if (!best || s.dist < best.dist) best = s;
        }
        if (best) {
          popHand(best.state);
          sfx.handPop();
          d.shake(0.3, 0.3);
        }
      }
    },
    onFlash(time, roomId) {
      lastFlash = time;
      if (roomId === 'wohnzimmer') {
        clock.pulse();
        window.setTimeout(() => sfx.cuckoo(), 250);
      }
      if (!m().uhr.done && inLightningWindow(pendingClock, time) && countedFlash !== time) {
        countedFlash = time;
        pendingClock = -10;
        clockCount();
      }
    },
    lights(x, z, time, cx, cz, facing) {
      let mask = 0;
      if (time - lastFlash <= FLASH_LIT) mask |= LIGHT.lightning;
      if (
        d.nightLight &&
        Math.hypot(x - d.nightLight.x, z - d.nightLight.z) <= NIGHT_LIGHT_RADIUS
      ) {
        mask |= LIGHT.night;
      }
      // The fridge counts once the power is on (also during the flicker).
      if (
        m().jaeger.power &&
        Math.hypot(x - d.fridgeLight.x, z - d.fridgeLight.z) <= FRIDGE_RADIUS
      ) {
        mask |= LIGHT.fridge;
      }
      if (d.flashlight.lights(x, z, cx, cz, facing)) mask |= LIGHT.torch;
      return mask;
    },
    objective(roomId, out) {
      for (const id of MISSION_IDS) {
        if (MISSION_ROOM[id] !== roomId || m()[id].done) continue;
        out.text = objectiveText(m(), id);
        out.progress = missionSteps(m(), id);
        out.goal = MISSION_GOAL[id];
        return true;
      }
      return false;
    },
    complete,
    openLock: doOpenLock,
    restore: applyVisuals,
    update(dt, time) {
      for (const it of interactables) it.update(dt, time);
      if (hollowPulses > 0) {
        pulseIn -= dt;
        if (pulseIn <= 0) {
          // The outline flares up four times in a row, like the wall is knocking back.
          hollowPulses--;
          pulseIn = PULSE_GAP;
          d.reveal.hit(hollow.revealable);
          hollow.pulse();
        }
      }
      if (echoAt >= 0 && time >= echoAt) {
        echoAt = -1;
        lastEcho = time;
        const ans = answerBox();
        if (ans && !m().echo.done) {
          d.sonar.fire(0, ans.x, ans.z, { radius: ECHO_RADIUS, source: 'echo' });
          sfx.echo(0);
          ans.pulse();
        }
      }
      if (flicker > 0) {
        flicker = Math.max(0, flicker - dt);
        // Everything flickers out for a moment, then the fridge hums back on.
        fridge.intensity = flicker > 0 ? (Math.sin(time * 47) > 0.2 ? 6 : 0) : 6;
      }
    },
  };

  function clockCount(): void {
    const res = clockScream(m(), true);
    clock.pulse();
    sfx.cuckoo();
    if (res === 'count') {
      const p = missionProgress(m(), 'uhr');
      ui.toast(T.clockCount(p.progress));
      store.emit({
        type: 'mission-progress',
        missionId: 'uhr',
        progress: p.progress,
        goal: p.goal,
      });
    } else if (res === 'open') {
      clock.setOpen(true);
      clock.enabled = false;
      store.emit({ type: 'mission-progress', missionId: 'uhr', progress: 3, goal: 3 });
      void d.card('clock');
      complete('uhr', false);
    }
  }

  applyVisuals();
  return self;
}
