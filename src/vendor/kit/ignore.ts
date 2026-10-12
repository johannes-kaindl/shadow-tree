// vendored from code-kit@0.24.0, src/ts/pure/ignore.ts — do not hand-edit; re-vendor via tools/sync-kit.sh
/** Ignore patterns in `.gitignore` style, applied to FOLDER paths only.
 *
 *  Lifted from `shadow-tree/src/core/ignore.ts` (shadow-tree wave 14, spec § 5); the second
 *  consumer is Ghostline. shadow-tree itself still carries its own copy — swapping it over is a
 *  separate job. Pure on purpose: no file system, no vault, so a folder-hiding plugin and a
 *  folder-tree plugin read the same rules the same way.
 *
 *  Syntax: one rule per line; `#` comment; `*` inside a segment, `**` across segments, `?` one
 *  character; without a slash the rule matches the folder name at any depth, with a slash the
 *  path from the vault root (leading `/` optional); a trailing `/` has no effect; `!` negates,
 *  the last matching rule wins. Ranges `[abc]` are deliberately literal. */
export interface IgnoreRule { source: string; negate: boolean; anchored: boolean; regex: RegExp; }
export interface ParsedPatterns { rules: IgnoreRule[]; invalid: string[]; }

/** Trim, collapse doubled slashes, strip slashes at the edges; the root becomes "". */
export function normalizeFolderPath(raw: string): string {
  return raw.trim().replace(/\/{2,}/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

const META = /[.*+?^${}()|[\]\\]/g;
const escape = (c: string): string => c.replace(META, "\\$&");

function globToRegexSource(glob: string): string {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (c === "*") {
      if (glob.charAt(i + 1) === "*") {
        const atSegmentStart = i === 0 || glob.charAt(i - 1) === "/";
        if (atSegmentStart && glob.charAt(i + 2) === "/") { out += "(?:.*/)?"; i += 2; continue; }
        if (atSegmentStart && i + 2 === glob.length) { out += ".*"; i += 1; continue; }
        out += "[^/]*"; i += 1; continue;
      }
      out += "[^/]*";
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "\\" && i + 1 < glob.length) {
      out += escape(glob.charAt(i + 1)); i += 1;
    } else {
      out += escape(c);
    }
  }
  return out;
}

export function parsePatterns(text: string): ParsedPatterns {
  const rules: IgnoreRule[] = [];
  const invalid: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    let body = line;
    let negate = false;
    if (body.startsWith("!")) { negate = true; body = body.slice(1); }
    if (body.startsWith("\\#") || body.startsWith("\\!")) body = body.slice(1);
    body = body.replace(/\/+$/, "");
    const anchored = body.includes("/");
    body = body.replace(/^\/+/, "");
    if (body === "" || body === "**") { invalid.push(line); continue; }
    const src = globToRegexSource(body);
    // "docs/**" matches docs itself and everything below: the part after the last slash becomes optional.
    const withOptionalTail = src.endsWith("/.*") ? `${src.slice(0, -3)}(?:/.*)?` : src;
    rules.push({ source: line, negate, anchored, regex: new RegExp(`^${withOptionalTail}$`) });
  }
  return { rules, invalid };
}

/** Source of the last matching rule, or null. The root ("" or "/") never matches. */
export function matchIgnore(rules: readonly IgnoreRule[], folderPath: string): string | null {
  const path = normalizeFolderPath(folderPath);
  if (path === "") return null;
  const name = path.slice(path.lastIndexOf("/") + 1);
  let hit: string | null = null;
  for (const r of rules) {
    if (r.regex.test(r.anchored ? path : name)) hit = r.negate ? null : r.source;
  }
  return hit;
}
