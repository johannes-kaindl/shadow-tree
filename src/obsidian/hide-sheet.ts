// abgeleitet aus obsidian-kit/src/obsidian/folder-hide.ts @0.45.1, 2026-09-30 — Liste statt Einzelordner.
// Kit-Entscheidung des Dach-Masters (2026-09-30): buildHideCss/installFolderHide nehmen ab Kit 0.46.0
// `string | string[]`; danach wird diese Datei durch das vendorte Modul ersetzt.
/** Hängt das Ausblende-Stylesheet für eine LISTE von Ordnern an ein Dokument — per Constructable
 *  Stylesheet, weil ein `<style>`-Element die Store-Lint-Regel `no-forbidden-elements` verletzt.
 *
 *  Dokument ist das Hauptfenster (`app.workspace.rootSplit.doc`), nicht `activeDocument` (Pop-out-Falle,
 *  gemessen in slide-deck). Das Blatt entsteht mit dem Konstruktor des ZIEL-Dokuments, sonst
 *  `NotAllowedError` über Realm-Grenzen. Kosmetisch: ohne Constructable Stylesheets (iOS < 16.4) ist der
 *  Griff ein No-op, Fehler gehen an `onError` statt nach oben. */
import { buildHideCss } from "../vendor/kit/folder-hide";

export interface HideSheetHandle {
  /** `false` ohne Constructable Stylesheets — dann bleiben alle Ordner sichtbar. */
  readonly supported: boolean;
  update(paths: readonly string[]): void;
  remove(): void;
}

export function buildHideCssMany(paths: readonly string[]): string {
  return paths.map((p) => buildHideCss(p, true)).filter((css) => css !== "").join("\n");
}

export function installHideSheet(doc: Document, paths: readonly string[], onError: (e: unknown) => void = () => {}): HideSheetHandle {
  const Sheet = doc.defaultView?.CSSStyleSheet;
  const supported = !!Sheet && "replaceSync" in Sheet.prototype && "adoptedStyleSheets" in doc;
  let sheet: CSSStyleSheet | null = null;

  const update = (list: readonly string[]): void => {
    if (!supported || !Sheet) return;
    try {
      if (sheet === null) {
        sheet = new Sheet();
        doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      }
      sheet.replaceSync(buildHideCssMany(list));
    } catch (e) {
      onError(e);
    }
  };

  const remove = (): void => {
    if (sheet === null) return;
    const own = sheet;
    sheet = null;
    try {
      doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((s) => s !== own);
    } catch (e) {
      onError(e);
    }
  };

  update(paths);
  return { supported, update, remove };
}
