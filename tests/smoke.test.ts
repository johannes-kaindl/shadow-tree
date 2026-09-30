import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("manifest", () => {
  it("carries the plugin id and no forbidden words in the description", () => {
    const m = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8")) as { id: string; description: string };
    expect(m.id).toBe("shadow-tree");
    expect(m.description).not.toMatch(/obsidian|plugin/i);
  });
});
