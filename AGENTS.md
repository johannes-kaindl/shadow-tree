# AGENTS.md

Orientierung für KI-Agenten (Claude Code, Codex, …) und Mitwirkende an diesem Repository. Workspace-weite Standards (comply-or-explain): siehe [`../../workspace/_docs/CONVENTIONS.md`](../../workspace/_docs/CONVENTIONS.md) (maintainer-lokal, nicht Teil dieses Repos — ignorieren, falls im Klon nicht vorhanden).

**Profil:** `ts-node` · `obsidian-plugin`.

**Stand 2026-09-30: 0.1.0 gebaut, noch nicht released.** Alle 14 Tasks des Plans umgesetzt: purer Kern (Muster-Matcher, Evaluator, Settings, Sync-Plan, Entpreller, ViewModel), Obsidian-Hülle (Snapshot, Hide-Sheet, Sync-Fassade, Kontextmenü, Settings-Tab), GUI-Smoke 10/11 (G2 Sync-Schreibpfad „nichts gemessen“, kein Sync-Konto im Staging-Vault). Spec und Plan liegen im Coding-Cockpit (`25_Coding/shadow-tree/_SDD/`, CORE-META-14). Für neue Vorhaben gilt: erst Kit-first-Sondierung (`../AGENTS.md` + `../REGISTRY.md`), dann `superpowers:brainstorming` → Spec → Plan → TDD.

## Project character

**Projekt:** `shadow-tree` — Obsidian-Plugin, das Ordner im Datei-Explorer ausblendet, unter denen keine relevante Datei liegt oder die ein Ignore-Muster in `.gitignore`-Art trifft; Pins je Ordner übersteuern, ein Sitzungsschalter zeigt alles, ein Opt-in schreibt die ausgeblendeten Ordner in die Ausschlussliste von Obsidian Sync. Nichts wird gelöscht oder verschoben; das Plugin ist kosmetisch. Autor: Johannes Kaindl.

**Kit-first-Befund:** Das Ausblenden eines Ordners ist im Kit gelöst (`obsidian-kit` `folder-hide` seit 0.42.0; Konsumenten vault-rag, slide-deck, vault-crews). Shadow Tree ist der erste Konsument mit einer **berechneten Menge**; dafür nimmt `buildHideCss`/`installFolderHide` seit Kit 0.46.0 `string | string[]` (Entscheidung Dach-Master 2026-09-30, noch am selben Abend getaggt und hier vendort).

## Architecture principles

**PROF-OBS-03/04 — reiner Kern ohne `obsidian`-Import.** `src/core/` ist obsidian-frei und in Node ohne DOM testbar; nur `main.ts` und `src/obsidian/` importieren `obsidian`. `npm run check:pure` nagelt das fest.

**Ein Stylesheet statt DOM-Manipulation.** Der Evaluator liefert die obersten ausgeblendeten Ordner; daraus entsteht ein Constructable Stylesheet am Hauptfenster (`app.workspace.rootSplit.doc`) mit einer `data-path`-Regel je Ordner. Kein `MutationObserver`, kein `<style>`-Element (Store-Lint), kein `:has()` (Mobile).

**Vendoring statt Dependency.** Geteilte Bausteine aus `obsidian-kit` und `code-kit` liegen als Snapshot unter `src/vendor/kit/` (pure) und `src/vendor/kit-obsidian/`, je mit Herkunfts-Header in Zeile 1 und `VENDOR.json`. Nie von Hand editieren — Re-Vendoring über `sh tools/sync-kit.sh` (Konfiguration `tools/kit-sync.json`).

```
src/core/tree.ts          FolderNode — purer Eingabebaum
src/core/ignore.ts        parsePatterns / matchIgnore / normalizeFolderPath (.gitignore-Art, nur Ordner)
src/core/evaluate.ts      evaluate(tree, rules) → HiddenFolder[] (oberste Ordner mit Grund; Show-Pin schützt Vorfahren)
src/core/settings.ts      ShadowTreeSettings, loadSettings (Feldreparatur), withPin/pinOf, parseExtensions
src/core/sync-plan.ts     planSyncExclusions(current, managed, desired) — fremde Einträge bleiben
src/core/debounce.ts      createDebouncer mit injizierten Timern
src/core/hidden-view.ts   hiddenView / ribbonState (State → ViewModel, UI-STANDARD §6)
src/obsidian/tree-snapshot.ts   TFolder → FolderNode
src/obsidian/sync-exclude.ts    syncFacade — interne Sync-API mit Existenz-Guards
src/obsidian/folder-menu.ts     addPinMenuItems (file-menu)
src/obsidian/settings-tab.ts    deklarativer Tab (getSettingDefinitions) + Kit-Walker-Fallback, Hilfe-Zeile zuerst
src/i18n/strings.ts             alle Texte EN/DE (UI-STANDARD §10), `tn` für Zählformen (.one/.many)
src/main.ts                     onload: Settings, Scheduler, Sheet, Ribbon, Command, Menü, Tab
fixtures/vault/                 Fixture für GUI-Smoke und README-Bilder (drei Beispiel-Repos)
scripts/gui-smoke.ts            CDP-Treiber (Zweitinstanz Port 9350), docs/SMOKE.md
scripts/shots.ts                README-Bilder (Skill readme-shots), Vertrag docs/images/README.md
```

## Commands

