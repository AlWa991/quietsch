import {
  addXp,
  applyCatch,
  heartRegenRate,
  playerStats,
  type PlayerStats,
  type RoomRecord,
} from '@/core/economy';
import { MISSION_ROOM, type MissionId } from '@/core/missions';
import { saveGame } from '@/core/save';
import type { Store } from '@/ui/store';
import { sfx } from '@/audio/sfx';

export interface Progress {
  readonly stats: PlayerStats;
  /** Earned feathers: wallet + lifetime total + the same amount of XP. */
  addFeathers(amount: number, x?: number, z?: number): void;
  addXp(amount: number): void;
  /** Recompute stats from upgrades (after buying / loading). */
  applyUpgrades(): void;
  /** Apply one catch. Returns lost feathers and whether hearts hit zero. */
  caught(roomId: string | null): { lost: number; panic: boolean };
  room(id: string): RoomRecord;
  markRoomDone(id: MissionId): void;
  /** Play time, room timers, heart regen at the Korb. Returns true when a heart came back. */
  update(dt: number, roomId: string | null, atKorb: boolean): boolean;
  save(): void;
}

export function createProgress(store: Store): Progress {
  let stats = playerStats(store.get().upgrades);
  let regen = 0;

  const room = (id: string): RoomRecord => {
    const rooms = store.get().rooms;
    let r = rooms[id];
    if (!r) {
      r = { time: 0, caught: 0, done: false };
      rooms[id] = r;
    }
    return r;
  };

  const self: Progress = {
    get stats() {
      return stats;
    },
    addFeathers(amount, x, z) {
      if (amount <= 0) return;
      const s = store.get();
      store.set({ feathers: s.feathers + amount, feathersEarned: s.feathersEarned + amount });
      self.addXp(amount);
      store.emit({
        type: 'feathers',
        amount,
        at: x !== undefined && z !== undefined ? { x, y: z } : undefined,
      });
    },
    addXp(amount) {
      const res = addXp(store.get().xp, amount);
      store.set({ xp: res.xp, rank: res.rank });
      if (res.ranksGained > 0) {
        store.emit({ type: 'rank-up', rank: res.rank });
        sfx.rankUp();
      }
    },
    applyUpgrades() {
      stats = playerStats(store.get().upgrades);
      const s = store.get();
      const gained = Math.max(0, stats.maxHearts - s.maxHearts);
      store.set({
        maxHearts: stats.maxHearts,
        hearts: Math.min(stats.maxHearts, s.hearts + gained),
      });
    },
    caught(roomId) {
      const s = store.get();
      const res = applyCatch(s.hearts, s.feathers, stats.lossShare);
      store.set({ hearts: res.hearts, feathers: res.feathers });
      if (roomId) room(roomId).caught++;
      regen = 0;
      return { lost: res.lost, panic: res.panic };
    },
    room,
    markRoomDone(id) {
      room(MISSION_ROOM[id]).done = true;
    },
    update(dt, roomId, atKorb) {
      const s = store.get();
      s.time += dt;
      if (roomId) {
        const r = room(roomId);
        if (!r.done) r.time += dt;
      }
      if (atKorb && s.hearts < s.maxHearts) {
        regen += heartRegenRate(s.maxHearts) * dt;
        if (regen >= 1) {
          regen -= 1;
          store.set({ hearts: Math.min(s.maxHearts, s.hearts + 1) });
          return true;
        }
      } else {
        regen = 0;
      }
      return false;
    },
    save() {
      try {
        saveGame(window.localStorage, store.get());
      } catch {
        // localStorage blocked: keep playing without saves
      }
    },
  };
  return self;
}
