import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { syncFacade } from "../src/obsidian/sync-exclude";

function appWith(sync: unknown): App {
  return { internalPlugins: sync === undefined ? undefined : { plugins: { sync } } } as unknown as App;
}

describe("syncFacade", () => {
  it("reports no-plugin without internalPlugins or sync entry", () => {
    expect(syncFacade({} as App)).toEqual({ available: false, reason: "no-plugin" });
    expect(syncFacade(appWith(undefined))).toEqual({ available: false, reason: "no-plugin" });
  });
  it("reports disabled when the core plugin is off", () => {
    expect(syncFacade(appWith({ enabled: false, instance: {} }))).toEqual({ available: false, reason: "disabled" });
  });
  it("reports no-api when the instance lacks the measured shape", () => {
    expect(syncFacade(appWith({ enabled: true, instance: { filter: { ignoreFolders: [] } } }))).toEqual({ available: false, reason: "no-api" });
    expect(syncFacade(appWith({ enabled: true, instance: { setIgnoreFolders() {}, filter: { ignoreFolders: "x" } } }))).toEqual({ available: false, reason: "no-api" });
  });
  it("reports no-account when the instance has no remote vault id (measured: null without an account)", () => {
    const instance = { filter: { ignoreFolders: [] }, setIgnoreFolders() {}, vaultId: null };
    expect(syncFacade(appWith({ enabled: true, instance }))).toEqual({ available: false, reason: "no-account" });
  });
  it("exposes a copy of the list and forwards writes", () => {
    const calls: string[][] = [];
    const instance = { vaultId: "remote-1", filter: { ignoreFolders: ["u"] }, setIgnoreFolders(p: string[]) { calls.push(p); } };
    const f = syncFacade(appWith({ enabled: true, instance }));
    expect(f.available).toBe(true);
    if (!f.available) return;
    const list = f.getIgnoreFolders();
    expect(list).toEqual(["u"]);
    list.push("mutated");
    expect(instance.filter.ignoreFolders).toEqual(["u"]);
    f.setIgnoreFolders(["a"]);
    expect(calls).toEqual([["a"]]);
  });
});
