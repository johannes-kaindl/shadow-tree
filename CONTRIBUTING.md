# Contributing to Shadow Tree

Thanks for your interest in improving **Shadow Tree**, an Obsidian plugin that hides empty and irrelevant folders from the file explorer without deleting them.

Contributions of all sizes are welcome: bug reports, fixes, docs and features. Before you start, please skim [`AGENTS.md`](AGENTS.md) in the repo root; it holds the architecture, module layout and the engineering conventions. This document is the contributor-facing summary. The conventions follow the workspace's **comply-or-explain** rule: deviate when you have a good reason, and say why in the PR.

## Branch model

- `main` is always green: it must build, pass tests and typecheck at every commit.
- Do feature work on a `feat/<name>` branch and merge into `main` with `--no-ff`.

## Commits

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat|fix|docs|chore|refactor|test(scope): …`. The description may be written in German.
- Stage **only the files you touched**. Never use `git add -A`.
- When an AI tool made a substantial contribution, add a `Co-Authored-By:` trailer naming it.

## Tags and remotes

- Releases are tagged with [SemVer](https://semver.org/) **without** a `v` prefix, for example `0.1.0`.
- [Forgejo](https://git.jkaindl.de/jkaindl/shadow-tree) is the canonical remote (`origin`); GitHub is the mirror that carries the releases the community store reads. Open issues and pull requests on GitHub.

## Quality gate

Run `npm run gate` before you commit. It runs lint (the same ESLint rules as the Obsidian community review, zero warnings), typecheck for source, tests and scripts, the Vitest suite, the pure-core check and the build. New behaviour arrives with tests; the project is test-driven.

For changes that touch the file explorer, run the GUI smoke as well (`docs/SMOKE.md`).

## Architecture constraint

`src/core/**` must stay free of any `obsidian` import (`npm run check:pure` enforces it). All user-facing strings live in `src/i18n/strings.ts`, English canonical plus German.

## License of contributions

- **Code** is licensed under **AGPL-3.0-or-later** ([`LICENSE`](LICENSE)). By contributing code you agree that your contribution is licensed the same way.
- **Documentation and other text** is licensed under **CC BY-SA 4.0** ([`LICENSE-DOCS`](LICENSE-DOCS)).

A commercial dual license is available on request; see [`LICENSING.md`](LICENSING.md).
