import { COMMON_DEFS, drips, eye, hairs, jagged, rng, stitches, teeth } from './svg-kit';
import type { ScareKind } from './jumpscare';

const WAVE = (x: number): number => Math.sin(x / 55) * 14;

function socke(): string {
  const mouthPath = 'M360 470 Q640 400 920 465 Q990 580 900 690 Q640 740 380 690 Q290 580 360 470Z';
  return `
<defs>
  <pattern id="knit" width="16" height="22" patternUnits="userSpaceOnUse">
    <path d="M0 0 L8 11 L16 0 M0 11 L8 22 L16 11" stroke="#4a4234" stroke-width="3" fill="none"/>
  </pattern>
  <linearGradient id="sockg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6e6657"/><stop offset=".5" stop-color="#a39a86"/><stop offset="1" stop-color="#5c5547"/>
  </linearGradient>
</defs>
<path d="M300 -40 Q250 300 300 520 Q320 780 640 780 Q960 780 985 520 Q1035 300 980 -40Z" fill="url(#sockg)"/>
<path d="M300 -40 Q250 300 300 520 Q320 780 640 780 Q960 780 985 520 Q1035 300 980 -40Z" fill="url(#knit)" opacity=".7"/>
<rect x="250" y="40" width="800" height="46" fill="#7a0e12" opacity=".8" transform="rotate(-2 640 60)"/>
<rect x="250" y="110" width="800" height="22" fill="#2a2420" opacity=".85" transform="rotate(-2 640 120)"/>
<path d="M650 140 Q620 300 660 440" stroke="#2a0c0c" stroke-width="6" fill="none"/>
${stitches(650, 150, 660, 430, 12, 20, 4)}
<g filter="url(#js-rough)">
  <path d="${jagged(445, 270, 150, 120, 22, 0.22, 5)}" fill="#0a0102"/>
  <path d="${jagged(835, 310, 110, 90, 20, 0.25, 8)}" fill="#0a0102"/>
</g>
${eye(445, 272, 125, 98, 21, { iris: '#7d5a0c', tilt: -8 })}
${eye(838, 312, 86, 70, 33, { iris: '#6a6a14', tilt: 12 })}
<path d="${mouthPath}" fill="url(#js-void)" stroke="#1a0604" stroke-width="12"/>
<clipPath id="mclip"><path d="${mouthPath}"/></clipPath>
<g clip-path="url(#mclip)">
  <path d="M520 600 Q640 700 760 600 Q640 560 520 600Z" fill="#4a0508"/>
  ${teeth(330, 960, 440, 1, 17, 70, 190, 61, WAVE)}
  ${teeth(330, 960, 735, -1, 15, 60, 170, 62, WAVE)}
</g>
<g opacity=".95">${stitches(345, 470, 925, 480, 26, 70, 91)}
<path d="M345 468 Q640 395 925 478" stroke="#120a08" stroke-width="7" fill="none"/></g>
${drips([420, 520, 700, 820, 880], 690, 44)}
`;
}

