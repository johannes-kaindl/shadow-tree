import { describe, expect, it } from "vitest";
import "../src/i18n/strings";
import { ShadowTreeSettingTab } from "../src/obsidian/settings-tab";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import type ShadowTreePlugin from "../src/main";

function texts(el: unknown, out: string[] = []): string[] {
  const e = el as { textContent?: string; __ownText?: string; children?: unknown[] };
  if (typeof e.textContent === "string" && e.textContent !== "") out.push(e.textContent);
  for (const c of e.children ?? []) texts(c, out);
  return out;
}

function fakePlugin(over: Partial<ShadowTreePlugin> = {}): ShadowTreePlugin {
  const saved: unknown[] = [];
  return {
    settings: { ...DEFAULT_SETTINGS, pins: {} },
    hidden: [{ path: "repo-empty", reason: { kind: "empty" } }, { path: "a/node_modules", reason: { kind: "pattern", pattern: "node_modules" } }],
    invalidPatterns: [],
    revealed: false,
    sheetSupported: true,
    saveSettings: async () => { saved.push(1); },
    syncStatus: () => ({ kind: "unavailable", reason: "disabled" }),
    ...over,
  } as unknown as ShadowTreePlugin;
}

describe("ShadowTreeSettingTab", () => {
  it("puts the help row first and has the four groups in order", () => {
    const tab = new ShadowTreeSettingTab({} as never, fakePlugin());
    const defs = tab.getSettingDefinitions() as unknown as { name?: string; type?: string; heading?: string }[];
    expect(defs[0].name).toBe("Help");
    expect(defs.slice(1).map((d) => d.heading)).toEqual(["Rules", "Pinned folders", "Currently hidden", "Obsidian Sync"]);
  });
  it("renders the fallback path with empty-state, hidden list and reason texts", () => {
    const tab = new ShadowTreeSettingTab({} as never, fakePlugin());
    tab.display();
    const all = texts(tab.containerEl).join("\n");
    expect(all).toContain("No pinned folders yet.");
    expect(all).toContain("2 folders are hidden right now.");
    expect(all).toContain("repo-empty");
    expect(all).toContain("pattern node_modules");
    expect(all).toContain("Obsidian Sync is not enabled in this vault.");
  });
  it("lists pins with their state and shows invalid pattern lines", () => {
    const plugin = fakePlugin({ invalidPatterns: ["!"] });
    plugin.settings.pins = { "repo-x": "hide" };
    const tab = new ShadowTreeSettingTab({} as never, plugin);
    tab.display();
    const all = texts(tab.containerEl).join("\n");
    expect(all).not.toContain("No pinned folders yet.");
    expect(all).toContain("1 line could not be read and was skipped: !");
  });
  it("setControlValue writes the field and saves", async () => {
    let saves = 0;
    const plugin = fakePlugin({ saveSettings: async () => { saves++; } });
    const tab = new ShadowTreeSettingTab({} as never, plugin);
    await tab.setControlValue("hideEmpty", false);
    await tab.setControlValue("ignorePatterns", "dist");
    await tab.setControlValue("unknown", 1);
    expect(plugin.settings.hideEmpty).toBe(false);
    expect(plugin.settings.ignorePatterns).toBe("dist");
    expect(saves).toBe(2);
    expect(tab.getControlValue("ignorePatterns")).toBe("dist");
  });
});
