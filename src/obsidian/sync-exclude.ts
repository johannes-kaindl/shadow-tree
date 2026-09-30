import type { App } from "obsidian";

/** Fassade auf die Ausschlussliste des Sync-Core-Plugins (Spec § 7).
 *
 *  ⚠️ INTERNE API OHNE VERTRAG — gemessen an obsidian-1.14.3.asar (2026-09-30): die Sync-Instanz hält
 *  `filter.ignoreFolders: string[]` (Vault-relative Pfade ohne abschließenden Slash) und
 *  `setIgnoreFolders(paths)` ruft `changeFilter`, `forceSaveData` und `requestSync` — derselbe Aufruf, den der
 *  Dialog „Manage excluded folders“ benutzt. Ändert ein Obsidian-Update die Form, liefert `syncFacade`
 *  `no-api`, und das Plugin arbeitet ohne Sync-Ausschluss weiter; nichts bricht. */
export type SyncUnavailable = "no-plugin" | "disabled" | "no-api";
export type SyncFacade =
  | { available: true; getIgnoreFolders(): string[]; setIgnoreFolders(paths: string[]): void }
  | { available: false; reason: SyncUnavailable };

interface SyncInstanceShape { filter: { ignoreFolders: string[] }; setIgnoreFolders(paths: string[]): void; }

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asInstance(x: unknown): SyncInstanceShape | null {
  if (!isRecord(x) || typeof x.setIgnoreFolders !== "function") return null;
  const filter = x.filter;
  if (!isRecord(filter) || !Array.isArray(filter.ignoreFolders)) return null;
  return x as unknown as SyncInstanceShape;
}

export function syncFacade(app: App): SyncFacade {
  const internal = (app as unknown as { internalPlugins?: unknown }).internalPlugins;
  const plugins = isRecord(internal) ? internal.plugins : undefined;
  const sync = isRecord(plugins) ? plugins.sync : undefined;
  if (!isRecord(sync)) return { available: false, reason: "no-plugin" };
  if (sync.enabled !== true) return { available: false, reason: "disabled" };
  const instance = asInstance(sync.instance);
  if (instance === null) return { available: false, reason: "no-api" };
  return {
    available: true,
    getIgnoreFolders: () => instance.filter.ignoreFolders.filter((p): p is string => typeof p === "string").slice(),
    setIgnoreFolders: (paths) => { instance.setIgnoreFolders(paths); },
  };
}
