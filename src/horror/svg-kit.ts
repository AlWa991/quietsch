/** Hand-drawn SVG building blocks for the jumpscare faces. All geometry is deterministic (seeded). */

export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const f = (n: number): string => n.toFixed(1);

/** Shared defs: warp / grain filters and gradients used by every face. */
export const COMMON_DEFS = `
<filter id="js-warp" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="js-rough" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="3" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="js-grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -0.35"/>
</filter>
<filter id="js-blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="js-blur20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
<radialGradient id="js-vig" cx="50%" cy="50%" r="72%">
  <stop offset="45%" stop-color="#000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000" stop-opacity="0.96"/>
</radialGradient>
<radialGradient id="js-sclera" cx="50%" cy="46%" r="55%">
  <stop offset="0%" stop-color="#ece0b6"/>
  <stop offset="55%" stop-color="#d4b08a"/>
  <stop offset="100%" stop-color="#7d1b17"/>
</radialGradient>
<radialGradient id="js-void" cx="50%" cy="50%" r="60%">
  <stop offset="0%" stop-color="#000"/>
  <stop offset="100%" stop-color="#1a0204"/>
</radialGradient>
<linearGradient id="js-tooth" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#d8cf8a"/>
  <stop offset="70%" stop-color="#a69a52"/>
  <stop offset="100%" stop-color="#5a2418"/>
</linearGradient>
`;

/** Row of uneven, tilted, partly missing teeth. dir=1 points down from y, dir=-1 points up. */
export function teeth(
  x0: number,
  x1: number,
  y: number,
  dir: 1 | -1,
  count: number,
  hMin: number,
  hMax: number,
  seed: number,
  curve: (x: number) => number = () => 0,
  fill = 'url(#js-tooth)',
): string {
  const r = rng(seed);
  const step = (x1 - x0) / count;
  let out = '';
  for (let i = 0; i < count; i++) {
    if (r() < 0.1) continue; // missing tooth
    const w = step * (0.7 + r() * 0.9);
    const xa = x0 + i * step + (r() - 0.5) * step * 0.4;
    const xb = xa + w;
    const h = hMin + r() * (hMax - hMin);
    const tilt = (r() - 0.5) * w * 0.9;
    const pointy = r() < 0.5 ? 0.05 : 0.45;
    const ya = y + curve(xa);
    const yb = y + curve(xb);
    const tipX = (xa + xb) / 2 + tilt;
    const tipY = (ya + yb) / 2 + dir * h;
    const nw = w * pointy;
    out +=
      `<path d="M${f(xa)} ${f(ya)} L${f(tipX - nw / 2)} ${f(tipY)} L${f(tipX + nw / 2)} ${f(tipY - dir * 2)} L${f(xb)} ${f(yb)} Z" ` +
      `fill="${fill}" stroke="#1a0604" stroke-width="3" stroke-linejoin="round"/>`;
    if (r() < 0.35) {
      // blood / rot streak down the tooth
      out += `<path d="M${f(tipX)} ${f(tipY)} l${f((r() - 0.5) * 6)} ${f(-dir * h * 0.5)}" stroke="#6a0c0c" stroke-width="3" opacity="0.75"/>`;
    }
  }
  return out;
}

export interface EyeOpts {
  iris?: string;
  veins?: number;
  tilt?: number;
  lid?: boolean;
}

