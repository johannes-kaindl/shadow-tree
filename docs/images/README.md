# Recording contract — README images

This folder holds the images that `README.md` and `README.de.md` embed. This file is the **contract**: which images exist, what each must show, which class it belongs to, and how to record them again reproducibly. `readme_lint.py` (workspace tool, run as `npm run shots:check`) compares contract ↔ files ↔ README embeds.

The plugin has no view of its own: three images show Obsidian's file explorer in the fixture vault, one shows the settings tab. Since Obsidian 1.13 the settings tab is a window of its own; the recipe captures it through a second CDP connection.

## Status

**2026-09-30: recording in progress** in a second Obsidian instance (own profile `/tmp/obs-test-shadow-tree`, port 9350, Obsidian 1.14.3, English interface, light theme) against the fixture vault in `../../fixtures/vault/` (the same fixture the GUI smoke uses; one fixture, one truth). Every image is looked at after recording.

## Images

| Datei | Klasse | referenziert von | muss zeigen |
| --- | --- | --- | --- |
| `hero.png` | hero | README (oben) | The main window with the file explorer, all folders expanded: `Welcome.md`, `repo-deep` down to `a/b/c/deep-note.md`, `repo-notes` with `README.md` and `docs/guide.md`. **Not drawn:** `repo-empty`, `repo-notes/node_modules`, `repo-notes/dist`. The ribbon shows the crossed-out eye. A note is open on the right so the image is not an empty pane. Must explain without a caption that folders are filtered, not deleted. |
| `revealed.png` | feature | README § Features | The same explorer after the toggle: `repo-empty` (with `src`), `repo-notes/node_modules` and `repo-notes/dist` are drawn again; the ribbon shows the open eye. The claim: one click brings everything back. |
| `settings.png` | feature | README § Features | The settings window, top part: the **Help** row, the **Rules** group (Hide empty folders on, Relevant file types `md, canvas, base`, Ignore patterns with the defaults) and, scrolled into view, **Currently hidden** with the three folders and their reasons (`empty`, `pattern node_modules`, `pattern dist`). |
| `context-menu.png` | feature | README § Features | The folder context menu opened on `repo-notes/docs` in the explorer, with the two entries **Shadow Tree: always show** and **Shadow Tree: always hide** visible among Obsidian's own entries. |

## Fixture and recipe

- Fixture: `fixtures/vault/notes/` (three example repositories, generic English content) and `fixtures/vault/obsidian/` (only this plugin enabled, light theme).
- The plugin's own data is the **delivery state**: no pins, default patterns. The recipe toggles the reveal switch for `revealed.png` and switches it back.

```bash
npm run build && npm run shots -- --setup        # build the vault from the fixture
# start the second instance with that vault and English interface (obsidian.json "language": "en" AND
# localStorage["language"] = "en"), own --user-data-dir, own debug port 9350
npm run shots -- --port 9350 [--only hero|revealed|settings|context-menu]
npm run shots:check                              # must report no findings
```

The recipe sets the main window to 1200×760 and aborts with a message if the interface language is not English.
