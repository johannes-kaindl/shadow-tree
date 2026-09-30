import { describe, expect, it } from "vitest";
import type { HiddenFolder } from "../src/core/evaluate";
import { hiddenView, ribbonState } from "../src/core/hidden-view";

const list: HiddenFolder[] = [
  { path: "a", reason: { kind: "empty" } },
  { path: "b/node_modules", reason: { kind: "pattern", pattern: "node_modules" } },
  { path: "c", reason: { kind: "pinned" } },
];

describe("hiddenView", () => {
  it("maps reasons to keys and details", () => {
    const v = hiddenView(list);
    expect(v.total).toBe(3);
    expect(v.more).toBe(0);
    expect(v.rows).toEqual([
      { path: "a", reasonKey: "reason.empty", detail: "" },
      { path: "b/node_modules", reasonKey: "reason.pattern", detail: "node_modules" },
      { path: "c", reasonKey: "reason.pinned", detail: "" },
    ]);
  });
  it("caps the rows and counts the rest", () => {
    const many: HiddenFolder[] = Array.from({ length: 60 }, (_, i) => ({ path: `f${String(i).padStart(2, "0")}`, reason: { kind: "empty" } }));
    const v = hiddenView(many, 50);
    expect(v.rows).toHaveLength(50);
    expect(v.more).toBe(10);
    expect(v.total).toBe(60);
  });
});

describe("ribbonState", () => {
  it("shows the current state, never the action", () => {
    expect(ribbonState(3, false)).toEqual({ icon: "eye-off", labelKey: "ribbon.hiding", count: 3 });
    expect(ribbonState(3, true)).toEqual({ icon: "eye", labelKey: "ribbon.revealed", count: 3 });
  });
});