function teddy(): string {
  const rr = rng(77);
  return `
<defs>
  <radialGradient id="fur" cx="50%" cy="42%" r="62%">
    <stop offset="0" stop-color="#9a6a3c"/><stop offset=".7" stop-color="#5c3a1e"/><stop offset="1" stop-color="#241208"/>
  </radialGradient>
</defs>
<circle cx="360" cy="150" r="170" fill="#3d2410"/><circle cx="360" cy="150" r="95" fill="#1a0c06"/>
<circle cx="930" cy="140" r="150" fill="#3d2410"/><path d="M850 80 L1000 60 L1010 190 L900 230Z" fill="#6a0c10"/>
<ellipse cx="640" cy="390" rx="470" ry="420" fill="url(#fur)"/>
${hairs(190, 20, 900, 700, 900, 26, 3, '#2a1608')}
${hairs(190, 20, 900, 700, 400, 22, 4, '#b98a55')}
<path d="M630 -20 Q650 90 610 200" stroke="#120804" stroke-width="10" fill="none"/>
${stitches(630, 0, 612, 195, 9, 18, 6, '#0a0503')}
<ellipse cx="640" cy="520" rx="220" ry="150" fill="#b08a60"/>
${hairs(420, 380, 440, 280, 300, 18, 8, '#6a4624')}
<g filter="url(#js-rough)">
  <path d="${jagged(850, 285, 150, 135, 18, 0.2, 14)}" fill="#0a0102"/>
  <path d="M700 190 L760 270 L720 320 L780 360" stroke="#c9b48a" stroke-width="7" fill="none"/>
  <path d="M960 200 L920 250 L980 300" stroke="#c9b48a" stroke-width="7" fill="none"/>
</g>
${eye(855, 292, 108, 98, 19, { iris: '#a02010', tilt: 10 })}
<ellipse cx="410" cy="290" rx="116" ry="112" fill="#0a0604"/>
<ellipse cx="410" cy="290" rx="92" ry="90" fill="#16100c" stroke="#3a3430" stroke-width="6"/>
<circle cx="385" cy="262" r="9" fill="#050302"/><circle cx="432" cy="262" r="9" fill="#050302"/>
<circle cx="385" cy="318" r="9" fill="#050302"/><circle cx="432" cy="318" r="9" fill="#050302"/>
<path d="M385 262 L432 318 M432 262 L385 318" stroke="#2c2622" stroke-width="5"/>
<path d="M300 200 Q250 120 200 40" stroke="#cfc9b8" stroke-width="7" fill="none"/>
<path d="M330 400 Q300 460 340 520" stroke="#cfc9b8" stroke-width="7" fill="none" stroke-dasharray="14 6"/>
<path d="M560 400 Q640 385 720 400 Q700 460 640 470 Q580 460 560 400Z" fill="#0c0606" stroke="#000" stroke-width="6"/><path d="M640 400 L630 440 L650 460" stroke="#4a3a34" stroke-width="4" fill="none"/>
<g transform="translate(0 -45)"><path d="M360 570 Q500 700 640 705 Q800 700 920 560" stroke="#0e0604" stroke-width="12" fill="none"/>
<path d="M360 570 Q500 640 640 650 Q800 645 920 560 Q800 720 640 725 Q480 720 360 570Z" fill="url(#js-void)"/>
${teeth(390, 900, 602, 1, 14, 40, 90, 17, (x) => Math.sin(x / 80) * 6 + Math.abs(x - 640) * 0.05)}
${stitches(360, 570, 920, 560, 30, 52, 23, '#0e0604')}
</g>
${[
  [440, 40],
  [560, 120],
  [820, 90],
  [980, 440],
  [250, 560],
  [760, 380],
]
  .map(([x, y]) =>
    Array.from({ length: 14 }, () => {
      const sx = (x ?? 0) + (rr() - 0.5) * 30;
      const sy = (y ?? 0) + (rr() - 0.5) * 20;
      const l = 40 + rr() * 90;
      const a = rr() * Math.PI * 2;
      return `<path d="M${sx} ${sy} q${Math.cos(a) * l * 0.5 + 20} ${Math.sin(a) * l * 0.5 - 20} ${Math.cos(a) * l} ${Math.sin(a) * l}" stroke="${rr() < 0.7 ? '#c8c2ae' : '#7a746a'}" stroke-width="${2 + rr() * 3}" fill="none" stroke-linecap="round"/>`;
    }).join(''),
  )
  .join('')}
`;
}

