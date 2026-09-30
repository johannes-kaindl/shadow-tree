import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, parseExtensions, pinOf, withPin } from "../src/core/settings";

describe("parseExtensions", () => {
  it("splits on comma and whitespace, lowercases, strips dots, dedupes", () => {
    expect(parseExtensions(" .MD, canvas  base,md ")).toEqual(["md", "canvas", "base"]);
    expect(parseExtensions("")).toEqual([]);
  });
});

describe("loadSettings", () => {
  it("returns defaults for null and does not alias the default object", () => {
    const s = loadSettings(null);
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(s.pins).not.toBe(DEFAULT_SETTINGS.pins);
  });
  it("keeps known fields and repairs broken ones individually", () => {
    const s = loadSettings({ hideEmpty: false, pins: ["not", "an", "object"], syncManaged: "nope", ignorePatterns: "x" });
    expect(s.hideEmpty).toBe(false);
    expect(s.ignorePatterns).toBe("x");
    expect(s.pins).toEqual({});
    expect(s.syncManaged).toEqual([]);
    expect(s.relevantExtensions).toBe(DEFAULT_SETTINGS.relevantExtensions);
  });
  it("normalizes pin paths and drops invalid states and the root", () => {
    const s = loadSettings({ pins: { "/repo-a/": "show", b: "maybe", "": "hide", "/": "show" } });
    expect(s.pins).toEqual({ "repo-a": "show" });
  });
  it("normalizes syncManaged entries and drops non-strings", () => {
    expect(loadSettings({ syncManaged: ["/a/", 3, ""] }).syncManaged).toEqual(["a"]);
  });
});

describe("withPin / pinOf", () => {
  it("sets, replaces and removes a pin without mutating the input", () => {
    const a = withPin(DEFAULT_SETTINGS, "/x/", "hide");
    expect(pinOf(a, "x")).toBe("hide");
    expect(pinOf(DEFAULT_SETTINGS, "x")).toBeUndefined();
    const b = withPin(a, "x", "show");
    expect(pinOf(b, "x")).toBe("show");
    const c = withPin(b, "x", null);
    expect(pinOf(c, "x")).toBeUndefined();
    expect(a.pins).toEqual({ x: "hide" });
  });
  it("ignores the root", () => {
    expect(withPin(DEFAULT_SETTINGS, "/", "hide").pins).toEqual({});
  });
});