- `npm run gate` — lint + typecheck + typecheck:test + typecheck:scripts + test + check:pure + build; Pflicht vor jedem Commit.
- `npm run deploy` — Build + Kopie nach `$OBSIDIAN_PLUGIN_DIR`.
- `npm run smoke:gui -- --setup` baut den Staging-Vault (`$STAGING_VAULTS_DIR/shadow-tree`), `npm run smoke:gui -- --port 9350` fährt den Smoke gegen die Zweitinstanz (Rezept im Dateikopf).
- `npm run shots -- --setup` / `npm run shots -- --port 9350 [--only <bild>]` — README-Bilder; `npm run shots:check` prüft Vertrag ↔ Dateien ↔ README.
- `sh tools/sync-kit.sh [--check]` — Kit-Vendoring aus `../obsidian-kit` und `../../libs/code-kit` (Pins in `tools/kit-sync.json`).

## Conventions

- `src/core` ist obsidian-frei (`npm run check:pure`).
- Texte ausschließlich in `src/i18n/strings.ts`, EN kanonisch, DE vollständig; `tests/strings.test.ts` prüft die Schlüsselmengen.
- CSS-Präfix `sht-`, nur Theme-Variablen, kein `!important`, kein `:has()` (UI-STANDARD §3).
- Zustands-Knopf (Ribbon) nach UI-STANDARD §8: Icon `eye-off` ↔ `eye`, Tooltip nennt den Ist-Zustand, `aria-pressed`.
- Vendorte Dateien nie von Hand editieren; `eslint.overrides.mjs` klammert `src/vendor/**` aus.
- Markdown-Dateien: ein Absatz je Zeile (Jays Regel seit 2026-09-19).

## Gotchas

- **Das Ausblende-Blatt kommt aus dem vendorten `kit-obsidian/folder-hide` (0.46.0, Listenform).** `update(paths, true)` mit leerer Liste ergibt ein leeres Blatt; das ist der Weg für „alles einblenden“.
- **Inhalt eines per Muster oder Hide-Pin ausgeblendeten Kindes zählt für den Vorfahren nicht** (`gather` in `evaluate.ts`), sonst hielte `node_modules/…/README.md` ein Repo ohne eigene Notizen sichtbar. Ein Show-Pin darunter zählt weiter (Review 2026-09-30, Befund 1).
- **In die Sync-Ausschlussliste wandern nur `pattern`- und `pinned`-Treffer, nie `empty`** — ein leerer Ordner kann Anhänge tragen, und ein auf Gerät B leerer Ordner bekäme dort nie die Notizen von Gerät A (Review 2026-09-30, Befund 3). Beim Deaktivieren des Plugins bleiben eigene Einträge stehen; die Schalter-Beschreibung sagt das.
- **Text- und Textarea-Felder speichern bei `blur`**, nicht je Tastendruck: jedes Speichern rechnet neu und baut den Tab um (Review 2026-09-30, Befund 2). Ob `update()` des nativen 1.13-Hosts nach `setPin` frisch zeichnet, ist ungemessen (Backlog-Task).
- **Die Sync-Fassade nutzt eine interne API** (`app.internalPlugins.plugins.sync.instance.setIgnoreFolders`, gemessen an obsidian-1.14.3.asar). Ohne Konto ist das Core-Plugin `enabled`, aber `vaultId` ist `null` und `getStatus()` meldet `disconnected` → Zustand `no-account`, Schalter gesperrt. Ändert Obsidian die Form, liefert `syncFacade` `no-api`, nichts bricht.
- **`applySync` speichert über `saveData`, nie über `saveSettings`** — `saveSettings` ruft `recompute`, das den Sync-Entpreller erneut stellt: Endlosschleife.
- **Der Ribbon-Zustand „alles einblenden“ ist Sitzungszustand**, nicht in `data.json`. Absicht (Spec § 6).
- **`normalizeFolderPath` entfernt führende Slashes, das Kit-`normalizeFolder` nicht.** Pins und Muster laufen durch die eigene Funktion; die Kit-Funktion bleibt unverändert im Vendor-Modul.
- **Im GUI-Smoke rendert der Explorer eingeklappte Kinder nicht**; `expand()` klappt über `view.fileItems[path].setCollapsed(false)` auf, sonst per Klick. Die Oberflächensprache der Zweitinstanz war beim ersten Lauf Deutsch; der Treiber prüft EN- und DE-Texte.
- **Das Einstellungen-Fenster (ab 1.13 eigenes Fenster) schließt nur `app.setting.close()` im Hauptfenster**; die CDP-Verbindung zu schließen lässt es offen und verdeckt den Explorer (H-Prüfpunkt maß `modal-bg`).

## Memory

- 2026-09-30: Design-Session (Fable) mit Johannes: Brainstorming → Spec → Plan im Cockpit; Entscheidungen B/B/C/Ansatz 1 (Spec § 2). Autonome Umsetzung Tasks 1–14, Gate 63/63, GUI-Smoke 10/11 mit Gegenprobe rot an A, D, E, F, G. Kit-Vertragsfrage an den Dach-Master gemeldet, entschieden und als Kit 0.46.0 getaggt; vendort, `hide-sheet.ts` gelöscht. Whole-Branch-Review (Sonnet): sechs Important-Befunde eingearbeitet (Evaluator zählt Inhalt ausgeblendeter Kinder nicht mehr; Sync nur pattern/pinned; Live-Sync-Status; blur-Commit; Unload-Guard; Doku-Korrekturen), Gate 65/65.

## Abweichungen von der Leitkonvention

Keine bekannt (Stand 2026-09-30).
