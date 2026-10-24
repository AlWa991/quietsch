import type * as THREE from 'three';
import {
  FOLLOW,
  hearSound,
  pacify,
  revive,
  settle,
  SPOOK,
  stepSpook,
  type SpookInput,
} from '@/core/spook-fsm';
import { noiseReaction, type NoiseSource } from '@/core/noise';
import type { SpookKind } from '@/core/types';
import { createSpookEntity, type Spook } from '@/entities/spook';
import type { RevealSystem, Revealable } from '@/render/reveal';
import { createMotor } from '@/audio/sfx';
import { isBlocked, type CollisionGrid } from './collision';
import { roomBounds } from '@/world/house-map';

export interface SpookHooks {
  onCaught(s: Spook): void;
  /** A peaceful follower reached the Korb. */
  onDelivered(s: Spook): void;
}

export interface SpookFrame {
  dt: number;
  time: number;
  chickenX: number;
  chickenZ: number;
  chickenMoving: boolean;
  hopNoise: number;
  /** Bellos Halsband is on: nobody catches the chicken. */
  ignore: boolean;
  /** FSMs run only while true; visuals always update. */
  active: boolean;
  korbX: number;
  korbZ: number;
}

export interface SpookManager {
  readonly list: Spook[];
  /** Nearest hostile spook distance last frame and whether any is chasing. */
  readonly nearest: number;
  readonly chasing: boolean;
  spawn(kind: SpookKind, x: number, z: number): Spook;
  byReveal(r: Revealable): Spook | undefined;
  /**
   * A noise reached a spook. A scream at a spook standing in a light it fears (`lights` mask,
   * see core/noise) makes it peaceful; otherwise it hears the origin. Returns true if pacified.
   */
  heard(s: Spook, ox: number, oz: number, source: NoiseSource, lights: number): boolean;
  /** Finale: peaceful spooks settle close behind (x, z), the others in rows further back. */
  gather(x: number, z: number): void;
  /** Reload: a spook delivered in a saved run rests peacefully at the Korb again. */
  restAtKorb(s: Spook, korbX: number, korbZ: number): void;
  update(f: SpookFrame): void;
}

const KORB_SLOTS: [number, number][] = [
  [-1.1, -0.5],
  [1.1, -0.5],
  [-0.7, -1.3],
  [0.7, -1.3],
  [0, -1.6],
  [-1.6, 0.3],
  [1.6, 0.3],
  [0, 1.4],
];