function kuerbis(): string {
  const eyeL = 'M270 260 L505 170 L480 275 L415 318 L320 322Z';
  const eyeR = 'M790 175 L1015 290 L935 345 L850 315 L805 290Z';
  const mouth =
    'M230 470 L300 420 L360 500 L430 410 L500 520 L560 430 L640 540 L720 430 L790 520 L860 420 L930 500 L1010 430 L1050 470 Q1020 640 760 700 Q640 720 520 700 Q260 640 230 470Z';
  const r = rng(404);
  const maggots = Array.from({ length: 9 }, () => {
    const x = 120 + r() * 1040;
    const y = 60 + r() * 360;
    const a = r() * 180;
    return `<g transform="rotate(${a} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="14" ry="5" fill="#cfc9a0" stroke="#1a1408" stroke-width="2"/><path d="M${x - 5} ${y - 4} v8 M${x} ${y - 5} v10 M${x + 5} ${y - 4} v8" stroke="#7a7448" stroke-width="1.5"/></g>`;
  }).join('');
  const seeds = Array.from({ length: 16 }, () => {
    const x = 300 + r() * 700;
    const y = 640 + r() * 70;
    return `<ellipse cx="${x}" cy="${y}" rx="8" ry="4" fill="#d8cf9a" stroke="#2a2010" stroke-width="2" transform="rotate(${r() * 180} ${x} ${y})"/>`;
  }).join('');
  const mold = Array.from({ length: 11 }, () => {
    const x = 80 + r() * 1120;
    const y = 30 + r() * 420;
    return `<path d="${jagged(x, y, 30 + r() * 60, 20 + r() * 35, 18, 0.14, Math.floor(r() * 9999))}" fill="${r() < 0.5 ? '#4a5a14' : '#5c4a18'}" opacity=".6"/>`;
  }).join('');
  const rim = (d: string): string =>
    `<path d="${d}" fill="none" stroke="#7a3a10" stroke-width="4" opacity=".7"/><path d="${d}" fill="none" stroke="#000" stroke-width="10" opacity=".8" transform="translate(3 4)"/>`;
  return `
<defs>
  <radialGradient id="pump" cx="50%" cy="40%" r="62%">
    <stop offset="0" stop-color="#3a1c0a"/><stop offset=".6" stop-color="#1a0a04"/><stop offset="1" stop-color="#030100"/>
  </radialGradient>
  <radialGradient id="ember" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff0a0"/><stop offset=".2" stop-color="#ff8a10"/><stop offset=".6" stop-color="#b01c04" stop-opacity=".6"/><stop offset="1" stop-color="#b01c04" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="deep" cx="50%" cy="55%" r="50%">
    <stop offset="0" stop-color="#ff6a10"/><stop offset=".35" stop-color="#a01804"/><stop offset=".8" stop-color="#1a0200" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="kdark" cx="50%" cy="50%" r="58%"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".92"/></radialGradient>
  <linearGradient id="pflesh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a5a1c"/><stop offset=".6" stop-color="#5a3010"/><stop offset="1" stop-color="#1a0a04"/></linearGradient>
</defs>
<ellipse cx="640" cy="400" rx="660" ry="420" fill="url(#pump)"/>
<path d="M560 80 Q540 -10 600 -40 L700 -40 Q740 20 720 90 Q690 130 640 120 Q590 125 560 80Z" fill="#2a2a0c" stroke="#000" stroke-width="6"/>
<path d="M590 70 Q600 20 640 -10 M670 90 Q690 30 700 -20" stroke="#5a5a1c" stroke-width="4" fill="none" opacity=".7"/>
<path d="M120 400 Q250 60 600 110 M1160 400 Q1030 60 680 110 M280 420 Q330 140 610 120 M1000 420 Q950 140 670 120 M450 440 Q470 200 625 125 M830 440 Q810 200 655 125" stroke="#000" stroke-width="14" fill="none"/>
<path d="M120 400 Q250 60 600 110 M1160 400 Q1030 60 680 110 M280 420 Q330 140 610 120 M1000 420 Q950 140 670 120" stroke="#6a3010" stroke-width="3" fill="none" opacity=".6" transform="translate(6 3)"/>
<g>${mold}</g>
<path d="M170 140 L260 270 L225 390 L305 480 L280 560 M1100 150 L1010 300 L1055 430 L990 530 M640 150 L615 230 L665 310 L625 390 L650 440 M500 70 L470 170 L505 240 M790 60 L835 160 L800 250" stroke="#000" stroke-width="8" fill="none"/>
<path d="M170 140 L260 270 L225 390 L305 480 M1100 150 L1010 300 L1055 430" stroke="#a0481a" stroke-width="2" fill="none" opacity=".5" transform="translate(5 0)"/>
<g filter="url(#js-rough)">
  <path d="${mouth}" fill="#000"/>
  <path d="${eyeL}" fill="#000"/>
  <path d="${eyeR}" fill="#000"/>
</g>
<clipPath id="kc1"><path d="${mouth}"/></clipPath>
<clipPath id="kc2"><path d="${eyeL}"/></clipPath>
<clipPath id="kc3"><path d="${eyeR}"/></clipPath>
<g clip-path="url(#kc1)"><ellipse cx="640" cy="610" rx="260" ry="110" fill="url(#deep)"/></g>
<g clip-path="url(#kc2)">${eye(395, 285, 46, 36, 51, { iris: '#6a5010', tilt: -14 })}<rect x="250" y="160" width="270" height="90" fill="#000" opacity=".5"/></g>
<g clip-path="url(#kc3)"><circle cx="915" cy="310" r="60" fill="url(#ember)"/><circle cx="915" cy="312" r="7" fill="#fff6c0"/></g>
${rim(eyeL)}${rim(eyeR)}${rim(mouth)}
<g clip-path="url(#kc1)">
  ${teeth(225, 1055, 410, 1, 9, 70, 190, 55, (x) => Math.abs(x - 640) * 0.08, 'url(#pflesh)')}
  ${teeth(245, 1045, 712, -1, 8, 60, 150, 58, (x) => -Math.abs(x - 640) * 0.18, 'url(#pflesh)')}
</g>
<g stroke="#8a5a1a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85">
  <path d="M470 700 q-8 50 4 110 M600 715 q4 60 -2 120 M760 712 q14 40 6 100 M880 690 q4 50 -4 90"/>
</g>
${seeds}${maggots}
<rect width="1280" height="720" fill="url(#kdark)"/>
`;
}

