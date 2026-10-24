import * as THREE from 'three';
import type { RevealSystem, Revealable } from '@/render/reveal';
import type { InteractableDef, WallSide } from '@/world/house-map';

/** Max distance (m) from the chicken to the object anchor for "E" to work. */
export const INTERACT_RADIUS = 1.5;

export interface Interactable {
  readonly def: InteractableDef;
  /** World anchor (cell centre) used for distance checks. */
  readonly x: number;
  readonly z: number;
  readonly object: THREE.Group;
  readonly revealable: Revealable;
  /** Interaction allowed (false once used up). */
  enabled: boolean;
  /** Open state: lid, drawer, fuse lever, secret compartment, front door. */
  setOpen(open: boolean): void;
  /** Short glow pulse (echo answer, cuckoo chime, lock light). */
  pulse(): void;
  /** Front door: number of lit lock lamps (0..3). */
  setLocks(n: number): void;
  /** Front door: show the silhouette behind the glass for `seconds`. */
  showShadow(seconds: number): void;
  update(dt: number, time: number): void;
}

const mat = (color: number, emissive = 0x000000, intensity = 0): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.9,
    flatShading: true,
  });

const TOY_COLORS = [0x8a3b3b, 0x3b5f8a, 0x8a7a3b, 0x3b8a5a, 0x6e3b8a, 0x8a5a3b];

