import * as THREE from 'three';
import type { HouseMap } from '@/core/types';

interface Ghost {
  mesh: THREE.Group;
  x0: number;
  x1: number;
  z: number;
  speed: number;
  phase: number;
}

const FLOOR_H = 1.2;

export function createAmbientGhosts(
  scene: THREE.Scene,
  map: HouseMap,
): { update(dt: number): void } {
  const bodyGeo = new THREE.SphereGeometry(0.35, 12, 10);
  bodyGeo.scale(1, 1.5, 1);
  const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const make = (): THREE.Group => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bodyGeo, bodyMat));
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.position.set(-0.12, 0.3, 0.3);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat);
    e2.position.set(0.12, 0.3, 0.3);
    g.add(e1, e2);
    scene.add(g);
    return g;
  };

  const wz = map.rooms.find((r) => r.id === 'wohnzimmer')?.bounds;
  const attic = map.rooms.find((r) => r.id === 'dachboden')?.bounds;
  const ghosts: Ghost[] = [];
  const x0 = wz ? wz.x : 8;
  const x1 = wz ? wz.x + wz.w : 40;
  for (let i = 0; i < 3; i++) {
    ghosts.push({
      mesh: make(),
      x0,
      x1,
      z: -1.2 - i * 0.8,
      speed: 0.35 + i * 0.12,
      phase: i * 2.1,
    });
  }
  const inner = attic ?? wz;
  if (inner) {
    ghosts.push({
      mesh: make(),
      x0: inner.x + 1,
      x1: inner.x + inner.w - 1,
      z: inner.y + 1.2,
      speed: 0.3,
      phase: 1,
    });
  }

  let t = 0;
  return {
    update(dt: number): void {
      t += dt;
      for (const g of ghosts) {
        const w = t * g.speed * 0.2 + g.phase;
        const u = (Math.sin(w) + 1) / 2;
        g.mesh.position.set(
          g.x0 + u * (g.x1 - g.x0),
          FLOOR_H + 0.15 * Math.sin(t * 1.6 + g.phase),
          g.z + 0.4 * Math.sin(t * 0.5 + g.phase),
        );
        g.mesh.rotation.y = (Math.cos(w) >= 0 ? 0.4 : -0.4) + 0.3 * Math.sin(t * 0.4 + g.phase);
      }
    },
  };
}
