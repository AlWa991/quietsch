/** Keyboard state. Movement axes plus a scream key with press/release edges. */
export interface Input {
  readonly keys: ReadonlySet<string>;
  /** Movement axis, x = right, z = down-screen. Writes into `out`. */
  axis(out: { x: number; z: number }): void;
  onScreamStart(cb: () => void): void;
  onScreamEnd(cb: () => void): void;
  onKey(cb: (code: string) => void): void;
}

const MOVE_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export function createInput(target: Window = window): Input {
  const keys = new Set<string>();
  const start: (() => void)[] = [];
  const end: (() => void)[] = [];
  const any: ((code: string) => void)[] = [];

  target.addEventListener('keydown', (e) => {
    if (MOVE_CODES.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space') start.forEach((cb) => cb());
    any.forEach((cb) => cb(e.code));
  });
  target.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') end.forEach((cb) => cb());
  });
  target.addEventListener('blur', () => {
    if (keys.has('Space')) end.forEach((cb) => cb());
    keys.clear();
  });

  return {
    keys,
    axis(out) {
      const k = (a: string, b: string): number => (keys.has(a) || keys.has(b) ? 1 : 0);
      out.x = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
      out.z = k('KeyS', 'ArrowDown') - k('KeyW', 'ArrowUp');
      const len = Math.hypot(out.x, out.z);
      if (len > 1) {
        out.x /= len;
        out.z /= len;
      }
    },
    onScreamStart: (cb) => start.push(cb),
    onScreamEnd: (cb) => end.push(cb),
    onKey: (cb) => any.push(cb),
  };
}
