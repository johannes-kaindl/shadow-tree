/** Plant die Sync-Ausschlussliste (Spec § 7): Einträge, die nicht von Shadow Tree stammen, bleiben immer;
 *  die eigenen werden durch `desired` ersetzt. `managed` im Ergebnis sind nur die Pfade, die WIR neu beitragen —
 *  ein Pfad, den der Nutzer schon selbst ausgeschlossen hatte, wird nie unser Eigentum. Ein Pfad unter einem anderen
 *  Eintrag (fremd oder gewünscht) wird nicht eingetragen: Sync schließt `ordner/…` über `startsWith("ordner/")` aus
 *  (app.js 1.14.5, `_allowSyncFile`), der Kindeintrag wäre nur Ballast — jeder Eintrag kostet Sync bei jeder Datei eine Prüfung. */
export interface SyncPlan { next: string[]; managed: string[]; changed: boolean; }

function uniq(xs: readonly string[]): string[] { return [...new Set(xs)]; }

/** Liegt ein echter Vorfahre von `path` (an Pfadgrenzen, nicht an Namenspräfixen) in `set`? Bewusst roh und exakt wie Syncs
 *  Filter (`startsWith(eintrag + "/")`, ohne Unicode-Normalisierung und ohne Groß-/Kleinschreibung): `folder-scope` aus code-kit
 *  normalisiert nach NFC und würde einen Eintrag als überflüssig streichen, den Sync selbst nicht als Elternordner liest. */
function hasAncestorIn(path: string, set: ReadonlySet<string>): boolean {
  for (let i = path.indexOf("/"); i !== -1; i = path.indexOf("/", i + 1)) {
    if (set.has(path.slice(0, i))) return true;
  }
  return false;
}

export function planSyncExclusions(current: readonly string[], managed: readonly string[], desired: readonly string[]): SyncPlan {
  const managedSet = new Set(managed);
  const own = uniq(current).filter((c) => !managedSet.has(c));
  const ownSet = new Set(own);
  const wanted = uniq(desired);
  const coverSet = new Set([...own, ...wanted]);
  const add = wanted.filter((d) => !ownSet.has(d) && !hasAncestorIn(d, coverSet));
  const next = [...own, ...add];
  const before = new Set(current);
  const after = new Set(next);
  const changed = before.size !== after.size || [...after].some((x) => !before.has(x));
  return { next, managed: add, changed };
}
