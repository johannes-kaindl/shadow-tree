/** Plant die Sync-Ausschlussliste (Spec § 7): Einträge, die nicht von Shadow Tree stammen, bleiben immer;
 *  die eigenen werden durch `desired` ersetzt. `managed` im Ergebnis sind nur die Pfade, die WIR neu beitragen —
 *  ein Pfad, den der Nutzer schon selbst ausgeschlossen hatte, wird nie unser Eigentum. */
export interface SyncPlan { next: string[]; managed: string[]; changed: boolean; }

function uniq(xs: readonly string[]): string[] { return [...new Set(xs)]; }

export function planSyncExclusions(current: readonly string[], managed: readonly string[], desired: readonly string[]): SyncPlan {
  const managedSet = new Set(managed);
  const own = uniq(current).filter((c) => !managedSet.has(c));
  const ownSet = new Set(own);
  const add = uniq(desired).filter((d) => !ownSet.has(d));
  const next = [...own, ...add];
  const before = new Set(current);
  const after = new Set(next);
  const changed = before.size !== after.size || [...after].some((x) => !before.has(x));
  return { next, managed: add, changed };
}
