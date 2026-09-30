import { describe, expect, it } from "vitest";
import { evaluate, rulesFromSettings, type EvaluateRules } from "../src/core/evaluate";
import type { FolderNode } from "../src/core/tree";
import { parsePatterns } from "../src/core/ignore";
import { DEFAULT_SETTINGS } from "../src/core/settings";

const f = (path: string, files: string[] = [], folders: FolderNode[] = []): FolderNode => ({ path, folders, fileExtensions: files });
const rules = (o: Partial<EvaluateRules> = {}): EvaluateRules => ({ hideEmpty: true, relevantExtensions: ["md", "canvas", "base"], rules: [], pins: {}, ...o });
const paths = (h: ReturnType<typeof evaluate>) => h.map((x) => x.path);

const vault = f("", ["md"], [
  f("repo-a", [], [f("repo-a/docs", ["md"]), f("repo-a/node_modules", [], [f("repo-a/node_modules/pkg", ["md"])]), f("repo-a/dist", ["js"])]),
  f("repo-empty", [], [f("repo-empty/src", ["ts"])]),
  f("repo-deep", [], [f("repo-deep/a", [], [f("repo-deep/a/b", [], [f("repo-deep/a/b/c", ["md"])])])]),
]);

describe("evaluate", () => {
  it("hides folders without relevant files below them, only the topmost", () => {
    expect(paths(evaluate(vault, rules()))).toEqual(["repo-a/dist", "repo-empty"]);
    expect(evaluate(vault, rules()).map((x) => x.reason.kind)).toEqual(["empty", "empty"]);
  });
  it("keeps the path to a deep note visible", () => {
    expect(paths(evaluate(vault, rules()))).not.toContain("repo-deep");
  });
  it("patterns hide even when relevant files are inside", () => {
    const r = rules({ rules: parsePatterns("node_modules").rules });
    const h = evaluate(vault, r);
    expect(paths(h)).toContain("repo-a/node_modules");
    expect(h.find((x) => x.path === "repo-a/node_modules")?.reason).toEqual({ kind: "pattern", pattern: "node_modules" });
  });
  it("hideEmpty off leaves empty folders visible but patterns still work", () => {
    const r = rules({ hideEmpty: false, rules: parsePatterns("dist").rules });
    expect(paths(evaluate(vault, r))).toEqual(["repo-a/dist"]);
  });
  it("pin hide hides a folder with notes", () => {
    const h = evaluate(vault, rules({ pins: { "repo-a/docs": "hide" } }));
    expect(h.find((x) => x.path === "repo-a/docs")?.reason).toEqual({ kind: "pinned" });
  });
  it("pin show beats empty, pattern and protects ancestors", () => {
    const r = rules({ rules: parsePatterns("node_modules").rules, pins: { "repo-a/node_modules/pkg": "show", "repo-empty/src": "show" } });
    const h = paths(evaluate(vault, r));
    expect(h).not.toContain("repo-a/node_modules");
    expect(h).not.toContain("repo-empty");
    expect(h).not.toContain("repo-empty/src");
  });
  it("notes inside a pattern-hidden child do not keep the parent visible (node_modules with README)", () => {
    const repo = f("", [], [f("repo", ["ts"], [f("repo/node_modules", [], [f("repo/node_modules/pkg", ["md"])])])]);
    const withPattern = evaluate(repo, rules({ rules: parsePatterns("node_modules").rules }));
    expect(withPattern).toEqual([{ path: "repo", reason: { kind: "empty" } }]);
    const withoutPattern = evaluate(repo, rules());
    expect(paths(withoutPattern)).toEqual([]);
    const hidePinned = evaluate(repo, rules({ pins: { "repo/node_modules": "hide" } }));
    expect(paths(hidePinned)).toEqual(["repo"]);
  });
  it("a show pin below a hide-pinned ancestor keeps the ancestor visible", () => {
    const tree = f("", [], [f("a", ["md"], [f("a/b", ["md"])])]);
    expect(paths(evaluate(tree, rules({ pins: { a: "hide", "a/b": "show" } })))).toEqual([]);
    expect(paths(evaluate(tree, rules({ pins: { a: "hide" } })))).toEqual(["a"]);
  });
  it("pin show on a folder that matches a pattern itself keeps it visible", () => {
    const r = rules({ rules: parsePatterns("dist").rules, pins: { "repo-a/dist": "show" } });
    expect(paths(evaluate(vault, r))).not.toContain("repo-a/dist");
  });
  it("extension comparison ignores case on both sides", () => {
    const r = rules({ relevantExtensions: ["MD"] });
    expect(paths(evaluate(f("", [], [f("x", ["Md"])]), r))).toEqual([]);
  });
  it("never hides the root, even if the vault is empty", () => {
    expect(evaluate(f("", []), rules())).toEqual([]);
  });
  it("output is sorted by path", () => {
    const h = paths(evaluate(f("", [], [f("z"), f("a"), f("m")]), rules()));
    expect(h).toEqual(["a", "m", "z"]);
  });
});

describe("rulesFromSettings", () => {
  it("parses extensions and patterns from the settings text and reports invalid lines", () => {
    const { rules: r, invalidPatterns } = rulesFromSettings({ ...DEFAULT_SETTINGS, relevantExtensions: ".MD canvas", ignorePatterns: "dist\n!\n" });
    expect(r.relevantExtensions).toEqual(["md", "canvas"]);
    expect(r.rules.map((x) => x.source)).toEqual(["dist"]);
    expect(invalidPatterns).toEqual(["!"]);
    expect(r.hideEmpty).toBe(true);
  });
});
