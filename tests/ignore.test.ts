import { describe, expect, it } from "vitest";
import { matchIgnore, normalizeFolderPath, parsePatterns } from "../src/core/ignore";

const m = (text: string, path: string) => matchIgnore(parsePatterns(text).rules, path);

describe("normalizeFolderPath", () => {
  it("strips surrounding slashes and whitespace, collapses doubles", () => {
    expect(normalizeFolderPath(" /repo-a//dist/ ")).toBe("repo-a/dist");
    expect(normalizeFolderPath("/")).toBe("");
  });
});

describe("parsePatterns", () => {
  it("skips blank lines and comments, keeps escaped hash", () => {
    const p = parsePatterns("# c\n\nnode_modules\n\\#literal\n");
    expect(p.rules.map((r) => r.source)).toEqual(["node_modules", "\\#literal"]);
    expect(p.invalid).toEqual([]);
  });
  it("reports lines that are only ! or / or **", () => {
    expect(parsePatterns("!\n/\n**\n").invalid).toEqual(["!", "/", "**"]);
  });
});

describe("matchIgnore", () => {
  it("pattern without slash matches the folder name at any depth", () => {
    expect(m("node_modules", "node_modules")).toBe("node_modules");
    expect(m("node_modules", "repo-a/packages/x/node_modules")).toBe("node_modules");
    expect(m("node_modules", "repo-a/node_modules_backup")).toBeNull();
  });
  it("pattern with slash is anchored at the vault root, leading slash optional", () => {
    expect(m("repo-a/dist", "repo-a/dist")).toBe("repo-a/dist");
    expect(m("/repo-a/dist", "repo-a/dist")).toBe("/repo-a/dist");
    expect(m("repo-a/dist", "other/repo-a/dist")).toBeNull();
  });
  it("trailing slash has no effect, escaped hash matches literally", () => {
    expect(m("build/", "repo-a/build")).toBe("build/");
    expect(m("\\#literal", "a/#literal")).toBe("\\#literal");
  });
  it("* stays inside a segment, ** crosses segments, ? is one char", () => {
    expect(m("*.tmp", "a/cache.tmp")).toBe("*.tmp");
    expect(m("repo-*/dist", "repo-a/dist")).toBe("repo-*/dist");
    expect(m("repo-*/dist", "repo-a/sub/dist")).toBeNull();
    expect(m("repo-a/**/dist", "repo-a/dist")).toBe("repo-a/**/dist");
    expect(m("repo-a/**/dist", "repo-a/x/y/dist")).toBe("repo-a/**/dist");
    expect(m("**/tmp", "tmp")).toBe("**/tmp");
    expect(m("**/tmp", "a/b/tmp")).toBe("**/tmp");
    expect(m("docs/**", "docs/x")).toBe("docs/**");
    expect(m("docs/**", "docs")).toBe("docs/**");
    expect(m("v?", "v1")).toBe("v?");
    expect(m("v?", "v12")).toBeNull();
  });
  it("negation: the last matching rule wins", () => {
    expect(m("build\n!repo-a/build", "repo-a/build")).toBeNull();
    expect(m("build\n!repo-a/build", "repo-b/build")).toBe("build");
    expect(m("!x\nx", "x")).toBe("x");
  });
  it("brackets are literal, regex metacharacters are escaped", () => {
    expect(m("[abc]", "[abc]")).toBe("[abc]");
    expect(m("[abc]", "a")).toBeNull();
    expect(m("a.b", "axb")).toBeNull();
  });
  it("never matches the root", () => {
    expect(m("*", "")).toBeNull();
    expect(m("*", "/")).toBeNull();
  });
  it("input path is normalized before matching", () => {
    expect(m("repo-a/dist", "/repo-a//dist/")).toBe("repo-a/dist");
  });
});
