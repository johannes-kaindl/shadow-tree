import { describe, expect, it } from "vitest";
import { installHideSheet } from "../src/obsidian/hide-sheet";

class FakeSheet {
  css = "";
  static throwOnReplace = false;
  replaceSync(css: string): void { if (FakeSheet.throwOnReplace) throw new Error("boom"); this.css = css; }
}
function fakeDoc(withSheet = true): Document & { adoptedStyleSheets: FakeSheet[] } {
  return { defaultView: withSheet ? { CSSStyleSheet: FakeSheet } : {}, adoptedStyleSheets: [] } as unknown as Document & { adoptedStyleSheets: FakeSheet[] };
}

describe("installHideSheet", () => {
  it("adopts exactly one sheet and writes one rule block per path", () => {
    const doc = fakeDoc();
    const h = installHideSheet(doc, ["a", "b c"]);
    expect(h.supported).toBe(true);
    expect(doc.adoptedStyleSheets).toHaveLength(1);
    const css = doc.adoptedStyleSheets[0].css;
    expect(css).toContain('[data-path="a"]');
    expect(css).toContain('[data-path="b c"]');
    expect(css).toContain("+ .nav-folder-children { display: none; }");
    h.update(["only"]);
    expect(doc.adoptedStyleSheets).toHaveLength(1);
    expect(doc.adoptedStyleSheets[0].css).not.toContain('[data-path="a"]');
    h.update([]);
    expect(doc.adoptedStyleSheets[0].css).toBe("");
  });
  it("remove detaches the sheet once", () => {
    const doc = fakeDoc();
    const h = installHideSheet(doc, ["a"]);
    h.remove(); h.remove();
    expect(doc.adoptedStyleSheets).toHaveLength(0);
    h.update(["a"]);          // nach remove installiert update wieder ein Blatt
    expect(doc.adoptedStyleSheets).toHaveLength(1);
  });
  it("is a no-op without constructable stylesheets", () => {
    const doc = fakeDoc(false);
    const h = installHideSheet(doc, ["a"]);
    expect(h.supported).toBe(false);
    expect(doc.adoptedStyleSheets).toHaveLength(0);
  });
  it("routes errors to onError instead of throwing", () => {
    const doc = fakeDoc();
    const errors: unknown[] = [];
    FakeSheet.throwOnReplace = true;
    try {
      const h = installHideSheet(doc, ["a"], (e) => errors.push(e));
      expect(h.supported).toBe(true);
      expect(errors).toHaveLength(1);
    } finally { FakeSheet.throwOnReplace = false; }
  });
});
