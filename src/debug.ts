export interface DebugFlags {
  /** `?debug=1`: enable debug overlays/helpers. */
  debug: boolean;
  /** `?canvas=1`: reserved for canvas-only test mode (no behaviour yet). */
  canvas: boolean;
}

export function readDebugFlags(search: string = window.location.search): DebugFlags {
  const params = new URLSearchParams(search);
  return { debug: params.get('debug') === '1', canvas: params.get('canvas') === '1' };
}
