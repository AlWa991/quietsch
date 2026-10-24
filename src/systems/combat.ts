import * as THREE from 'three';
import {
  applyHit,
  createCombo,
  createDrop,
  createStreak,
  ENEMY_FEATHERS,
  ENEMY_XP,
  HAND_RETREAT,
  hitsBack,
  inPeckCone,
  launchDrop,
  PECK,
  peckDamage,
  pressPeck,
  registerKill,
  STREAK,
  stepCombo,
  stepDrop,
  stepHealth,
  type Drop,
} from '@/core/combat';
import { LIGHT } from '@/core/noise';
import type { SpookKind } from '@/core/types';
import type { Spook } from '@/entities/spook';
import { enemySfx } from '@/audio/enemies-sfx';
import type { CombatHud } from '@/ui/combat-hud';
import { COMBAT_T } from '@/ui/texts';
import type { SpookManager } from './spooks';

export interface CombatDeps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  spooks: SpookManager;
  hud: CombatHud;
  /** Free for small things (walls only; feathers fly over furniture). */
  canMove(x: number, z: number): boolean;
  /** Light mask at a point (core/noise LIGHT bits). */
  lights(x: number, z: number): number;
  /** Peck damage per hit (Scharfer Schnabel = 2). */
  baseDamage(): number;
  chicken: {
    readonly pos: { x: number; z: number };
    readonly facing: number;
    peck(step: number): void;
    face(angle: number): void;
    push(vx: number, vz: number): void;
  };
  toScreen(x: number, y: number, z: number): { sx: number; sy: number };
  hitstop(seconds: number): void;
  shake(amount: number, seconds: number): void;
  punch(deg: number): void;
  toast(title: string, sub?: string): void;
  addFeathers(n: number, x: number, z: number): void;
  addXp(n: number): void;
  /** A spook was defeated (counts, first-kill card, spawn bookkeeping). */
  onDefeat(s: Spook): void;
  /** Gone spooks may respawn after this long (spawn system decides where). */
  respawnDelay: number;
}

export interface Combat {
  /** Peck button pressed (J / left mouse). */
  press(): void;
  update(dt: number, time: number): void;
  /** Hit a spook from outside a peck (pumpkin blast, chain). Returns true if it was defeated. */
  damage(s: Spook, dmg: number, fromX: number, fromZ: number, knock: number): boolean;
  /** Particle burst (also used by jumpscares / explosions). */
  burst(x: number, y: number, z: number, n: number, color: number, speed: number): void;
  readonly kills: number;
}

const PARTICLES = 220;
const DROPS = 120;
const BAR_W = 0.8;

/** Burst colour per kind: what the spook is made of. */
const STUFF: Record<SpookKind, number> = {
  socke: 0xe8eef8,
  hand: 0x9fb0a0,
  rudi: 0x8a8070,
  teddy: 0x8a5a32,
  kuerbis: 0xff8a20,
  spinne: 0x1a1a1e,
};

/** HP bar height above the spook's feet (m). */
const BAR_Y: Record<SpookKind, number> = {
  socke: 1.95,
  hand: 1.7,
  rudi: 1.15,
  teddy: 1.75,
  kuerbis: 1.0,
  spinne: 0.9,
};

