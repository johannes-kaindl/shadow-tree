# Getting started

This walk-through takes you from installing Shadow Tree to a vault whose file explorer shows only the folders that hold notes, plus one pin you set yourself. It takes about five minutes. It assumes a vault with at least one folder that has no notes in it; a folder full of code repositories is the typical case.

## 1. Install and enable

Install the plugin by one of the ways in the [README](https://github.com/johannes-kaindl/shadow-tree#install): the sideloader catalog, or by hand (put `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/shadow-tree/`). Then enable **Shadow Tree** under **Settings → Community plugins**.

The moment it is enabled, folders disappear from the file explorer. Two kinds go: folders with no Markdown, Canvas or Base file anywhere below them, and folders matching one of the default ignore patterns (`node_modules`, `dist`, `build`, `coverage`, `__pycache__`). Folders that contain a note stay, and so does the whole path down to a note, however deep.

## 2. See everything again

In the left ribbon there is a new icon: a crossed-out eye. Its tooltip reads **Shadow Tree: hiding N folder(s) — click to reveal**. Click it. Every hidden folder is drawn again and the icon turns into an open eye. Click once more to hide them again.

The same switch exists as the command **Shadow Tree: Toggle hidden folders**, so you can put it on a hotkey. It is a session switch: when Obsidian restarts, folders are hidden again.

## 3. Find out why a folder is gone

Open **Settings → Shadow Tree**. The first row is **Help**, with a button to this documentation and a bug icon for reporting issues. Below **Rules** you find the three rules; further down, **Currently hidden** lists every folder that is hidden right now, each with its reason: **empty**, **pattern node_modules** (the pattern that matched), or **pinned**.

Only the topmost hidden folder of a branch is listed. A `node_modules` folder hides everything below it, so its thousands of subfolders do not appear.

## 4. Set your first pin

Reveal everything with the ribbon icon, then right-click a folder that is normally hidden. The context menu offers **Shadow Tree: always show** and **Shadow Tree: always hide**. Choose **always show**: the folder stays visible from now on, and so do its parents, no matter what the rules say. Hide the others again with the ribbon icon; your pinned folder remains.

To remove the pin, right-click the folder again and choose **Shadow Tree: remove pin (currently: Always show)**, or delete it under **Pinned folders** in the settings. That group also has an **Add** row for pinning a folder by path, which is the way to pin a folder you cannot see.

## 5. Tune the rules

Under **Rules** you can turn **Hide empty folders** off if you only want pattern-based hiding, change **Relevant file types** (for example add `pdf` so a folder of PDFs stays visible), and edit **Ignore patterns**, one rule per line. The syntax is described in [Ignore patterns](ignore-patterns.md). Every change applies immediately; **Currently hidden** shows the result.

## 6. Optional: keep Obsidian Sync in step

If you use Obsidian Sync and do not want the hidden folders on your other devices, turn on **Also exclude hidden folders from Obsidian Sync** at the bottom of the settings. The plugin writes the currently hidden folders into Sync's excluded folders (the same list as **Settings → Sync → Selective sync → Excluded folders**) and removes them again when they become visible or when you turn the switch off. Folders you excluded yourself are never touched. The switch is disabled when Sync is off or not connected to a remote vault; the status line below it says which.
