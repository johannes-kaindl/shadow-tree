# Troubleshooting

Each entry names the symptom, the cause and what to do. The first stop is always **Settings → Shadow Tree → Currently hidden**: it lists every hidden folder with its reason (**empty**, **pattern …**, **pinned**).

## A folder is hidden but should be visible

### The reason says "empty"

**Cause:** no file with a relevant extension exists anywhere below the folder. The default relevant types are `md`, `canvas` and `base`; a folder that holds only images, PDFs or code counts as empty. **What to do:** add the extension under **Relevant file types** (for example `pdf`), or pin the folder **Always show** (right-click after revealing everything, or the **Add** row under **Pinned folders**).

### The reason says "pattern …"

**Cause:** the named ignore pattern matches the folder or one of its parents. A pattern without slash matches a folder **name** at any depth, so `build` also hides `repo-a/docs/build`. **What to do:** narrow the pattern (anchor it: `repo-a/build`), add an exception line after it (`!repo-a/docs/build`), or pin the folder **Always show**. See [Ignore patterns](ignore-patterns.md).

### The reason says "pinned"

**Cause:** the folder carries an **Always hide** pin. **What to do:** remove it under **Pinned folders**, or right-click the folder after revealing everything and choose **Shadow Tree: remove pin**.

### The folder is not in the list at all, yet it is not shown

**Cause:** a parent folder is hidden; only the topmost hidden folder of a branch is listed. **What to do:** look for the parent in the list and treat that one.

## A folder is visible but should be hidden

### It has notes deep inside

**Cause:** the empty rule counts any relevant file anywhere below the folder. **What to do:** add an ignore pattern for the folder, or pin it **Always hide**.

### A child of it is pinned "Always show"

**Cause:** a show pin keeps every parent visible too. **What to do:** remove that pin under **Pinned folders**.

### Everything is visible right now

**Cause:** the session switch is on; the ribbon icon shows an open eye and the tooltip reads **all folders visible**. **What to do:** click the icon or run **Shadow Tree: Toggle hidden folders**.

## The settings tab says the stylesheet cannot be applied

**Cause:** the app version has no Constructable Stylesheets (iOS older than 16.4). The plugin then does nothing visible. **What to do:** update the device; there is no fallback because the alternative (`<style>` elements) is disallowed for community plugins.

## The Sync switch is disabled

The status line under the switch names the reason:

- **Obsidian Sync is not enabled in this vault.** Turn the Sync core plugin on under **Settings → Core plugins**, or ignore the switch.
- **Obsidian Sync is enabled, but this vault is not connected to a remote vault.** Connect the vault in **Settings → Sync** first; without a remote vault there is nothing to exclude.
- **Obsidian Sync is enabled, but its exclusion list could not be reached in this version.** Obsidian changed the internal shape the plugin relies on. Please report the Obsidian version as an issue; the plugin keeps working without the Sync feature.
- **Sync status has not been checked yet.** The plugin checks a few seconds after each change; reopen the tab.

## Notes in hidden folders still appear in search

**Cause:** the plugin only hides folders in the file explorer; search, quick switcher and graph are not filtered. **What to do:** use Obsidian's own **Settings → Files and links → Excluded files**.
