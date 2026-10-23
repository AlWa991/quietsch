import { describe, expect, it, vi } from 'vitest';
import { createStore, initialGameState } from '@/ui/store';

describe('store', () => {
  it('merges partial state updates', () => {
    const store = createStore(initialGameState());
    store.set({ feathers: 5 });
    expect(store.get().feathers).toBe(5);
    expect(store.get().hearts).toBe(3);
  });

  it('delivers typed events only to matching handlers and supports unsubscribe', () => {
    const store = createStore(initialGameState());
    const onFeathers = vi.fn();
    const onSonar = vi.fn();
    const off = store.on('feathers', onFeathers);
    store.on('sonar', onSonar);
    store.emit({ type: 'feathers', amount: 3 });
    off();
    store.emit({ type: 'feathers', amount: 1 });
    expect(onFeathers).toHaveBeenCalledTimes(1);
    expect(onFeathers).toHaveBeenCalledWith({ type: 'feathers', amount: 3 });
    expect(onSonar).not.toHaveBeenCalled();
  });
});