function rudi(): string {
  const bristle = Array.from({ length: 90 }, (_, i) => {
    const x = 230 + i * 9.5;
    const sag = Math.sin((i / 90) * Math.PI) * 40;
    const l = 40 + ((i * 37) % 70);
    return `M${x} ${540 + sag} l${(i % 3) - 1} ${l}`;
  }).join(' ');
  return `
<defs>
  <radialGradient id="rbody" cx="50%" cy="38%" r="70%">
    <stop offset="0" stop-color="#2c2e32"/><stop offset=".6" stop-color="#101113"/><stop offset="1" stop-color="#020203"/>
  </radialGradient>
  <radialGradient id="rlight" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#fffbe0"/><stop offset=".6" stop-color="#ffe9a0" stop-opacity=".18"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="reye" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff8070"/><stop offset=".25" stop-color="#ff1010"/><stop offset=".7" stop-color="#6a0000"/><stop offset="1" stop-color="#150000"/>
  </radialGradient>
</defs>
<ellipse cx="640" cy="390" rx="600" ry="330" fill="url(#rbody)"/>
<ellipse cx="640" cy="390" rx="600" ry="330" fill="none" stroke="#000" stroke-width="22"/>
<path d="M120 330 Q640 130 1160 330" stroke="#0a0b0c" stroke-width="12" fill="none"/>
<g filter="url(#js-rough)" opacity=".85"><path d="M180 260 L380 250 M900 270 L1100 250 M300 600 L420 650" stroke="#6a4a22" stroke-width="16" opacity=".6"/>
<path d="M200 400 Q260 380 330 410 M980 470 Q1050 440 1100 480" stroke="#3a2a14" stroke-width="22" opacity=".5"/></g>
<rect x="200" y="505" width="880" height="70" rx="28" fill="#030303" stroke="#26282b" stroke-width="6"/>
<path d="${bristle}" stroke="#d6cfa6" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="${bristle}" stroke="#3a3228" stroke-width="2" fill="none" transform="translate(4 8)" opacity=".7"/>
<circle cx="640" cy="320" r="150" fill="#050505" stroke="#3a3d41" stroke-width="12"/>
<circle cx="640" cy="320" r="190" fill="#ff1000" opacity=".28" filter="url(#js-blur20)"/><circle cx="640" cy="320" r="118" fill="url(#reye)"/><circle cx="640" cy="320" r="140" fill="none" stroke="#ff2a10" stroke-width="3" stroke-dasharray="6 10" opacity=".8"/>
<circle cx="640" cy="320" r="118" fill="none" stroke="#000" stroke-width="10"/>
<path d="M530 320 Q640 245 750 320" stroke="#000" stroke-width="5" fill="none" opacity=".5"/>
<ellipse cx="640" cy="322" rx="12" ry="46" fill="#000"/>
<circle cx="220" cy="190" r="70" fill="#000"/><circle cx="220" cy="190" r="48" fill="#5a0606"/>
<circle cx="1070" cy="205" r="52" fill="#000"/><circle cx="1070" cy="205" r="34" fill="#5a0606"/>
<circle cx="640" cy="120" r="300" fill="url(#rlight)" opacity=".9"/>
<circle cx="640" cy="118" r="62" fill="#fff"/><circle cx="640" cy="118" r="62" fill="none" stroke="#2a2c30" stroke-width="10"/><path d="M640 118 L40 -40 M640 118 L1240 -40 M640 118 L300 330 M640 118 L980 330" stroke="#fff" stroke-width="14" opacity=".35" filter="url(#js-blur8)"/>
<ellipse cx="640" cy="125" rx="200" ry="80" fill="#fff" opacity=".6" filter="url(#js-blur20)"/>
`;
}