export function createSpookManager(
  scene: THREE.Scene,
  reveal: RevealSystem,
  walls: CollisionGrid,
  hooks: SpookHooks,
): SpookManager {
  const list: Spook[] = [];
  const motor = createMotor();
  const kitchen = roomBounds('kueche');
  const r = SPOOK.radius;
  const wallFree = (x: number, z: number): boolean =>
    !isBlocked(walls, x - r, z) &&
    !isBlocked(walls, x + r, z) &&
    !isBlocked(walls, x, z - r) &&
    !isBlocked(walls, x, z + r);
  // Rudi's cable does not reach beyond the kitchen.
  const kitchenFree = (x: number, z: number): boolean =>
    wallFree(x, z) &&
    (!kitchen ||
      (x > kitchen.x + 0.4 &&
        x < kitchen.x + kitchen.w - 0.4 &&
        z > kitchen.y + 0.4 &&
        z < kitchen.y + kitchen.h - 0.4));

  const input: SpookInput = {
    dt: 0,
    chickenX: 0,
    chickenZ: 0,
    chickenMoving: false,
    canMove: wallFree,
    rand: Math.random,
    hopNoise: 1,
    ignore: false,
  };
  let nearest = Infinity;
  let chasing = false;
  let delivered = 0;

  const self: SpookManager = {
    list,
    get nearest() {
      return nearest;
    },
    get chasing() {
      return chasing;
    },
    spawn(kind, x, z) {
      const s = createSpookEntity(x, z, reveal, kind);
      list.push(s);
      scene.add(s.object);
      return s;
    },
    byReveal(rv) {
      for (const s of list) if (s.reveal === rv) return s;
      return undefined;
    },
    heard(s, ox, oz, source, lights) {
      const st = s.state;
      const reaction = noiseReaction(st.kind, st.mode, source, lights);
      if (reaction === 'pacify') {
        pacify(st);
        return true;
      }
      if (reaction === 'hear') hearSound(st, ox, oz);
      return false;
    },
    gather(x, z) {
      // Peaceful ones first: they take the front arc, right behind the chicken.
      const order = list
        .slice()
        .sort((a, b) => Number(b.state.peaceful) - Number(a.state.peaceful));
      const front = order.filter((s) => s.state.peaceful).length;
      order.forEach((s, i) => {
        const peaceful = i < front;
        const k = peaceful ? i : i - front;
        const row = Math.floor(k / 5);
        const col = (k % 5) - 2;
        const st = s.state;
        const dist = peaceful ? 1.1 + row * 0.7 : 1.4 + Math.ceil(front / 5) * 0.7 + row * 0.9;
        settle(st, x + col * (peaceful ? 0.75 : 0.9), z - dist - Math.abs(col) * 0.15);
        // They drift in from the dark behind the chicken (rest mode walks home at returnSpeed,
        // so ~3.6 m back takes ~3 s); closer if a wall is in the way.
        st.x = st.homeX + col * 0.5;
        for (let back = 3.6 + row * 0.5; back >= 0.6; back -= 0.6) {
          st.z = st.homeZ - back;
          if (wallFree(st.x, st.z)) break;
        }
      });
    },
    restAtKorb(s, korbX, korbZ) {
      const slot = KORB_SLOTS[delivered % KORB_SLOTS.length] ?? [0, 0];
      delivered++;
      pacify(s.state);
      settle(s.state, korbX + slot[0], korbZ + slot[1]);
      s.state.x = s.state.homeX;
      s.state.z = s.state.homeZ;
    },
    update(f) {
      input.dt = f.dt;
      input.chickenX = f.chickenX;
      input.chickenZ = f.chickenZ;
      input.chickenMoving = f.chickenMoving;
      input.hopNoise = f.hopNoise;
      input.ignore = f.ignore;
      nearest = Infinity;
      chasing = false;
      let rudiLevel = 0;
      for (const s of list) {
        const st = s.state;
        if (st.gone) {
          // Defeated spooks come back at home once the chicken is away (spawn system may
          // move them to a crevice first via `respawnAt`).
          if (f.active) st.respawn -= f.dt;
          if (st.respawn <= 0 && Math.hypot(st.homeX - f.chickenX, st.homeZ - f.chickenZ) > 6) {
            revive(st, st.homeX, st.homeZ);
          }
          s.update(f.dt, f.time, f.chickenX, f.chickenZ);
          continue;
        }
        if (f.active) {
          // Rudi's cable only holds him while he is hostile; peaceful Rudi rolls along freely.
          input.canMove =
            st.kind === 'rudi' && !st.peaceful && st.mode !== 'rest' ? kitchenFree : wallFree;
          if (stepSpook(st, input) === 'caught') hooks.onCaught(s);
          if (st.mode === 'follow') {
            const dx = st.x - f.chickenX;
            const dz = st.z - f.chickenZ;
            const d = Math.hypot(dx, dz);
            if (d > FOLLOW.snap) {
              // Left behind (ladder, panic, wall): pop back in right behind the chicken.
              const k = FOLLOW.distance / d;
              const nx = f.chickenX + dx * k;
              const nz = f.chickenZ + dz * k;
              st.x = wallFree(nx, nz) ? nx : f.chickenX;
              st.z = wallFree(nx, nz) ? nz : f.chickenZ;
            }
          }
          if (
            st.mode === 'follow' &&
            Math.hypot(f.chickenX - f.korbX, f.chickenZ - f.korbZ) < 1.8 &&
            Math.hypot(st.x - f.korbX, st.z - f.korbZ) < 3.5
          ) {
            const slot = KORB_SLOTS[delivered % KORB_SLOTS.length] ?? [0, 0];
            delivered++;
            settle(st, f.korbX + slot[0], f.korbZ + slot[1]);
            hooks.onDelivered(s);
          }
        }
        s.update(f.dt, f.time, f.chickenX, f.chickenZ);
        const hostile = st.mode !== 'follow' && st.mode !== 'rest' && st.mode !== 'dormant';
        if (hostile && st.kind !== 'hand') {
          if (s.dist < nearest) nearest = s.dist;
          if (st.mode === 'chase') chasing = true;
        }
        if (st.kind === 'rudi' && hostile && f.active) {
          const driving = st.mode === 'chase' && st.noiseAge < 1.1;
          const att = Math.max(0, 1 - s.dist / 16);
          rudiLevel = Math.max(rudiLevel, (driving ? 1 : 0.25) * att);
        }
      }
      motor.set(rudiLevel);
    },
  };
  return self;
}
