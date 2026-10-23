import * as THREE from 'three';

const flat = (color: number, emissive = 0x000000, intensity = 0): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    flatShading: true,
    roughness: 0.7,
  });

/** Cosmetic hats from primitives, sized for the chicken's hatAnchor (head top). */
export function createHat(id: string): THREE.Group | null {
  const g = new THREE.Group();
  switch (id) {
    case 'hexenhut': {
      const m = flat(0x2a1838, 0x200830, 0.3);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12), m);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 10), m);
      cone.position.y = 0.13;
      cone.rotation.z = -0.2;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.092, 0.092, 0.03, 10),
        flat(0xff9b3d, 0xff6a00, 0.4),
      );
      band.position.y = 0.03;
      g.add(brim, cone, band);
      break;
    }
    case 'kuerbis': {
      const pumpkin = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        flat(0xe2701a, 0xa03a00, 0.35),
      );
      pumpkin.scale.set(1.15, 0.85, 1.15);
      pumpkin.position.y = 0.06;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.06, 5), flat(0x3d5a1e));
      stem.position.y = 0.16;
      g.add(pumpkin, stem);
      break;
    }
    case 'krone': {
      // Darker, orange-brown gold with a dark rim and red gems: reads on the yellow chicken.
      const gold = flat(0xc8901c, 0x5a3200, 0.35);
      const rim = new THREE.MeshBasicMaterial({ color: 0x2a1404, side: THREE.BackSide });
      const gem = flat(0xe0142e, 0xa0001a, 0.8);
      const ringGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10, 1, true);
      const ring = new THREE.Mesh(ringGeo, gold);
      ring.position.y = 0.03;
      const outline = new THREE.Mesh(ringGeo, rim);
      outline.position.y = 0.03;
      outline.scale.set(1.14, 1.25, 1.14);
      g.add(ring, outline);
      const gemGeo = new THREE.SphereGeometry(0.018, 6, 4);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), gold);
        spike.position.set(Math.cos(a) * 0.09, 0.09, Math.sin(a) * 0.09);
        const tip = new THREE.Mesh(gemGeo, gem);
        tip.position.set(Math.cos(a) * 0.09, 0.13, Math.sin(a) * 0.09);
        const b = a + Math.PI / 5;
        const stone = new THREE.Mesh(gemGeo, gem);
        stone.position.set(Math.cos(b) * 0.102, 0.03, Math.sin(b) * 0.102);
        g.add(spike, tip, stone);
      }
      break;
    }
    default:
      return null;
  }
  g.traverse((o) => (o.userData.noReveal = true));
  return g;
}