const WALL_ROT: Record<WallSide, number> = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
const WALL_OFFSET: Record<WallSide, [number, number]> = {
  n: [0, -0.42],
  s: [0, 0.42],
  e: [0.42, 0],
  w: [-0.42, 0],
};

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Child drawing / calendar page, drawn once into a canvas texture. */
/** Polaroid of the chicken on the Spendenkarton, with the shelter label. */
function photoTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#e8e2d2';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#28303c';
    g.fillRect(12, 10, 104, 84);
    // The chicken: body, head, beak, comb.
    g.fillStyle = '#f2c230';
    g.beginPath();
    g.ellipse(60, 66, 26, 18, 0, 0, Math.PI * 2);
    g.arc(80, 42, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e07020';
    g.beginPath();
    g.moveTo(92, 42);
    g.lineTo(102, 46);
    g.lineTo(92, 50);
    g.fill();
    g.fillStyle = '#c0282d';
    g.fillRect(74, 26, 10, 6);
    g.fillStyle = '#111';
    g.fillRect(82, 38, 3, 3);
    g.fillStyle = '#7a2a2a';
    g.font = 'bold 15px sans-serif';
    g.fillText('SPENDE', 34, 112);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function paperTexture(kind: 'drawing' | 'calendar'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#d9d2bf';
    g.fillRect(0, 0, 128, 96);
    g.lineWidth = 3;
    g.lineCap = 'round';
    if (kind === 'drawing') {
      // A dog under a storm cloud with a lightning bolt.
      g.strokeStyle = '#6b4a2a';
      g.beginPath();
      g.ellipse(58, 70, 22, 11, 0, 0, Math.PI * 2);
      g.moveTo(80, 64);
      g.arc(86, 58, 8, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#34405a';
      g.beginPath();
      g.ellipse(46, 18, 24, 10, 0, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#c9a400';
      g.beginPath();
      g.moveTo(50, 28);
      g.lineTo(42, 42);
      g.lineTo(52, 42);
      g.lineTo(44, 56);
      g.stroke();
      g.fillStyle = '#7a2a2a';
      g.font = 'bold 13px sans-serif';
      g.fillText('BELLO', 74, 92);
    } else {
      g.fillStyle = '#7a2a2a';
      g.fillRect(0, 0, 128, 20);
      g.fillStyle = '#f0e8d8';
      g.font = 'bold 13px sans-serif';
      g.fillText('OKTOBER 2025', 16, 15);
      g.fillStyle = '#333';
      g.font = '9px sans-serif';
      for (let d = 1; d <= 31; d++) {
        const col = (d + 2) % 7;
        const row = Math.floor((d + 2) / 7);
        g.fillText(String(d), 6 + col * 17, 32 + row * 13);
      }
      g.strokeStyle = '#c0282d';
      g.beginPath();
      g.ellipse(
        6 + ((23 + 2) % 7) * 17 + 5,
        32 + Math.floor(25 / 7) * 13 - 3,
        9,
        7,
        0,
        0,
        Math.PI * 2,
      );
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Parts {
  /** Moves with setOpen (lid, drawer, lever, compartment, door leaf). */
  moving?: THREE.Object3D;
  openPose?: (o: THREE.Object3D, open: boolean) => void;
  glowMat?: THREE.MeshStandardMaterial;
  lockMats?: THREE.MeshStandardMaterial[];
  bird?: THREE.Object3D;
  pendulum?: THREE.Object3D;
  glass?: THREE.MeshBasicMaterial;
  shadow?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Slides to `openY` over ~1 s when opened (hollow wall sinks into the floor). */
  sink?: { object: THREE.Object3D; openY: number };
}

function buildKind(def: InteractableDef, group: THREE.Group): Parts {
  switch (def.kind) {
    case 'toybox': {
      const color = TOY_COLORS[(def.index ?? 0) % TOY_COLORS.length] ?? 0x8a3b3b;
      const body = mat(color, color, 0.05);
      group.add(box(0.74, 0.46, 0.54, body, 0, 0.23, 0));
      group.add(box(0.78, 0.06, 0.06, mat(0x2a2016), 0, 0.3, 0.28));
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.46, -0.27);
      const glowMat = mat(color, 0xffd27a, 0);
      hinge.add(box(0.78, 0.07, 0.56, glowMat, 0, 0.035, 0.27));
      group.add(hinge);
      return {
        moving: hinge,
        glowMat,
        openPose: (o, open) => (o.rotation.x = open ? -1.9 : 0),
      };
    }
    case 'drawing':
    case 'calendar': {
      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(
          def.kind === 'drawing' ? 0.9 : 0.6,
          def.kind === 'drawing' ? 0.66 : 0.46,
        ),
        new THREE.MeshStandardMaterial({
          map: paperTexture(def.kind),
          emissive: 0xffffff,
          emissiveMap: paperTexture(def.kind),
          emissiveIntensity: 0.12,
          roughness: 1,
        }),
      );
      paper.position.set(0, 0.95, 0.03);
      group.add(paper);
      group.add(box(def.kind === 'drawing' ? 0.96 : 0.66, 0.04, 0.04, mat(0x5a4632), 0, 1.3, 0.03));
      return {};
    }
    case 'fuse': {
      group.add(box(0.5, 0.6, 0.16, mat(0x50565e), 0, 0.85, 0.08));
      const lever = new THREE.Group();
      lever.position.set(0, 0.85, 0.18);
      lever.add(box(0.06, 0.24, 0.06, mat(0xb8202a, 0x601010, 0.3), 0, 0.1, 0));
      group.add(lever);
      const glowMat = mat(0x203020, 0x30ff60, 0);
      group.add(box(0.06, 0.06, 0.04, glowMat, 0.17, 1.06, 0.17));
      return {
        moving: lever,
        glowMat,
        openPose: (o, open) => (o.rotation.x = open ? -2.6 : 0),
      };
    }
    case 'drawer': {
      group.add(box(0.9, 0.8, 0.55, mat(0x4a3a2c), 0, 0.4, 0));
      const front = new THREE.Group();
      front.add(box(0.8, 0.22, 0.5, mat(0x5e4a36), 0, 0.58, 0.05));
      front.add(box(0.2, 0.04, 0.04, mat(0xb0a080), 0, 0.58, 0.31));
      group.add(front);
      const glowMat = mat(0xffe7a0, 0xffd060, 0);
      const torch = box(0.3, 0.08, 0.08, glowMat, 0, 0.66, 0.05);
      front.add(torch);
      return { moving: front, glowMat, openPose: (o, open) => (o.position.z = open ? 0.35 : 0) };
    }
    case 'clock': {
      const wood = mat(0x4b2e1c);
      const housing = new THREE.Group();
      housing.position.y = 1.0;
      housing.add(box(0.5, 0.55, 0.2, wood, 0, 0, 0.1));
      const roofL = box(0.36, 0.05, 0.26, mat(0x2e1c10), -0.13, 0.36, 0.1);
      roofL.rotation.z = 0.6;
      const roofR = box(0.36, 0.05, 0.26, mat(0x2e1c10), 0.13, 0.36, 0.1);
      roofR.rotation.z = -0.6;
      housing.add(roofL, roofR);
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 16),
        mat(0xd8cfb4, 0xd8cfb4, 0.15),
      );
      face.position.set(0, -0.04, 0.205);
      housing.add(face);
      const bird = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 5),
        mat(0xd8b020, 0xffb800, 0.5),
      );
      bird.position.set(0, 0.18, 0.12);
      housing.add(bird);
      const pendulum = new THREE.Group();
      pendulum.position.set(0, -0.28, 0.15);
      pendulum.add(box(0.02, 0.3, 0.02, mat(0xb08a30), 0, -0.15, 0));
      pendulum.add(box(0.1, 0.1, 0.03, mat(0xb08a30, 0x604010, 0.2), 0, -0.3, 0));
      housing.add(pendulum);
      group.add(housing);
      const glowMat = mat(0x2a2a2a, 0xffd27a, 0);
      const comp = new THREE.Group();
      comp.add(box(0.4, 0.12, 0.2, glowMat, 0, 0.55, 0.1));
      group.add(comp);
      return {
        moving: comp,
        glowMat,
        bird,
        pendulum,
        openPose: (o, open) => (o.position.z = open ? 0.25 : 0),
      };
    }
    case 'window': {
      group.add(box(1.4, 0.06, 0.3, mat(0x3a3f4a), 0, 0.42, 0.1));
      return {};
    }
    case 'frontdoor': {
      // Door leaf on the south outer wall (z = cell + 1). Frosted glass + three lock lamps.
      const leaf = new THREE.Group();
      leaf.position.set(-0.5, 0, 0.45);
      const wood = mat(0x3a281a);
      leaf.add(box(1.0, 1.35, 0.08, wood, 0.5, 0.675, 0));
      const glassMat = new THREE.MeshBasicMaterial({ color: 0x1d3048, toneMapped: false });
      const glass = box(0.5, 0.45, 0.1, glassMat, 0.5, 0.95, 0);
      glass.userData.noReveal = true;
      leaf.add(glass);
      group.add(leaf);
      const frame = mat(0x241810);
      group.add(box(0.1, 1.45, 0.14, frame, -0.55, 0.725, 0.45));
      group.add(box(0.1, 1.45, 0.14, frame, 0.55, 0.725, 0.45));
      group.add(box(1.2, 0.1, 0.14, frame, 0, 1.45, 0.45));
      const lockMats: THREE.MeshStandardMaterial[] = [];
      for (let i = 0; i < 3; i++) {
        const m = mat(0x401010, 0xff3030, 0.8);
        lockMats.push(m);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m);
        lamp.position.set(-0.3 + i * 0.3, 1.58, 0.45);
        lamp.userData.noReveal = true;
        group.add(lamp);
      }
      // Shadow behind the frosted glass (doorbell scare), hidden until shown.
      const shadow = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.7, 3, 8),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }),
      );
      shadow.position.set(0, 0.9, 0.85);
      shadow.userData.noReveal = true;
      shadow.visible = false;
      group.add(shadow);
      return {
        moving: leaf,
        lockMats,
        glass: glassMat,
        shadow,
        openPose: (o, open) => (o.rotation.y = open ? 1.4 : 0),
      };
    }
    case 'hollow': {
      // Low wall panel (cutaway height) with vertical boards; sinks into the floor when opened.
      const panel = new THREE.Group();
      const glowMat = mat(0x34302e, 0xffb070, 0);
      // Three cells wide (P7: every passage is 3 m).
      panel.add(box(2.98, 0.36, 0.96, glowMat, 0, 0.18, 0));
      const boards = mat(0x241e1a);
      for (let i = 0; i < 9; i++)
        panel.add(box(0.03, 0.3, 0.98, boards, -1.33 + i * 0.33, 0.18, 0));
      group.add(panel);
      return { glowMat, sink: { object: panel, openY: -0.42 } };
    }
    case 'donation': {
      const cardboard = mat(0x6a5236, 0x6a5236, 0.08);
      group.add(box(0.72, 0.5, 0.56, cardboard, 0, 0.25, 0));
      const flaps = new THREE.Group();
      flaps.position.set(0, 0.5, 0);
      const glowMat = mat(0x6a5236, 0xffd27a, 0);
      flaps.add(box(0.74, 0.03, 0.58, glowMat, 0, 0.015, 0));
      group.add(flaps);
      const photoMat = new THREE.MeshStandardMaterial({
        map: photoTexture(),
        emissive: 0xffffff,
        emissiveMap: photoTexture(),
        emissiveIntensity: 0.18,
        roughness: 1,
      });
      // Photo on top and on the camera-facing side.
      const top = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), photoMat);
      top.rotation.x = -Math.PI / 2;
      top.position.set(0.1, 0.035, 0.05);
      top.rotation.z = 0.2;
      flaps.add(top);
      const side = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), photoMat);
      side.position.set(-0.12, 0.26, 0.285);
      group.add(side);
      return {
        moving: flaps,
        glowMat,
        openPose: (o, open) => (o.position.y = open ? 0.62 : 0.5),
      };
    }
    case 'ladder':
    case 'hatch': {
      // Wooden ladder against the wall (Flur) / poking out of the floor hatch (Dachboden).
      const wood = mat(0x5a4028);
      const glowMat = mat(0x5a4028, 0xffd27a, 0);
      const lean = def.kind === 'ladder' ? -0.18 : 0;
      const ladder = new THREE.Group();
      ladder.rotation.x = lean;
      for (const x of [-0.24, 0.24]) ladder.add(box(0.06, 1.7, 0.06, wood, x, 0.85, 0));
      for (let i = 0; i < 5; i++) ladder.add(box(0.48, 0.05, 0.05, glowMat, 0, 0.25 + i * 0.32, 0));
      group.add(ladder);
      if (def.kind === 'hatch') {
        ladder.position.y = -0.9;
        group.add(box(0.9, 0.04, 0.9, mat(0x0c0a08), 0, 0.02, 0));
      }
      return { glowMat };
    }
    case 'collar': {
      // Bellos red collar with a golden tag, lying on a little rug.
      const glowMat = mat(0xa02028, 0xff5040, 0.25);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 16), glowMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06;
      const tag = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10),
        mat(0xd8a830, 0xa07010, 0.5),
      );
      tag.position.set(0, 0.06, 0.24);
      const rug = box(0.8, 0.02, 0.6, mat(0x3a2a40), 0, 0.01, 0);
      const holder = new THREE.Group();
      holder.add(ring, tag);
      group.add(rug, holder);
      return { glowMat, moving: holder, openPose: (o, open) => (o.visible = !open) };
    }
    case 'dogbed': {
      const cloth = mat(0x4a3424);
      const glowMat = mat(0x6a4a30, 0xffd27a, 0);
      const bed = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.12, 6, 14), cloth);
      bed.rotation.x = Math.PI / 2;
      bed.position.y = 0.12;
      group.add(bed, box(0.6, 0.06, 0.6, glowMat, 0, 0.05, 0));
      // Scratch marks on the beam behind it.
      for (let i = 0; i < 3; i++) {
        const scratch = box(0.02, 0.32, 0.02, mat(0x8a7a60), -0.1 + i * 0.08, 0.7, -0.46);
        scratch.rotation.z = 0.3;
        group.add(scratch);
      }
      return { glowMat };
    }
    case 'chest': {
      const wood = mat(0x4a3220);
      const trim = mat(0x8a6a30, 0x5a3a10, 0.3);
      group.add(box(0.8, 0.4, 0.5, wood, 0, 0.2, 0));
      group.add(box(0.84, 0.06, 0.06, trim, 0, 0.32, 0.25));
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.4, -0.25);
      const glowMat = mat(0x4a3220, 0xffd27a, 0);
      hinge.add(box(0.84, 0.1, 0.52, glowMat, 0, 0.05, 0.25));
      group.add(hinge);
      return {
        moving: hinge,
        glowMat,
        openPose: (o, open) => (o.rotation.x = open ? -1.9 : 0),
      };
    }
  }
}

