# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (without a `v` prefix).

## [Unreleased]

### Added

- Hide folders that hold no relevant file (default `md`, `canvas`, `base`) anywhere below them; the path to a deep note stays visible.
- Ignore patterns in `.gitignore` style for folders (`node_modules`, anchored paths, `*`, `**`, `?`, `!` negation, comments); defaults `node_modules`, `dist`, `build`, `coverage`, `__pycache__`.
- Pins per folder from the file-explorer context menu: "always show" (also protects the parents) and "always hide".
- Ribbon toggle and command **Toggle hidden folders**; icon and tooltip name the current state (session switch, not persisted).
- Settings tab with help row, rules, pinned folders, a "Currently hidden" list with reasons, and an opt-in switch that writes the folders hidden by a pattern or pin into Obsidian Sync's excluded folders (per device; merely empty folders and user entries are never touched).
- English and German interface.
