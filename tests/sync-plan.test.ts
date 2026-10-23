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
  it("does not add a folder below an entry the user already excluded", () => {
    const p = planSyncExclusions(["Fremd Eltern"], [], ["Fremd Eltern/node_modules", "repo/dist"]);
    expect(p.next).toEqual(["Fremd Eltern", "repo/dist"]);
    expect(p.managed).toEqual(["repo/dist"]);
    expect(p.changed).toBe(true);
  });
  it("does not add a folder below another desired folder", () => {
    const p = planSyncExclusions([], [], ["a/b/c", "a", "a/b", "x"]);
    expect(p.next).toEqual(["a", "x"]);
    expect(p.managed).toEqual(["a", "x"]);
  });
  it("treats only a path boundary as parent, not a shared name prefix", () => {
    const p = planSyncExclusions(["app"], [], ["app2/dist", "app/dist", "ap"]);
    expect(p.next).toEqual(["app", "app2/dist", "ap"]);
    expect(p.managed).toEqual(["app2/dist", "ap"]);
  });
  it("drops a managed entry that a new parent entry now covers", () => {
    const first = planSyncExclusions([], [], ["repo/node_modules"]);
    expect(first.next).toEqual(["repo/node_modules"]);
    const second = planSyncExclusions(first.next, first.managed, ["repo", "repo/node_modules"]);
    expect(second.next).toEqual(["repo"]);
    expect(second.managed).toEqual(["repo"]);
    expect(second.changed).toBe(true);
  });
  it("keeps user entries even when one lies below another user entry", () => {
    const p = planSyncExclusions(["a", "a/b"], [], []);
    expect(p.next).toEqual(["a", "a/b"]);
    expect(p.changed).toBe(false);
  });
});
