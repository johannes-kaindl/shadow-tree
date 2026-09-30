import { describe, expect, it } from "vitest";
import { STRINGS } from "../src/i18n/strings";

describe("strings", () => {
  it("en and de carry the same keys", () => {
    expect(Object.keys(STRINGS.de).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });
  it("no text says 'Obsidian plugin' and placeholders match between languages", () => {
    for (const [k, en] of Object.entries(STRINGS.en)) {
      expect(en).not.toMatch(/obsidian plugin/i);
      const ph = (s: string) => (s.match(/\{\d\}/g) ?? []).sort();
      expect(ph(STRINGS.de[k as keyof typeof STRINGS.de])).toEqual(ph(en));
    }
  });
});
