import { describe, expect, it } from "vitest";
import { Menu } from "obsidian";
import "../src/i18n/strings";
import { addPinMenuItems } from "../src/obsidian/folder-menu";
import type { PinState } from "../src/core/settings";

describe("addPinMenuItems", () => {
  it("offers show and hide when the folder is not pinned", () => {
    const menu = new Menu();
    const got: (PinState | null)[] = [];
    addPinMenuItems(menu, undefined, (s) => got.push(s));
    const items = (menu as unknown as { items: { titleText: string; iconName: string; clickHandler: (() => void) | null }[] }).items;
    expect(items.map((i) => i.titleText)).toEqual(["Shadow Tree: always show", "Shadow Tree: always hide"]);
    expect(items.map((i) => i.iconName)).toEqual(["pin", "eye-off"]);
    items[0].clickHandler?.(); items[1].clickHandler?.();
    expect(got).toEqual(["show", "hide"]);
  });
  it("offers only unpin when pinned, naming the current state", () => {
    const menu = new Menu();
    const got: (PinState | null)[] = [];
    addPinMenuItems(menu, "show", (s) => got.push(s));
    const items = (menu as unknown as { items: { titleText: string; iconName: string; clickHandler: (() => void) | null }[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0].titleText).toBe("Shadow Tree: remove pin (currently: Always show)");
    expect(items[0].iconName).toBe("pin-off");
    items[0].clickHandler?.();
    expect(got).toEqual([null]);
  });
});
