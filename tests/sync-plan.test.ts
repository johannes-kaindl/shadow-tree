import { describe, expect, it } from "vitest";
import { planSyncExclusions } from "../src/core/sync-plan";

describe("planSyncExclusions", () => {
  it("adds desired, keeps user entries, replaces previously managed", () => {
    const p = planSyncExclusions(["user/x", "old/managed"], ["old/managed"], ["repo-a/dist", "repo-empty"]);
    expect(p.next).toEqual(["user/x", "repo-a/dist", "repo-empty"]);
    expect(p.managed).toEqual(["repo-a/dist", "repo-empty"]);
    expect(p.changed).toBe(true);
  });
  it("reports unchanged when the set is identical regardless of order", () => {
    const p = planSyncExclusions(["b", "a"], ["a"], ["a"]);
    expect(p.changed).toBe(false);
  });
  it("switching off (desired empty) removes only managed entries", () => {
    const p = planSyncExclusions(["user/x", "m1", "m2"], ["m1", "m2"], []);
    expect(p.next).toEqual(["user/x"]);
    expect(p.managed).toEqual([]);
    expect(p.changed).toBe(true);
  });
  it("a user entry that equals a desired path stays after switching off, because it was never managed", () => {
    const on = planSyncExclusions(["repo-a/dist"], [], ["repo-a/dist"]);
    expect(on.next).toEqual(["repo-a/dist"]);
    expect(on.managed).toEqual([]);
    expect(on.changed).toBe(false);
    const off = planSyncExclusions(on.next, on.managed, []);
    expect(off.next).toEqual(["repo-a/dist"]);
    expect(off.changed).toBe(false);
  });
  it("dedupes", () => {
    expect(planSyncExclusions(["a", "a"], [], ["a", "b", "b"]).next).toEqual(["a", "b"]);
  });
});
