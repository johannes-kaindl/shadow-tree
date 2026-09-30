# Ignore patterns

The **Ignore patterns** setting takes one rule per line, in the style of a `.gitignore`. Rules apply to **folder paths** relative to the vault root; the plugin never hides single files. A folder that matches is hidden even if it contains notes, and everything below it disappears with it. The examples below are the plugin's test cases (`tests/ignore.test.ts`), so this page and the code agree.

## Rules

| Rule | Meaning |
|---|---|
| `name` (no slash) | Matches a folder **named** `name` at any depth. `node_modules` hides `node_modules`, `repo-a/node_modules` and `repo-a/packages/x/node_modules`, but not `node_modules_backup`. |
| `path/with/slash` | Anchored at the vault root. `repo-a/dist` hides exactly `repo-a/dist`, not `other/repo-a/dist`. A leading `/` is allowed and means the same. |
| trailing `/` | Allowed, no effect: `build/` is the same as `build`. |
| `*` | Any characters **inside one folder name**: `repo-*/dist` matches `repo-a/dist` but not `repo-a/sub/dist`; `*.tmp` matches `cache.tmp` at any depth. |
| `**` | Any number of folders: `repo-a/**/dist` matches `repo-a/dist` and `repo-a/x/y/dist`; `**/tmp` matches `tmp` at any depth; `docs/**` matches `docs` and everything below it. |
| `?` | Exactly one character: `v?` matches `v1`, not `v12`. |
| `!rule` | Undoes an earlier match for the folders it matches. The **last** matching rule wins: `build` followed by `!repo-a/build` hides every `build` except the one in `repo-a`. |
| `# comment` | Ignored, as are blank lines. To match a folder whose name starts with `#` or `!`, escape it: `\#literal`. |
| `[abc]` | Brackets are **literal**, not a character class. `[abc]` matches a folder literally named `[abc]`. |

Lines that cannot be read (a bare `!`, a bare `/`, a bare `**`) are skipped; the settings tab shows how many and which.

## Interplay with the other rules

- **Pins beat patterns.** A folder pinned **Always show** stays visible even if a pattern matches it, and so do its parents. A folder pinned **Always hide** is hidden regardless of patterns.
- **Patterns beat notes.** A matching folder is hidden even if notes are inside; that is the point of hiding `node_modules`, which almost always contains a `README.md` somewhere. Those notes also do not count for the parent: a repository whose only Markdown sits inside `node_modules` is empty and disappears as a whole.
- **A show pin below wins over a hide pin above.** "Always show" on `a/b` keeps `a` visible even if `a` is pinned "Always hide" or matches a pattern; the pin protects the whole path down to it.
- **Patterns and pin paths are case-sensitive.** `Node_Modules` does not match `node_modules`; use the spelling the file explorer shows.
- **Patterns and emptiness are independent.** Turning **Hide empty folders** off leaves the patterns in force.
- **Only the topmost match counts for display.** If `repo-a` is hidden, a pattern matching `repo-a/dist` changes nothing visible; it shows up in **Currently hidden** only when `repo-a` is visible.

## Defaults

```
node_modules
dist
build
coverage
__pycache__
```

Dot folders such as `.git` are not in the list because Obsidian never shows them in the first place.