/** Subdivide a polyline so each finger gets extra (wrong) knuckles. */
function subdivide(pts: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i] ?? [0, 0];
    const [bx, by] = pts[i + 1] ?? [0, 0];
    out.push([ax, ay], [ax + (bx - ax) * 0.5 + (i % 2 ? 7 : -7), ay + (by - ay) * 0.5]);
  }
  out.push(pts[pts.length - 1] ?? [0, 0]);
  return out;
}

function finger(base: Array<[number, number]>, w0: number, seed: number): string {
  const r = rng(seed);
  const pts = subdivide(base);
  const n = pts.length;
  let out = '';
  const wAt = (i: number): number => w0 * (0.75 + (i / n) * 0.55);
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = pts[i] ?? [0, 0];
    const [bx, by] = pts[i + 1] ?? [0, 0];
    out += `<path d="M${ax} ${ay} L${bx} ${by}" stroke="#0c0604" stroke-width="${wAt(i) + 12}" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = pts[i] ?? [0, 0];
    const [bx, by] = pts[i + 1] ?? [0, 0];
    const w = wAt(i);
    out += `<path d="M${ax} ${ay} L${bx} ${by}" stroke="url(#skin)" stroke-width="${w}" stroke-linecap="round"/>`;
    // shadow side and tendon line
    out += `<path d="M${ax + w * 0.25} ${ay} L${bx + w * 0.25} ${by}" stroke="#1a0e08" stroke-width="${w * 0.3}" stroke-linecap="round" opacity=".55"/>`;
    if (i % 2 === 0) {
      out += `<ellipse cx="${bx}" cy="${by}" rx="${w * 0.62}" ry="${w * 0.4}" fill="#8a846c" stroke="#0c0604" stroke-width="5" transform="rotate(${(r() - 0.5) * 30} ${bx} ${by})"/>`;
      out += `<path d="M${bx - w * 0.4} ${by - 6} q${w * 0.4} 10 ${w * 0.8} 0 M${bx - w * 0.35} ${by + 6} q${w * 0.35} 9 ${w * 0.7} 0 M${bx - w * 0.3} ${by + 17} q${w * 0.3} 7 ${w * 0.6} 0" stroke="#1c1408" stroke-width="3" fill="none"/>`;
    } else {
      out += `<circle cx="${bx}" cy="${by}" r="${w * 0.3}" fill="#3a1a16" opacity=".7"/>`;
    }
  }
  // long dark claw-nail past the tip
  const [tx, ty] = pts[n - 1] ?? [0, 0];
  const [px, py] = pts[n - 2] ?? [0, 0];
  const dx = tx - px;
  const dy = ty - py;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const w = wAt(n - 1);
  const cx = tx + ux * 70;
  const cy = ty + uy * 70;
  const nx = -uy * w * 0.42;
  const ny = ux * w * 0.42;
  out += `<path d="M${tx + nx} ${ty + ny} Q${tx + nx + ux * 40} ${ty + ny + uy * 40} ${cx} ${cy} Q${tx - nx + ux * 40} ${ty - ny + uy * 40} ${tx - nx} ${ty - ny}Z" fill="#150c06" stroke="#000" stroke-width="4"/>`;
  out += `<path d="M${tx} ${ty} L${tx + ux * 30} ${ty + uy * 30}" stroke="#6a0a0a" stroke-width="${w * 0.5}" opacity=".85"/>`;
  // cracked, dirty nail: split lines, grime, chipped edge
  out += `<path d="M${tx + ux * 10} ${ty + uy * 10} L${cx - ux * 14 + nx * 0.3} ${cy - uy * 14 + ny * 0.3} M${tx + ux * 22 - nx * 0.4} ${ty + uy * 22 - ny * 0.4} l${ux * 20} ${uy * 20}" stroke="#7a6a48" stroke-width="3" fill="none"/>`;
  out += `<ellipse cx="${tx + ux * 18}" cy="${ty + uy * 18}" rx="${w * 0.32}" ry="${w * 0.2}" fill="#3a2a10" opacity=".8" transform="rotate(${(Math.atan2(uy, ux) * 180) / Math.PI} ${tx + ux * 18} ${ty + uy * 18})"/>`;
  out += `<path d="M${cx - ux * 6 + nx * 0.5} ${cy - uy * 6 + ny * 0.5} l${ux * 8 - nx * 0.4} ${uy * 8 - ny * 0.4}" stroke="#000" stroke-width="6"/>`;
  return out;
}

function hand(): string {
  return `
<defs>
  <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6e6a58"/><stop offset=".5" stop-color="#46422f"/><stop offset="1" stop-color="#1c1810"/>
  </linearGradient>
  <radialGradient id="hglow" cx="55%" cy="40%" r="60%"><stop offset="0" stop-color="#7a1010" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1280" height="720" fill="url(#hglow)"/>
<path d="M980 760 L1280 700 L1280 320 Q1120 380 980 560Z" fill="#4c4838"/>
${finger(
  [
    [760, 470],
    [670, 400],
    [610, 320],
    [570, 230],
    [548, 130],
    [536, 20],
  ],
  84,
  1,
)}
${finger(
  [
    [860, 420],
    [790, 320],
    [752, 220],
    [728, 120],
    [714, 20],
  ],
  92,
  2,
)}
${finger(
  [
    [950, 400],
    [925, 290],
    [912, 190],
    [906, 90],
    [902, 10],
  ],
  88,
  3,
)}
${finger(
  [
    [1040, 450],
    [1070, 340],
    [1100, 240],
    [1122, 150],
    [1136, 70],
  ],
  80,
  4,
)}
${finger(
  [
    [640, 640],
    [520, 600],
    [420, 560],
    [330, 540],
    [250, 525],
    [170, 520],
  ],
  86,
  5,
)}
<path d="M600 700 Q700 450 960 400 Q1100 430 1100 600 Q1050 760 800 780 Q650 780 600 700Z" fill="url(#skin)" stroke="#0c0604" stroke-width="12"/>
<path d="M740 520 L860 470 M720 570 L880 520 M760 620 L900 570 M800 680 L930 640" stroke="#1c1408" stroke-width="5" fill="none"/>
<path d="M830 560 C860 520 900 520 930 560 M880 620 C910 590 950 600 990 640 M700 500 C740 480 760 440 800 430 M1000 470 C1040 500 1060 560 1050 620" stroke="#3a4a7a" stroke-width="7" fill="none" opacity=".7"/>
<path d="M850 700 l-18 60 M920 690 l5 70 M780 690 l-6 50" stroke="#6a0808" stroke-width="8"/>
<path d="M900 480 l60 70 M915 485 l50 60" stroke="#2a0606" stroke-width="5" opacity=".8"/>
<path d="M820 600 q30 -50 80 -30 q50 20 30 70 q-30 50 -80 20 q-40 -20 -30 -60Z" fill="#2a0404" stroke="#000" stroke-width="5"/>
<path d="M850 600 q20 -20 50 -5 q20 15 5 40 q-25 20 -50 0Z" fill="#6a0808"/>
<path d="M870 585 l4 70 M890 590 l-6 56" stroke="#1a0000" stroke-width="3"/>
<path d="M870 650 q-4 40 4 80 M905 640 q6 40 0 90" stroke="#5a0606" stroke-width="6" stroke-linecap="round"/>
<path d="M680 470 q60 20 120 -10 M670 500 q70 25 150 -10 M690 440 q50 15 100 -10 M1010 520 q20 40 -10 90 M1040 500 q10 50 -20 100" stroke="#1a1208" stroke-width="4" fill="none"/>
<g filter="url(#js-rough)"><path d="M980 440 q40 20 36 70 M700 480 q-10 40 14 70 M560 300 q20 10 10 40" stroke="#0a0a04" stroke-width="16" opacity=".5" fill="none"/></g>
<rect width="1280" height="720" fill="#000" opacity=".25"/>
`;
}

function spinne(): string {
  const legs = [
    'M300 330 Q120 200 20 -40',
    'M280 400 Q60 360 -40 200',
    'M290 470 Q80 540 -30 520',
    'M330 540 Q150 700 40 780',
    'M980 330 Q1160 200 1260 -40',
    'M1000 400 Q1220 360 1320 200',
    'M990 470 Q1200 540 1310 520',
    'M950 540 Q1130 700 1240 780',
  ];
  const r = rng(12);
  const pupils = [
    [640, 190, 74],
    [470, 245, 60],
    [810, 245, 60],
    [545, 130, 34],
    [735, 130, 34],
    [390, 190, 26],
    [890, 195, 28],
    [640, 98, 20],
  ] as const;
  return `
<defs>
  <radialGradient id="sbody" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#4a3a2a"/><stop offset=".6" stop-color="#1c140e"/><stop offset="1" stop-color="#050302"/></radialGradient>
  <radialGradient id="seye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d03030"/><stop offset=".45" stop-color="#580606"/><stop offset="1" stop-color="#050000"/></radialGradient>
</defs>
${legs.map((d) => `<path d="${d}" stroke="#0a0604" stroke-width="44" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#3a2a1c" stroke-width="22" fill="none" stroke-linecap="round" stroke-dasharray="3 7"/>`).join('')}
<ellipse cx="640" cy="320" rx="400" ry="360" fill="url(#sbody)"/>
${hairs(240, -20, 800, 700, 1500, 40, 3, '#6b5238')}
${hairs(240, -20, 800, 700, 600, 30, 5, '#0a0604')}
${pupils.map(([x, y, rad]) => `<circle cx="${x}" cy="${y}" r="${rad + 8}" fill="#050202"/><circle cx="${x}" cy="${y}" r="${rad}" fill="url(#seye)"/><ellipse cx="${x}" cy="${y}" rx="${rad * 0.16}" ry="${rad * 0.34}" fill="#000"/><path d="M${x - rad} ${y} Q${x} ${y - rad * 1.2} ${x + rad} ${y}" fill="none" stroke="#000" stroke-width="4" opacity=".5"/>`).join('')}
<path d="M470 420 Q640 360 810 420 Q780 600 640 640 Q500 600 470 420Z" fill="#050101"/>
<path d="M500 520 Q640 600 780 520 Q760 640 640 680 Q520 640 500 520Z" fill="url(#js-void)"/>
<path d="M440 400 Q380 520 470 640 Q500 560 530 470Z" fill="#14100a" stroke="#000" stroke-width="6"/>
<path d="M840 400 Q900 520 810 640 Q780 560 750 470Z" fill="#14100a" stroke="#000" stroke-width="6"/>
<path d="M440 470 Q440 640 560 740 Q540 620 520 500Z" fill="#cdbf86" stroke="#000" stroke-width="5"/>
<path d="M840 470 Q840 640 720 740 Q740 620 760 500Z" fill="#cdbf86" stroke="#000" stroke-width="5"/>
<path d="M470 560 Q510 640 560 720 M810 560 Q770 640 720 720" stroke="#6a8a10" stroke-width="5" fill="none"/>
<path d="M556 722 l-6 60 M724 722 l6 60" stroke="#8aa010" stroke-width="9" stroke-linecap="round" opacity=".8"/>
${Array.from({ length: 14 }, () => `<path d="M${(r() * 8 + 590) | 0} 640 l${((r() - 0.5) * 60) | 0} ${(30 + r() * 40) | 0}" stroke="#2a1a10" stroke-width="5"/>`).join('')}
`;
}

function spiegel(): string {
  return `
<defs>
  <radialGradient id="mirbg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#4a5a5a"/><stop offset="1" stop-color="#0a0e0e"/></radialGradient>
  <radialGradient id="chick" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#e6d4a8"/><stop offset=".65" stop-color="#b8a075"/><stop offset="1" stop-color="#3a2a1a"/></radialGradient>
</defs>
<rect width="1280" height="720" fill="url(#mirbg)"/>
<path d="M500 140 Q470 -20 560 40 Q580 -50 650 30 Q720 -40 740 50 Q820 0 780 140Z" fill="#8a0a14" stroke="#2a0204" stroke-width="8"/>
<path d="M600 90 l10 60 M690 80 l-8 50" stroke="#2a0204" stroke-width="5"/>
<ellipse cx="640" cy="360" rx="420" ry="400" fill="url(#chick)"/>
${hairs(240, 0, 800, 720, 700, 26, 9, '#a08a60')}
<ellipse cx="400" cy="300" rx="120" ry="140" fill="#000"/><ellipse cx="880" cy="300" rx="120" ry="140" fill="#000"/>
<ellipse cx="400" cy="300" rx="132" ry="152" fill="none" stroke="#3a1a10" stroke-width="10" opacity=".6"/>
<ellipse cx="880" cy="300" rx="132" ry="152" fill="none" stroke="#3a1a10" stroke-width="10" opacity=".6"/>
<circle cx="412" cy="330" r="6" fill="#d8d8d8"/><circle cx="868" cy="330" r="6" fill="#d8d8d8"/>
<path d="M400 440 q-10 90 -26 160 M880 440 q10 90 26 160" stroke="#000" stroke-width="12" fill="none" opacity=".75"/>
<path d="M440 430 L640 395 L840 430 L800 470 L640 450 L480 470Z" fill="#d8982a" stroke="#2a1604" stroke-width="7"/>
<path d="M440 430 L640 395 L840 430" fill="none" stroke="#fff" stroke-width="0"/>
<path d="M390 480 Q640 440 890 480 Q960 620 830 740 Q640 780 450 740 Q320 620 390 480Z" fill="#c07a1c" stroke="#2a1604" stroke-width="8"/>
<path d="M410 520 Q640 480 870 520 Q900 640 800 710 Q640 740 480 710 Q380 640 410 520Z" fill="url(#js-void)"/>
<clipPath id="bk"><path d="M410 520 Q640 480 870 520 Q900 640 800 710 Q640 740 480 710 Q380 640 410 520Z"/></clipPath>
<g clip-path="url(#bk)">
  ${teeth(400, 880, 510, 1, 15, 50, 120, 71, (x) => Math.abs(x - 640) * 0.1)}
  ${teeth(420, 870, 745, -1, 13, 45, 110, 72, (x) => -Math.abs(x - 640) * 0.12)}
  <path d="M560 690 Q640 600 720 690 Q640 640 560 690Z" fill="#8a1020"/>
</g>
<path d="M500 480 L470 530 L520 520 L490 580" stroke="#2a1604" stroke-width="5" fill="none"/>
<path d="M-20 80 L330 260 L420 300 L560 420 L700 520 M1300 100 L980 250 L880 330 L760 450 L660 560 M300 -20 L370 150 L350 300 M960 740 L900 600 L940 520" stroke="#e8f0f0" stroke-width="3" fill="none" opacity=".75"/>
<path d="M330 260 L250 200 M880 330 L1000 400 M700 520 L720 640" stroke="#e8f0f0" stroke-width="2" fill="none" opacity=".6"/>
<rect x="0" y="0" width="1280" height="720" fill="none" stroke="#1a0e08" stroke-width="60"/>
`;
}

const BUILDERS: Record<ScareKind, () => string> = {
  socke,
  teddy,
  kuerbis,
  rudi,
  hand,
  spinne,
  spiegel,
};

const BG: Record<ScareKind, string> = {
  socke: '#140404',
  teddy: '#0c0402',
  kuerbis: '#0a0200',
  rudi: '#020202',
  hand: '#100404',
  spinne: '#030202',
  spiegel: '#020404',
};

/** Complete full-screen SVG markup for one face. */
export function buildFace(kind: ScareKind): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>${COMMON_DEFS}</defs>
<rect width="1280" height="720" fill="${BG[kind]}"/>
<g filter="url(#js-warp)">${BUILDERS[kind]()}</g>
<rect width="1280" height="720" fill="url(#js-vig)"/>
<rect width="1280" height="720" filter="url(#js-grain)" opacity=".5" style="mix-blend-mode:multiply"/>
</svg>`;
}
