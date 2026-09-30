# Security Policy

## Supported Versions

Security updates are provided for the most recently released version of Shadow Tree. Older versions do not receive backported fixes; please update to the latest release.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

Please do **not** report security vulnerabilities through public issues. Report them privately by email to **code@jkaindl.de** (PGP-encrypted mail is welcome). You will receive a prompt acknowledgement and updates as the fix progresses.

## Data Handling / Scope

Shadow Tree is a fully local plugin:

- **No network access.** The plugin makes no outbound requests.
- **No telemetry, no analytics, no remote logging.**
- **Reads only the folder tree** of the vault through the Obsidian API, never file contents.
- **Writes only its own settings** (`data.json`) and, if you turn the opt-in switch on, the excluded-folders list of the Obsidian Sync core plugin on the device it runs on. It never deletes, moves or renames files or folders.

If you have questions about the plugin's data handling beyond what is described here, the same private contact applies.
