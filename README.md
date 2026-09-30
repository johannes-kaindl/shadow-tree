# Shadow Tree

> 🇬🇧 English · [🇩🇪 Deutsch](https://github.com/johannes-kaindl/shadow-tree/blob/main/README.de.md)

**Hides empty and irrelevant folders from the file explorer without deleting them: ignore patterns, per-folder pins, optional Sync exclusion.**

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Docs: CC BY-SA 4.0](https://img.shields.io/badge/docs-CC%20BY--SA%204.0-lightgrey.svg)](LICENSE-DOCS)
[![Release](https://img.shields.io/github/v/release/johannes-kaindl/shadow-tree?label=release)](https://github.com/johannes-kaindl/shadow-tree/releases)
![Platform](https://img.shields.io/badge/platform-Obsidian%201.11.4%2B%20%C2%B7%20desktop%20%26%20mobile-7c3aed)

Open a folder full of code repositories as a vault and the file explorer fills up with `node_modules`, build output and folders that never held a note. Shadow Tree filters that view. A folder disappears from the file explorer when nothing below it counts as content (by default Markdown, Canvas and Base files) or when an ignore pattern in `.gitignore` style matches it. Nothing is deleted, moved or renamed: the folders are still there, they are just not drawn. One click on the ribbon icon shows everything again.

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/hero.png" width="820" alt="Obsidian's file explorer with Shadow Tree active: the vault shows Welcome.md, repo-deep with its single note three folders down, and repo-notes with README and docs, while repo-empty, node_modules and dist are not drawn; the ribbon shows the eye-off icon">

## Features

- **Empty folders vanish** — a folder is empty when no file of a relevant type exists anywhere below it. Which types are relevant is a setting (`md, canvas, base` by default), so a folder that only holds images or code disappears.
- **Ignore patterns like a `.gitignore`** — one rule per line: `node_modules` matches at any depth, `repo-a/dist` is anchored at the vault root, `*` stays inside a folder name, `**` crosses folders, `!` undoes an earlier rule. Matching folders are hidden even if they contain notes. Defaults: `node_modules`, `dist`, `build`, `coverage`, `__pycache__`.
- **Pins per folder** — right-click any folder and choose **Shadow Tree: always show** or **always hide**. "Always show" also keeps the folder's parents visible; pins beat every rule.
- **One switch to see everything** — the ribbon icon (or the command **Toggle hidden folders**) reveals all hidden folders for this session. The icon and its tooltip name the current state.
- **You can see why** — the settings tab lists what is hidden right now and why: empty, which pattern, or pinned.
- **Optional: exclude from Obsidian Sync** — an opt-in switch writes the hidden folders into Obsidian Sync's excluded folders and removes them again when they reappear. Folders you excluded yourself are never touched.

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/revealed.png" width="820" alt="The same vault after the toggle: repo-empty, node_modules and dist are drawn again and the ribbon shows the eye icon">

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/settings.png" width="820" alt="The Shadow Tree settings tab: the Help row, the Rules group with Hide empty folders, Relevant file types and Ignore patterns, and the Currently hidden list with three folders and their reasons">

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/context-menu.png" width="820" alt="The folder context menu in the file explorer with the two entries Shadow Tree: always show and Shadow Tree: always hide">

## Requirements

- **Obsidian 1.11.4+**, desktop and mobile. On iOS older than 16.4 the stylesheet cannot be applied and folders stay visible; the settings tab says so.
- Nothing else. The plugin makes no network requests and reads only your vault's folder tree.

## Install

### Plugin catalog (recommended)

Install [AnySource Sideloader](https://git.jkaindl.de/jkaindl/anysource-sideloader), add the catalog `https://git.jkaindl.de/jkaindl/obsidian-catalog/raw/branch/main/catalog.json`, then install **Shadow Tree** from it and enable it under **Settings → Community plugins**.

### Manual

Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/johannes-kaindl/shadow-tree/releases), put them into `<vault>/.obsidian/plugins/shadow-tree/`, then enable **Shadow Tree** under **Settings → Community plugins**.

### From source

```bash
git clone https://github.com/johannes-kaindl/shadow-tree
cd shadow-tree && npm install && npm run build
# copy main.js, manifest.json and styles.css into <vault>/.obsidian/plugins/shadow-tree/
```

## Usage

1. Enable the plugin. Folders without notes and folders matching the default patterns disappear from the file explorer right away.
2. Click the **eye** icon in the ribbon (or run **Shadow Tree: Toggle hidden folders**) to see everything; click again to hide. This is a session switch: after a restart the folders are hidden again.
3. Right-click a folder and pick **Shadow Tree: always show** or **Shadow Tree: always hide**. The same menu removes the pin later. Hidden folders cannot be right-clicked, so reveal them first or add the pin in the settings.
4. Open **Settings → Shadow Tree** to change the relevant file types, edit the ignore patterns, manage pins, and read **Currently hidden** when you wonder where a folder went.

### Configuration

| Setting | Effect | Default |
|---|---|---|
| Hide empty folders | Hides folders with no relevant file anywhere below them. | on |
| Relevant file types | Extensions that count as content, separated by commas or spaces. | `md, canvas, base` |
| Ignore patterns | One rule per line in `.gitignore` style; matching folders are hidden even with notes inside. See [Ignore patterns](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/ignore-patterns.md). | `node_modules`, `dist`, `build`, `coverage`, `__pycache__` |
| Pinned folders | Per-folder overrides: **Always show** or **Always hide**. Added from the folder context menu or here. | none |
| Also exclude hidden folders from Obsidian Sync | Writes the hidden folders into Sync's excluded folders (per device) and removes them again later. Disabled when Sync is off or not connected to a remote vault. | off |

## How it works

The plugin never touches the DOM of the file explorer. It reads the vault's folder tree through the Obsidian API, computes the topmost hidden folders, and installs one stylesheet (a Constructable Stylesheet on the main window) with one rule per hidden folder, keyed on the folder's `data-path` attribute. The tree is recomputed a quarter second after the last create, delete or rename. Because the plugin only hides, the worst case of an Obsidian update that changes the explorer's markup is that folders reappear; nothing is lost. The code layout is described in [`AGENTS.md`](https://github.com/johannes-kaindl/shadow-tree/blob/main/AGENTS.md).

## Limits

- **Search, quick switcher and graph** still see notes inside hidden folders. Use Obsidian's own **Files and links → Excluded files** for that.
- **Dot folders** such as `.obsidian` are never shown by Obsidian's file explorer; the plugin cannot reveal them.
- **Only folders** are hidden, never single files.
- **Sync exclusion is per device.** Obsidian Sync keeps its excluded folders on each device; the plugin writes the list of the device it runs on. The exclusion list is an internal part of the Sync core plugin without a public API; if a future Obsidian version changes it, the switch turns itself off and says so.

## Documentation

- [Documentation index](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/README.md)
- [Getting started](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/getting-started.md) — from installation to your first pin
- [Ignore patterns](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/ignore-patterns.md) — the syntax, with examples
- [Troubleshooting](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/troubleshooting.md) — a folder is visible or hidden when it should not be

## Contributing

Issues and pull requests on [GitHub](https://github.com/johannes-kaindl/shadow-tree/issues). Test-driven (`npm run gate`); see [`AGENTS.md`](https://github.com/johannes-kaindl/shadow-tree/blob/main/AGENTS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

- **Code:** AGPL-3.0-or-later ([`LICENSE`](LICENSE)).
- **Docs/Text:** CC BY-SA 4.0 ([`LICENSE-DOCS`](LICENSE-DOCS)).

Copyright © 2026 Johannes Kaindl.
