/** Entpreller mit injizierten Timern, damit src/core ohne window/DOM testbar bleibt. */
export interface Debouncer { schedule(): void; cancel(): void; flush(): void; }
export interface Timers { set: (cb: () => void, ms: number) => number; clear: (id: number) => void; }

export function createDebouncer(fn: () => void, ms: number, timers: Timers): Debouncer {
  let id: number | null = null;
  const cancel = (): void => { if (id !== null) { timers.clear(id); id = null; } };
  return {
    schedule() { cancel(); id = timers.set(() => { id = null; fn(); }, ms); },
    cancel,
    flush() { cancel(); fn(); },
  };
}