/** Huge bloodshot eye with a tiny pupil. */
export function eye(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  o: EyeOpts = {},
): string {
  const r = rng(seed);
  const iris = o.iris ?? '#8a6a12';
  const n = o.veins ?? 26;
  let veins = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const len = 0.45 + r() * 0.5;
    const sx = cx + Math.cos(a) * rx * 0.98;
    const sy = cy + Math.sin(a) * ry * 0.98;
    const ex = cx + Math.cos(a + (r() - 0.5) * 0.5) * rx * (1 - len);
    const ey = cy + Math.sin(a + (r() - 0.5) * 0.5) * ry * (1 - len);
    const mx = (sx + ex) / 2 + (r() - 0.5) * rx * 0.25;
    const my = (sy + ey) / 2 + (r() - 0.5) * ry * 0.25;
    const bx = ex + (r() - 0.5) * rx * 0.2;
    const by = ey + (r() - 0.5) * ry * 0.2;
    veins += `<path d="M${f(sx)} ${f(sy)} Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)} T${f(bx)} ${f(by)}" fill="none" stroke="#b0121c" stroke-width="${f(1 + r() * 3)}" stroke-linecap="round" opacity="${f(0.55 + r() * 0.4)}"/>`;
  }
  const ir = Math.min(rx, ry) * 0.42;
  const px = cx + (r() - 0.5) * rx * 0.2;
  const py = cy + (r() - 0.3) * ry * 0.25;
  const rot = o.tilt ?? 0;
  return `<g transform="rotate(${rot} ${cx} ${cy})">
  <ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.08}" ry="${ry * 1.1}" fill="#14030a"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#js-sclera)"/>
  ${veins}
  <circle cx="${f(px)}" cy="${f(py)}" r="${f(ir)}" fill="${iris}"/>
  <circle cx="${f(px)}" cy="${f(py)}" r="${f(ir)}" fill="none" stroke="#260a04" stroke-width="${f(ir * 0.18)}"/>
  <circle cx="${f(px)}" cy="${f(py)}" r="${f(Math.max(3, ir * 0.17))}" fill="#000"/>
  ${o.lid === false ? '' : `<path d="M${cx - rx} ${cy} Q${cx} ${f(cy - ry * 1.5)} ${cx + rx} ${cy} Q${cx} ${f(cy - ry * 0.75)} ${cx - rx} ${cy}Z" fill="#000" opacity="0.5"/>`}
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#3a0408" stroke-width="5" opacity="0.8"/>
  </g>`;
}

/** Cross stitches along a polyline between two points. */
export function stitches(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  n: number,
  len: number,
  seed: number,
  color = '#120a08',
): string {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t + (r() - 0.5) * 6;
    const y = y0 + (y1 - y0) * t + (r() - 0.5) * 6;
    const l = len * (0.8 + r() * 0.5);
    const a = (r() - 0.5) * 0.5;
    out += `<path d="M${f(x - Math.sin(a) * l)} ${f(y - l * 0.5)} L${f(x + Math.sin(a) * l)} ${f(y + l * 0.5)}" stroke="${color}" stroke-width="${f(5 + r() * 3)}" stroke-linecap="round"/>`;
    if (r() < 0.6) {
      out += `<path d="M${f(x + l * 0.6)} ${f(y - l * 0.5)} L${f(x - l * 0.6)} ${f(y + l * 0.5)}" stroke="${color}" stroke-width="${f(4 + r() * 3)}" stroke-linecap="round"/>`;
    }
  }
  return out;
}

/** Jagged closed blob around a center, for rips and mouths. */
export function jagged(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n: number,
  jit: number,
  seed: number,
): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (i % 2 === 0 ? 1 : -1) * jit * (0.4 + r() * 0.6);
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    d += `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)} `;
  }
  return d + 'Z';
}

/** Many short hair strokes inside a box, to give fur/hair texture. */
export function hairs(
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
  len: number,
  seed: number,
  color: string,
): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const a = (r() - 0.5) * 1.6 - Math.PI / 2;
    const l = len * (0.5 + r());
    d += `M${f(px)} ${f(py)} l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)} `;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>`;
}

export function drips(xs: number[], y: number, seed: number, color = '#5a0508'): string {
  const r = rng(seed);
  return xs
    .map((x) => {
      const l = 40 + r() * 140;
      return `<path d="M${x} ${y} l0 ${f(l)}" stroke="${color}" stroke-width="${f(5 + r() * 7)}" stroke-linecap="round"/><circle cx="${x}" cy="${f(y + l)}" r="${f(6 + r() * 5)}" fill="${color}"/>`;
    })
    .join('');
}
