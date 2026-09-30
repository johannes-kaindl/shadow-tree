# GUI smoke checklist (maintainer material)

Runs with `npm run smoke:gui -- --port 9350` against a second Obsidian instance with its own profile (recipe in the header of `scripts/gui-smoke.ts`; Dach-AGENTS.md § Staging-Vaults). The fixture vault is `fixtures/vault/` and is rebuilt by `npm run smoke:gui -- --setup`.

## Check points

| # | What is measured | How |
|---|---|---|
| 0 | Plugin loaded, restricted mode of a fresh profile lifted | `app.plugins.plugins["shadow-tree"]` exists after `setEnable(true)` |
| A | `repo-empty` (only `src/index.ts`) is hidden | `getComputedStyle(.nav-folder-title[data-path="repo-empty"]).display === "none"` |
| B | `repo-notes/node_modules` is hidden although it contains a README; `repo-notes` and `repo-notes/docs` stay visible | folder expanded, display values compared |
| B2 | `repo-notes/dist` is hidden by the default pattern `dist` | display none |
| C | `repo-deep` down to `a/b/c` (one note three levels down) stays visible | display of `repo-deep` and `repo-deep/a/b/c` |
| D | pin "always show" on `repo-empty` reveals it, removing the pin hides it again | `plugin.setPin(...)`, display polled |
| E | toggle command reveals everything, ribbon tooltip names the state, `aria-pressed` flips, second toggle hides again | `executeCommandById("shadow-tree:toggle-hidden-folders")` |
| F | creating a note in `repo-empty` reveals it, trashing the note hides it again | `vault.create` / `fileManager.trashFile`, display polled up to 5 s |
| H | occlusion probe: `elementFromPoint` on the `repo-notes` title hits the title row | run before G so no settings window covers it |
| G | settings tab: help row first, "Currently hidden" names 3 folders, the Sync status line shows one of its states | settings window attached via CDP |
| G2 | Sync write path (`setIgnoreFolders`) | **not measured** in the fixture vault (no Sync account); acceptance happens in a vault with an active Sync account |

The counter-probe disables the empty-folder rule in `src/core/evaluate.ts` (`if (false && rules.hideEmpty …)`), redeploys and restarts the second instance. Expected red: A, D, E (count 2 instead of 3), F, G; expected green: 0, B, B2, C, H.

## Runs

| Date | Obsidian | Result | Counter-probe | Notes |
|---|---|---|---|---|
| 2026-09-30 | 1.14.3 (second instance, profile `/tmp/obs-test-shadow-tree`, port 9350) | 10 green · 0 red · 0 skipped · 1 not measured (G2), denominator 11 | red at A, D, E, F, G; green at 0, B, B2, C, H — as expected | First run had 3 driver errors (UI language was German, H ran with the settings window open): fixed in the driver, not the plugin. The counter-probe showed that B2 measures the `dist` pattern, not emptiness; the label was corrected. |
