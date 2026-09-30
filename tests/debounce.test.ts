import { describe, expect, it } from "vitest";
import { createDebouncer } from "../src/core/debounce";

function fakeTimers() {
  let now = 0;
  let seq = 0;
  const q = new Map<number, { at: number; cb: () => void }>();
  return {
    timers: {
      set: (cb: () => void, ms: number) => { q.set(++seq, { at: now + ms, cb }); return seq; },
      clear: (id: number) => { q.delete(id); },
    },
    advance(ms: number) { now += ms; for (const [id, t] of [...q]) if (t.at <= now) { q.delete(id); t.cb(); } },
  };
}

describe("createDebouncer", () => {
  it("runs once after the quiet period, restarting on each schedule", () => {
    const ft = fakeTimers();
    let n = 0;
    const d = createDebouncer(() => { n++; }, 250, ft.timers);
    d.schedule(); ft.advance(200); d.schedule(); ft.advance(200);
    expect(n).toBe(0);
    ft.advance(100);
    expect(n).toBe(1);
  });
  it("flush runs immediately and cancels the pending timer; cancel drops it", () => {
    const ft = fakeTimers();
    let n = 0;
    const d = createDebouncer(() => { n++; }, 250, ft.timers);
    d.schedule(); d.flush();
    expect(n).toBe(1);
    ft.advance(1000);
    expect(n).toBe(1);
    d.schedule(); d.cancel(); ft.advance(1000);
    expect(n).toBe(1);
  });
});
