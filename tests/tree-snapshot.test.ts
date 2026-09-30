import { describe, expect, it } from "vitest";
import { TFile, TFolder } from "./vendor/kit/obsidian-mock";
import { snapshotVault } from "../src/obsidian/tree-snapshot";

function folder(path: string, ...children: (TFolder | TFile)[]): TFolder {
  const f = new TFolder(path);
  f.children = children;
  return f;
}

describe("snapshotVault", () => {
  it("turns the TFolder tree into a plain FolderNode tree with lowercased extensions", () => {
    const root = folder("/", new TFile("Welcome.md"), folder("a", new TFile("a/README.MD"), folder("a/b", new TFile("a/b/x.canvas"), new TFile("a/b/data.JSON"))));
    expect(snapshotVault(root)).toEqual({
      path: "",
      fileExtensions: ["md"],
      folders: [{ path: "a", fileExtensions: ["md"], folders: [{ path: "a/b", fileExtensions: ["canvas", "json"], folders: [] }] }],
    });
  });
  it("files without extension count as empty string, folders are sorted by path", () => {
    const root = folder("/", folder("z"), folder("a", new TFile("a/LICENSE", "")));
    const snap = snapshotVault(root);
    expect(snap.folders.map((f) => f.path)).toEqual(["a", "z"]);
    expect(snap.folders[0].fileExtensions).toEqual([""]);
  });
});
