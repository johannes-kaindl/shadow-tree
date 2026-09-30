import { mergeSettings } from "../vendor/kit/settings";
import { normalizeFolderPath } from "./ignore";

export type PinState = "show" | "hide";

export interface ShadowTreeSettings {
  version: 1;
  hideEmpty: boolean;
  /** Rohtext des Feldes, z. B. "md, canvas, base" — geparst über parseExtensions. */
  relevantExtensions: string;
  /** Rohtext, eine Regel je Zeile — geparst über parsePatterns. */
  ignorePatterns: string;
  pins: Record<string, PinState>;
  /** Opt-in: ausgeblendete Ordner auch aus Obsidian Sync ausschließen (Spec § 7). */
  syncExclude: boolean;
  /** Was Shadow Tree zuletzt in die Sync-Ausschlussliste eingetragen hat — nur diese werden je entfernt. */
  syncManaged: string[];
}

export const DEFAULT_PATTERNS = "node_modules\ndist\nbuild\ncoverage\n__pycache__";

export const DEFAULT_SETTINGS: ShadowTreeSettings = {
  version: 1,
  hideEmpty: true,
  relevantExtensions: "md, canvas, base",
  ignorePatterns: DEFAULT_PATTERNS,
  pins: {},
  syncExclude: false,
  syncManaged: [],
};

/** Komma oder Leerzeichen getrennt, klein, ohne führende Punkte, eindeutig, leere raus. */
export function parseExtensions(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[\s,]+/)) {
    const ext = part.trim().replace(/^\.+/, "").toLowerCase();
    if (ext !== "" && !out.includes(ext)) out.push(ext);
  }
  return out;
}

function sanitizePins(raw: unknown): Record<string, PinState> {
  const out: Record<string, PinState> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const path = normalizeFolderPath(k);
    if (path !== "" && (v === "show" || v === "hide")) out[path] = v;
  }
  return out;
}

/** mergeSettings hebt fehlende Felder auf Defaults; danach wird jedes Feld einzeln auf seinen Typ geprüft,
 *  damit ein kaputtes Feld nur sich selbst zurücksetzt (CORE-DATA-01: nicht still alles verwerfen). */
export function loadSettings(raw: unknown): ShadowTreeSettings {
  const merged = mergeSettings(DEFAULT_SETTINGS, raw);
  const src = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    ...merged,
    version: 1,
    hideEmpty: typeof src.hideEmpty === "boolean" ? src.hideEmpty : DEFAULT_SETTINGS.hideEmpty,
    relevantExtensions: typeof src.relevantExtensions === "string" ? src.relevantExtensions : DEFAULT_SETTINGS.relevantExtensions,
    ignorePatterns: typeof src.ignorePatterns === "string" ? src.ignorePatterns : DEFAULT_SETTINGS.ignorePatterns,
    pins: sanitizePins(src.pins),
    syncExclude: typeof src.syncExclude === "boolean" ? src.syncExclude : false,
    syncManaged: Array.isArray(src.syncManaged)
      ? src.syncManaged.filter((x): x is string => typeof x === "string").map(normalizeFolderPath).filter((x) => x !== "")
      : [],
  };
}

export function withPin(s: ShadowTreeSettings, path: string, state: PinState | null): ShadowTreeSettings {
  const p = normalizeFolderPath(path);
  if (p === "") return s;
  const pins = { ...s.pins };
  if (state === null) delete pins[p]; else pins[p] = state;
  return { ...s, pins };
}

export function pinOf(s: ShadowTreeSettings, path: string): PinState | undefined {
  return s.pins[normalizeFolderPath(path)];
}
