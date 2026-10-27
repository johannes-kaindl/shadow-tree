# Keep Obsidian Sync small

Your Obsidian Sync plan has a storage limit for the remote vault, and generated media can fill it quickly. This page shows where the weight usually sits and which of two levers fits: a file-type switch in Sync itself, or Shadow Tree's folder exclusion. The figures about Sync's own settings come from the [Obsidian Sync help](https://help.obsidian.md/sync/settings); check there if your version looks different.

## Two levers, two jobs

| Lever | Where | What it covers | Best for |
|---|---|---|---|
| **File types** | **Settings → Sync → Selective sync** | Every file of a type in the whole vault: images, audio, videos, PDFs, and **Sync all other types** | Videos, audio or large images that should never sync, wherever they lie |
| **Excluded folders** | Same section, **Excluded folders** (filled by Shadow Tree if you turn on its Sync switch) | Whole folders, with everything below them | Folders of generated or bulky output: renders, exports, caches, build results |

Neither lever works on single files. A video that lies next to a note in a folder you want synced is handled by the file-type switch, not by a folder rule.

## Step 1: find the weight

Sort by size before you change anything. On macOS or Linux, run this in the vault folder and read the biggest entries first:

```bash
du -sh */ | sort -h | tail -10
```

Descend into the biggest folder and repeat. In a vault that also holds project folders, the bulk is almost always one of three things: video or audio renders, folders of generated images, or model and data files. Sync takes images, audio, videos and PDFs by default; everything else only travels with **Sync all other types**, so keep that switch off unless you need it.

## Step 2: switch off a whole type

If the weight is video, open **Settings → Sync → Selective sync** and turn **Videos** off. This is the quickest fix and needs no plugin. It applies to every video in the vault. Do the same for **Audio** or **Images** only if no note of yours depends on them on your other devices.

## Step 3: exclude output folders with Shadow Tree

If the weight sits in a few folders (typically named `out`, `output`, `renders`, `exports`), let Shadow Tree exclude them:

1. Open **Settings → Shadow Tree** and add one line per folder name to **Ignore patterns**, for example `out`, `output` and `renders`. A name without a slash matches a folder of that name at any depth. See [Ignore patterns](ignore-patterns.md) for anchoring a rule to one path.
2. Turn on **Also exclude hidden folders from Obsidian Sync**. The status line under the switch shows how many folders were written to Sync's excluded folders.
3. Check **Settings → Sync → Selective sync → Excluded folders**. The folders should be listed there.

Two things to know:

- **Hidden because empty is not excluded.** Shadow Tree writes only folders hidden by a pattern or an **Always hide** pin into Sync's list. A folder that is merely hidden because it holds no notes still syncs, but a pattern folder inside it (`node_modules`, `__pycache__`) is excluded on its own. If a bulky folder is hidden only for that reason, add a pattern or pin it **Always hide**.
- **The folder disappears from your file explorer too.** It is still on disk and still readable by other programs. Reveal it with the eye icon in the ribbon when you need to see it.

The exclusion is stored per device. Turn the switch on on every device that should exclude the folders, and note that Sync's own list on another device does not change by itself.

## What this does not do

Both levers apply to future changes. **Files that were already uploaded stay on the remote vault** until you remove them. After you changed a setting, watch the storage figure in **Settings → Sync** to see whether it drops. If it does not, the remote vault has to be cleaned up in Sync itself (see the Obsidian Sync help); do that only after your other devices are up to date, because it changes the remote copy.

If the Sync switch in Shadow Tree is disabled or the status line reports fewer folders than expected, see [Troubleshooting](troubleshooting.md).
