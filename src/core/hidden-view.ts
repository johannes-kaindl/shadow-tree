import type { HiddenFolder } from "./evaluate";

/** ViewModel für die Settings-Liste „derzeit ausgeblendet“ und den Ribbon-Knopf (UI-STANDARD §6: State → ViewModel). */
export interface HiddenRow { path: string; reasonKey: "reason.pinned" | "reason.pattern" | "reason.empty"; detail: string; }
export interface HiddenView { rows: HiddenRow[]; more: number; total: number; }

export function hiddenView(list: readonly HiddenFolder[], cap = 50): HiddenView {
  const rows = list.slice(0, cap).map((h): HiddenRow => ({
    path: h.path,
    reasonKey: h.reason.kind === "pattern" ? "reason.pattern" : h.reason.kind === "pinned" ? "reason.pinned" : "reason.empty",
    detail: h.reason.kind === "pattern" ? h.reason.pattern : "",
  }));
  return { rows, more: Math.max(0, list.length - cap), total: list.length };
}

/** §8 Zustands-Knopf: Icon und Text zeigen den IST-Zustand, zwei Kanäle (Glyphe + Text), Farbe keiner davon. */
/** `labelKey` ist bei „hiding“ die Basis einer Zählform (`.one`/`.many`, siehe `tn` in strings.ts). */
export function ribbonState(hiddenCount: number, revealed: boolean): { icon: "eye" | "eye-off"; labelKey: "ribbon.hiding" | "ribbon.revealed"; count: number } {
  return revealed
    ? { icon: "eye", labelKey: "ribbon.revealed", count: hiddenCount }
    : { icon: "eye-off", labelKey: "ribbon.hiding", count: hiddenCount };
}