export function createInteractable(def: InteractableDef, reveal: RevealSystem): Interactable {
  const group = new THREE.Group();
  const parts = buildKind(def, group);
  const x = def.cell.x + 0.5;
  const z = def.cell.y + 0.5;
  group.position.set(x, 0, z);
  if (def.wall && def.kind !== 'frontdoor') {
    const [ox, oz] = WALL_OFFSET[def.wall];
    group.position.x += ox;
    group.position.z += oz;
    group.rotation.y = WALL_ROT[def.wall];
  }
  const revealable = reveal.add(group, 'prop', def.id);

  let glow = 0;
  let birdT = 0;
  let shadowT = 0;
  let shadowDur = 1;
  let sinkTarget = 0;
  const self: Interactable = {
    def,
    x,
    z,
    object: group,
    revealable,
    enabled: true,
    setOpen(open) {
      if (parts.moving && parts.openPose) parts.openPose(parts.moving, open);
      if (parts.sink) sinkTarget = open ? parts.sink.openY : 0;
    },
    pulse() {
      glow = 1;
      birdT = 1;
    },
    setLocks(n) {
      parts.lockMats?.forEach((m, i) => {
        const on = i < n;
        m.color.setHex(on ? 0x104010 : 0x401010);
        m.emissive.setHex(on ? 0x40ff70 : 0xff3030);
      });
    },
    showShadow(seconds) {
      shadowT = seconds;
      shadowDur = seconds;
    },
    update(dt, time) {
      if (parts.shadow && parts.glass) {
        const active = shadowT > 0;
        if (active) shadowT = Math.max(0, shadowT - dt);
        const p = active ? shadowT / shadowDur : 0;
        // Fade in, hold, fade out; the glass glows like a porch light behind it.
        const a = active ? Math.min(1, Math.min(p, 1 - p) * 6) : 0;
        parts.shadow.visible = a > 0.01;
        parts.shadow.material.opacity = 0.9 * a;
        parts.shadow.position.x = Math.sin(time * 0.7) * 0.08;
        parts.glass.color.setRGB(0.11 + a * 0.5, 0.19 + a * 0.4, 0.28 + a * 0.2);
      }
      if (glow > 0) {
        glow = Math.max(0, glow - dt * 0.8);
        if (parts.glowMat) parts.glowMat.emissiveIntensity = glow * 2.2;
      }
      if (parts.sink) {
        const o = parts.sink.object;
        o.position.y += (sinkTarget - o.position.y) * (1 - Math.exp(-3 * dt));
        o.visible = o.position.y > parts.sink.openY + 0.02;
      }
      if (parts.pendulum) parts.pendulum.rotation.z = Math.sin(time * 3) * 0.3;
      if (parts.bird) {
        birdT = Math.max(0, birdT - dt * 1.2);
        parts.bird.position.z = 0.12 + Math.sin(Math.min(1, birdT) * Math.PI) * 0.22;
      }
    },
  };
  return self;
}
