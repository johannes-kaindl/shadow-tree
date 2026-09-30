import type { Menu } from "obsidian";
import type { PinState } from "../core/settings";
import { t } from "../vendor/kit/i18n";

/** Kontextmenü-Einträge für Pins (Spec § 6). Ohne Pin: „immer anzeigen“ und „immer verstecken“;
 *  mit Pin: nur „Pin entfernen“, das den Ist-Zustand nennt. Die Menü-Titel tragen den Plugin-Namen,
 *  weil Obsidians Ordner-Menü Einträge vieler Plugins mischt. */
export function addPinMenuItems(menu: Menu, current: PinState | undefined, onSet: (state: PinState | null) => void): void {
  if (current === undefined) {
    menu.addItem((item) => item.setTitle(t("menu.show")).setIcon("pin").onClick(() => { onSet("show"); }));
    menu.addItem((item) => item.setTitle(t("menu.hide")).setIcon("eye-off").onClick(() => { onSet("hide"); }));
    return;
  }
  const label = current === "show" ? t("pin.show") : t("pin.hide");
  menu.addItem((item) => item.setTitle(t("menu.unpin", label)).setIcon("pin-off").onClick(() => { onSet(null); }));
}