export function createCombat(d: CombatDeps): Combat {
  const combo = createCombo();
  const streak = createStreak();
  let kills = 0;
  let chain = 0;
  let chainAge = 0;
  const rand = Math.random;

  // --- Particles: one instanced mesh, simulated in typed arrays ----------------------------
  const pGeo = new THREE.BoxGeometry(0.06, 0.02, 0.15);
  const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const particles = new THREE.InstancedMesh(pGeo, pMat, PARTICLES);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particles.frustumCulled = false;
  particles.userData.noReveal = true;
  const pp = new Float32Array(PARTICLES * 3);
  const pv = new Float32Array(PARTICLES * 3);
  const pl = new Float32Array(PARTICLES);
  const pr = new Float32Array(PARTICLES);
  const col = new THREE.Color();
  const col2 = new THREE.Color();
  for (let i = 0; i < PARTICLES; i++) particles.setColorAt(i, col.setHex(0xffffff));
  let pNext = 0;
  const dummy = new THREE.Object3D();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < PARTICLES; i++) particles.setMatrixAt(i, ZERO);
  d.scene.add(particles);

  function burst(x: number, y: number, z: number, n: number, color: number, speed: number): void {
    col.setHex(color);
    for (let k = 0; k < n; k++) {
      const i = pNext;
      pNext = (pNext + 1) % PARTICLES;
      const a = rand() * Math.PI * 2;
      const s = speed * (0.4 + rand() * 0.8);
      pp[i * 3] = x;
      pp[i * 3 + 1] = y;
      pp[i * 3 + 2] = z;
      pv[i * 3] = Math.cos(a) * s;
      pv[i * 3 + 1] = 1.5 + rand() * speed;
      pv[i * 3 + 2] = Math.sin(a) * s;
      pl[i] = 0.5 + rand() * 0.5;
      pr[i] = rand() * 6;
      // Slight per-particle variation so bursts are not flat.
      particles.setColorAt(i, col2.copy(col).offsetHSL(0, 0, (rand() - 0.5) * 0.25));
    }
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
  }

  function stepParticles(dt: number): void {
    let any = false;
    for (let i = 0; i < PARTICLES; i++) {
      if (pl[i] === 0) continue;
      any = true;
      const life = Math.max(0, (pl[i] ?? 0) - dt);
      pl[i] = life;
      if (life === 0) {
        particles.setMatrixAt(i, ZERO);
        continue;
      }
      const j = i * 3;
      pv[j + 1] = (pv[j + 1] ?? 0) - 9 * dt;
      const drag = Math.exp(-2.5 * dt);
      pv[j] = (pv[j] ?? 0) * drag;
      pv[j + 2] = (pv[j + 2] ?? 0) * drag;
      pp[j] = (pp[j] ?? 0) + (pv[j] ?? 0) * dt;
      pp[j + 1] = Math.max(0.02, (pp[j + 1] ?? 0) + (pv[j + 1] ?? 0) * dt);
      pp[j + 2] = (pp[j + 2] ?? 0) + (pv[j + 2] ?? 0) * dt;
      pr[i] = (pr[i] ?? 0) + dt * 9;
      dummy.position.set(pp[j] ?? 0, pp[j + 1] ?? 0, pp[j + 2] ?? 0);
      dummy.rotation.set(pr[i] ?? 0, (pr[i] ?? 0) * 0.7, 0);
      dummy.scale.setScalar(Math.min(1, life * 3));
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
    }
    if (any) particles.instanceMatrix.needsUpdate = true;
  }

  // --- Kill shockwaves: pooled additive rings + a bright core puff -----------------------
  const RINGS = 6;
  const ringGeo = new THREE.RingGeometry(0.55, 0.75, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const puffGeo = new THREE.SphereGeometry(0.5, 12, 8);
  interface Wave {
    ring: THREE.Mesh;
    puff: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    puffMat: THREE.MeshBasicMaterial;
    t: number;
    size: number;
  }
  const waves: Wave[] = [];
  for (let i = 0; i < RINGS; i++) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const puffMat = ringMat.clone();
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const puff = new THREE.Mesh(puffGeo, puffMat);
    for (const m of [ring, puff]) {
      m.visible = false;
      m.userData.noReveal = true;
      d.scene.add(m);
    }
    waves.push({ ring, puff, ringMat, puffMat, t: 1, size: 1 });
  }
  let wNext = 0;
  function shockwave(x: number, z: number, color: number, size: number): void {
    const w = waves[wNext];
    wNext = (wNext + 1) % RINGS;
    if (!w) return;
    w.t = 0;
    w.size = size;
    w.ringMat.color.setHex(color);
    w.puffMat.color.setHex(0xffffff);
    w.ring.position.set(x, 0.08, z);
    w.puff.position.set(x, 0.7, z);
    w.ring.visible = true;
    w.puff.visible = true;
  }
  function stepWaves(dt: number): void {
    for (const w of waves) {
      if (w.t >= 1) continue;
      w.t = Math.min(1, w.t + dt / 0.45);
      const e = 1 - (1 - w.t) * (1 - w.t);
      w.ring.scale.setScalar(0.3 + e * 2.6 * w.size);
      w.ringMat.opacity = (1 - w.t) * 0.9;
      w.puff.scale.setScalar((0.4 + e * 1.1) * w.size);
      w.puffMat.opacity = Math.max(0, 1 - w.t * 2.2) * 0.8;
      if (w.t >= 1) {
        w.ring.visible = false;
        w.puff.visible = false;
      }
    }
  }

  // --- Feather drops ---------------------------------------------------------------------
  const fGeo = new THREE.OctahedronGeometry(0.11, 0);
  fGeo.scale(0.55, 0.2, 1.3);
  const fMat = new THREE.MeshStandardMaterial({
    color: 0xffd23f,
    emissive: 0xffb020,
    emissiveIntensity: 1.4,
    roughness: 0.6,
  });
  const feathers = new THREE.InstancedMesh(fGeo, fMat, DROPS);
  feathers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  feathers.frustumCulled = false;
  feathers.userData.noReveal = true;
  for (let i = 0; i < DROPS; i++) feathers.setMatrixAt(i, ZERO);
  d.scene.add(feathers);
  const drops: Drop[] = [];
  for (let i = 0; i < DROPS; i++) drops.push(createDrop());
  let dNext = 0;

  function dropFeathers(x: number, z: number, total: number): void {
    // Up to 10 pickups, each worth a share; big rewards rain more pieces.
    const pieces = Math.max(1, Math.min(total >= 40 ? 24 : 10, total));
    const base = Math.floor(total / pieces);
    let rest = total - base * pieces;
    for (let k = 0; k < pieces; k++) {
      const dr = drops[dNext];
      dNext = (dNext + 1) % DROPS;
      if (!dr) continue;
      launchDrop(dr, x, z, base + (rest > 0 ? 1 : 0), rand);
      if (rest > 0) rest--;
    }
  }

  function stepDrops(dt: number, time: number): void {
    const cx = d.chicken.pos.x;
    const cz = d.chicken.pos.z;
    let changed = false;
    for (let i = 0; i < DROPS; i++) {
      const dr = drops[i];
      if (!dr) continue;
      if (!dr.active) continue;
      changed = true;
      if (stepDrop(dr, dt, cx, cz, d.canMove)) {
        d.addFeathers(dr.value, dr.x, dr.z);
        enemySfx.featherPickup();
        feathers.setMatrixAt(i, ZERO);
        continue;
      }
      if (!dr.active) {
        feathers.setMatrixAt(i, ZERO);
        continue;
      }
      dummy.position.set(dr.x, dr.y + Math.sin(time * 4 + i) * 0.04, dr.z);
      dummy.rotation.set(0.3, time * 3 + i, Math.sin(time * 5 + i) * 0.4);
      // Fade (shrink) during the last 3 s.
      dummy.scale.setScalar(Math.min(1, (25 - dr.age) / 3));
      dummy.updateMatrix();
      feathers.setMatrixAt(i, dummy.matrix);
    }
    if (changed) feathers.instanceMatrix.needsUpdate = true;
  }

  // --- HP bars (lazily per spook, billboarded) ------------------------------------------
  const barBgGeo = new THREE.PlaneGeometry(BAR_W + 0.06, 0.13);
  const barGeo = new THREE.PlaneGeometry(BAR_W, 0.08);
  barGeo.translate(BAR_W / 2, 0, 0);
  const barBgMat = new THREE.MeshBasicMaterial({
    color: 0x05060a,
    transparent: true,
    opacity: 0.75,
    depthTest: false,
    fog: false,
  });
  interface Bar {
    group: THREE.Group;
    fill: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    lag: THREE.Mesh;
    lagV: number;
  }
  const bars = new Map<Spook, Bar>();
  const lagMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    fog: false,
  });
  function barFor(s: Spook): Bar {
    let b = bars.get(s);
    if (b) return b;
    const group = new THREE.Group();
    const bg = new THREE.Mesh(barBgGeo, barBgMat);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4d6d,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    const lag = new THREE.Mesh(barGeo, lagMat);
    lag.position.set(-BAR_W / 2, 0, 0.001);
    const fill = new THREE.Mesh(barGeo, mat);
    fill.position.set(-BAR_W / 2, 0, 0.002);
    for (const m of [bg, lag, fill]) {
      m.renderOrder = 30;
      m.userData.noReveal = true;
    }
    group.add(bg, lag, fill);
    group.visible = false;
    d.scene.add(group);
    b = { group, fill, mat, lag, lagV: 1 };
    bars.set(s, b);
    return b;
  }

  function stepBars(dt: number): void {
    for (const s of d.spooks.list) {
      const st = s.state;
      const show = st.bar > 0 && !st.gone && !st.peaceful;
      const b = show ? barFor(s) : bars.get(s);
      if (!b) continue;
      b.group.visible = show;
      if (!show) continue;
      const v = st.hp / st.maxHp;
      b.lagV += (v - b.lagV) * (1 - Math.exp(-4 * dt));
      b.fill.scale.x = Math.max(0.001, v);
      b.lag.scale.x = Math.max(0.001, b.lagV);
      b.mat.color.setHex(v > 0.6 ? 0x7dff8a : v > 0.3 ? 0xffd23f : 0xff4d6d);
      b.group.position.set(st.x, BAR_Y[st.kind] + st.y, st.z);
      b.group.quaternion.copy(d.camera.quaternion);
    }
  }

  // --- Hits --------------------------------------------------------------------------------
  /** Hand: only while it is out of the sofa. Spider: not while it hangs at the ceiling. */
  function attackable(s: Spook): boolean {
    const st = s.state;
    if (st.gone || st.peaceful || st.mode === 'follow' || st.mode === 'rest') return false;
    if (st.kind === 'hand') return st.mode === 'alert' || st.mode === 'chase';
    if (st.kind === 'spinne') return st.y < 1.4;
    if (st.kind === 'rudi') return st.mode !== 'dormant';
    return true;
  }

  const handPaid = new Set<Spook>();

  function defeat(s: Spook): void {
    const st = s.state;
    const x = st.x;
    const z = st.z;
    kills++;
    const big = st.kind === 'rudi';
    burst(x, 0.7, z, big ? 70 : 34, STUFF[st.kind], big ? 6 : 4.2);
    shockwave(x, z, big ? 0xffb060 : 0xbfe0ff, big ? 2 : 1);
    burst(x, 0.7, z, big ? 30 : 14, 0xffd23f, big ? 5 : 3.5);
    enemySfx.death(st.kind);
    if (big) enemySfx.rudiExplode();
    d.shake(big ? 0.5 : 0.18, big ? 0.6 : 0.2);
    d.punch(big ? -6 : -2.5);
    let feathersOut = ENEMY_FEATHERS[st.kind];
    if (st.kind === 'hand') {
      // The hand cannot die: it hides in its sofa for 10 s (pays once per hand).
      st.mode = 'return';
      st.timer = HAND_RETREAT;
      st.cooldown = HAND_RETREAT;
      st.hp = st.maxHp;
      st.bar = 0;
      if (handPaid.has(s)) feathersOut = 2;
      handPaid.add(s);
      d.toast(COMBAT_T.handRetreat);
    } else {
      st.gone = true;
      st.respawn = big ? Infinity : d.respawnDelay;
      st.kbx = 0;
      st.kbz = 0;
      if (big) d.toast(COMBAT_T.rudiDown, COMBAT_T.rudiDownSub);
    }
    dropFeathers(x, z, feathersOut);
    d.addXp(ENEMY_XP[st.kind]);
    const bonus = registerKill(streak, nowTime);
    if (bonus > 0) {
      d.toast(
        bonus === STREAK.double ? COMBAT_T.double : COMBAT_T.triple,
        COMBAT_T.streakSub(bonus),
      );
      enemySfx.streak(streak.count);
      dropFeathers(d.chicken.pos.x, d.chicken.pos.z, bonus);
    }
    d.onDefeat(s);
  }

  function damage(s: Spook, dmg: number, fromX: number, fromZ: number, knock: number): boolean {
    const st = s.state;
    if (!attackable(s)) return false;
    const res = applyHit(st, dmg, st.x - fromX, st.z - fromZ, knock);
    if (res === 'defeated') {
      defeat(s);
      return true;
    }
    if (res === 'hurt') enemySfx.hurt(st.kind);
    return false;
  }

  let nowTime = 0;
  let seenStarts = 0;

  function resolveImpact(step: number): void {
    const cx = d.chicken.pos.x;
    const cz = d.chicken.pos.z;
    const finisher = step === 3;
    let hits = 0;
    let anyImmune = false;
    for (const s of d.spooks.list) {
      const st = s.state;
      if (!attackable(s)) continue;
      // Ceiling spider / tall enemies: the cone is measured on the floor.
      if (
        !inPeckCone(
          cx,
          cz,
          d.chicken.facing,
          st.x,
          st.z,
          PECK.range + (st.kind === 'rudi' ? 0.25 : 0),
        )
      )
        continue;
      const dirX = st.x - cx;
      const dirZ = st.z - cz;
      const stunned = st.stun > 0;
      const dmg = peckDamage(st.kind, {
        base: d.baseDamage(),
        stunned,
        behind: hitsBack(st.heading, dirX, dirZ),
        inFridgeLight: (d.lights(st.x, st.z) & LIGHT.fridge) !== 0,
      });
      const knock = st.kind === 'rudi' ? 0.4 : finisher ? PECK.finisherKnock : PECK.knockback;
      const res = applyHit(st, dmg, dirX, dirZ, knock);
      const p = d.toScreen(st.x, BAR_Y[st.kind] * 0.7 + st.y, st.z);
      if (res === 'immune') {
        anyImmune = true;
        d.hud.number(COMBAT_T.immune, p.sx, p.sy, 'immune');
        burst(st.x, 0.5, st.z, 6, 0xffe9a0, 2.5);
        continue;
      }
      hits++;
      d.hud.number(String(dmg), p.sx, p.sy, dmg > 1 || finisher ? 'crit' : 'normal');
      burst(st.x, 0.75 + st.y, st.z, finisher ? 14 : 8, STUFF[st.kind], finisher ? 4 : 3);
      if (res === 'defeated') defeat(s);
      else enemySfx.hurt(st.kind);
    }
    if (hits > 0) {
      enemySfx.peckHit(step);
      d.hitstop(finisher ? PECK.finisherHitstop : PECK.hitstop);
      d.punch(finisher ? -3 : -1.5);
      d.shake(finisher ? 0.12 : 0.06, 0.1);
      chain += hits;
      chainAge = 0;
      d.hud.combo(chain);
    } else if (anyImmune) {
      enemySfx.peckHit(1);
      d.shake(0.05, 0.08);
      if (!immuneHinted) {
        immuneHinted = true;
        d.toast(COMBAT_T.immune, COMBAT_T.immuneSub);
      }
    }
  }
  let immuneHinted = false;

  /** Turn the chicken towards the nearest attackable spook in reach (soft aim assist). */
  function aim(): void {
    const cx = d.chicken.pos.x;
    const cz = d.chicken.pos.z;
    let best: Spook | null = null;
    let bestD = PECK.range + 0.8;
    for (const s of d.spooks.list) {
      if (!attackable(s)) continue;
      const dist = Math.hypot(s.state.x - cx, s.state.z - cz);
      if (dist < bestD) {
        bestD = dist;
        best = s;
      }
    }
    if (best) d.chicken.face(Math.atan2(best.state.x - cx, best.state.z - cz));
  }

  return {
    press() {
      pressPeck(combo);
    },
    update(dt, time) {
      nowTime = time;
      const impact = stepCombo(combo, dt);
      // Every new swing (direct or buffered) animates once.
      if (combo.starts !== seenStarts) {
        seenStarts = combo.starts;
        aim();
        d.chicken.peck(combo.step);
        // Step into the strike (push decays with e^-9t: v = lunge * 9).
        const f = d.chicken.facing;
        d.chicken.push(Math.sin(f) * PECK.lunge * 9, Math.cos(f) * PECK.lunge * 9);
        enemySfx.peckWhoosh();
      }
      if (impact > 0) resolveImpact(impact);
      chainAge += dt;
      if (chain > 0 && chainAge > 1.6) {
        chain = 0;
        d.hud.combo(0);
      }
      for (const s of d.spooks.list) {
        const st = s.state;
        if (st.gone) continue;
        stepHealth(st, dt, st, d.canMove);
      }
      stepParticles(dt);
      stepWaves(dt);
      stepDrops(dt, time);
      stepBars(dt);
    },
    damage,
    burst,
    get kills() {
      return kills;
    },
  };
}
