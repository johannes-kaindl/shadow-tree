# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (without a `v` prefix).

## [Unreleased]

## [0.1.3] — 2026-10-27

### Fixed

- Sync exclusion no longer misses `node_modules`, `__pycache__`, `dist` and the like that lie below a folder hidden only because it is empty. With “Hide empty folders” on, such a parent (a `scripts` folder without notes, say) swallowed every pattern folder below it, so in a real vault with 1,784 hidden folders only 98 of the 1,456 pattern folders reached Obsidian Sync's list. The empty parent itself still stays out of the list, because it may hold attachments.

### Added

- A how-to guide, “Keep Sync small”, for a full Obsidian Sync storage: how to find the weight, when to switch off a file type in Sync and when to exclude output folders with the plugin, and what neither lever removes from the remote vault.

## [0.1.2] — 2026-10-23

### Fixed

- The Sync status line no longer reports folders as excluded that Obsidian Sync did not keep: after each write the plugin reads Sync's exclusion list back, counts only what arrived and warns when Sync kept fewer.
- A folder that lies below an already excluded folder is no longer written to Sync's exclusion list; Sync skips everything below an excluded folder anyway, so the list gets much shorter and Sync checks every file against fewer entries.
- When Obsidian throws an error while saving the exclusion list, the plugin writes the same list once more on the next run instead of reporting the old state as fine.

### Changed

- The Sync status line also shows how many entries Sync's exclusion list holds in total, so the number can be compared with the one in Settings → Sync.

## [0.1.1] — 2026-10-03

### Changed

- The troubleshooting guide ends with a “Getting help” section that links to the issue tracker.

## [0.1.0] — 2026-09-30

### Added

- Hide folders that hold no relevant file (default `md`, `canvas`, `base`) anywhere below them; the path to a deep note stays visible.
- Ignore patterns in `.gitignore` style for folders (`node_modules`, anchored paths, `*`, `**`, `?`, `!` negation, comments); defaults `node_modules`, `dist`, `build`, `coverage`, `__pycache__`.
- Pins per folder from the file-explorer context menu: "always show" (also protects the parents) and "always hide".
- Ribbon toggle and command **Toggle hidden folders**; icon and tooltip name the current state (session switch, not persisted).
- Settings tab with help row, rules, pinned folders, a "Currently hidden" list with reasons, and an opt-in switch that writes the folders hidden by a pattern or pin into Obsidian Sync's excluded folders (per device; merely empty folders and user entries are never touched).
- English and German interface.
