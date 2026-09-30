import { describe, expect, it } from "vitest";
import { TFile, TFolder } from "./vendor/kit/obsidian-mock";
import ShadowTreePlugin from "../src/main";
import type { HideSheetHandle } from "../src/obsidian/hide-sheet";

function folder(path: string, ...children: (TFolder | TFile)[]): TFolder {
  const f = new TFolder(path);
  f.children = children;
  return f;
}

function setup(sync?: unknown) {
  const root = folder("/", new TFile("Welcome.md"), folder("repo-notes", new TFile("repo-notes/README.md"), folder("repo-notes/node_modules", new TFile("repo-notes/node_modules/README.md"))), folder("repo-empty", new TFile("repo-empty/x.ts", "ts")));
  const events: string[] = [];
  const app = {
    vault: { getRoot: () => root, on: (name: string) => { events.push(name); return {}; } },
    workspace: { onLayoutReady: (cb: () => void) => cb(), rootSplit: { doc: {} }, on: (name: string) => { events.push(name); return {}; } },
    internalPlugins: sync === undefined ? undefined : { plugins: { sync } },
  };
  const plugin = new ShadowTreePlugin(app as never, { id: "shadow-tree", name: "Shadow Tree", version: "0.0.0" } as never);
  const updates: string[][] = [];
  let removed = 0;
  plugin.installSheet = (_doc, paths) => {
    updates.push([...paths]);
    const h: HideSheetHandle = { supported: true, update: (p) => { updates.push([...p]); }, remove: () => { removed++; } };
    return h;
  };
  const pending: (() => void)[] = [];
  plugin.timers = { set: (cb) => { pending.push(cb); return pending.length; }, clear: () => {} };
  return { plugin, updates, events, pending, removedRef: () => removed, app };
}

describe("ShadowTreePlugin", () => {
  it("registers command, listens to vault events and hides the computed folders", async () => {
    const { plugin, updates, events, removedRef } = setup();
    await plugin.onload();
    expect((plugin as unknown as { commands: { id: string }[] }).commands.map((c) => c.id)).toEqual(["toggle-hidden-folders"]);
    expect(events).toEqual(expect.arrayContaining(["create", "delete", "rename", "file-menu"]));
    expect(updates.at(-1)).toEqual(["repo-empty", "repo-notes/node_modules"]);
    expect(plugin.hidden.map((h) => h.reason.kind)).toEqual(["empty", "pattern"]);
    plugin.onunload();
    expect(removedRef()).toBe(1);
  });
  it("toggleReveal empties the sheet and restores it, saveSettings recomputes", async () => {
    const { plugin, updates } = setup();
    await plugin.onload();
    plugin.toggleReveal();
    expect(plugin.revealed).toBe(true);
    expect(updates.at(-1)).toEqual([]);
    plugin.toggleReveal();
    expect(updates.at(-1)).toEqual(["repo-empty", "repo-notes/node_modules"]);
    await plugin.setPin("repo-empty", "show");
    expect(updates.at(-1)).toEqual(["repo-notes/node_modules"]);
    expect(await plugin.loadData()).toMatchObject({ pins: { "repo-empty": "show" } });
  });
  it("writes the sync exclusion list only when opted in, and only its own entries", async () => {
    const calls: string[][] = [];
    const instance = { filter: { ignoreFolders: ["user/own"] }, setIgnoreFolders(p: string[]) { calls.push(p); instance.filter.ignoreFolders = p; } };
    const { plugin, pending } = setup({ enabled: true, instance });
    await plugin.onload();
    pending.splice(0).forEach((cb) => cb());          // Sync-Entpreller feuern (Opt-in aus)
    expect(calls).toEqual([]);
    expect(plugin.syncStatus()).toEqual({ kind: "ok", managed: 0 });
    plugin.settings.syncExclude = true;
    await plugin.saveSettings();
    pending.splice(0).forEach((cb) => cb());
    expect(calls.at(-1)).toEqual(["user/own", "repo-empty", "repo-notes/node_modules"]);
    expect(plugin.settings.syncManaged).toEqual(["repo-empty", "repo-notes/node_modules"]);
    plugin.settings.syncExclude = false;
    await plugin.saveSettings();
    pending.splice(0).forEach((cb) => cb());
    expect(calls.at(-1)).toEqual(["user/own"]);
    expect(plugin.syncStatus()).toEqual({ kind: "ok", managed: 0 });
  });
  it("reports sync as unavailable without the core plugin", async () => {
    const { plugin, pending } = setup();
    await plugin.onload();
    pending.splice(0).forEach((cb) => cb());
    expect(plugin.syncStatus()).toEqual({ kind: "unavailable", reason: "no-plugin" });
  });
});
