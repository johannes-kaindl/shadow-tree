/** Ignore-Muster in .gitignore-Art, angewandt nur auf ORDNERpfade (Spec § 5).
 *
 *  Syntax: eine Regel je Zeile; `#` Kommentar; `*` innerhalb eines Segments, `**` über Segmente,
 *  `?` ein Zeichen; ohne Slash trifft die Regel den Ordnernamen in jeder Tiefe, mit Slash den
 *  Pfad ab Vault-Root (führendes `/` optional); abschließendes `/` ohne Wirkung; `!` negiert,
 *  die letzte treffende Regel gewinnt. Ranges `[abc]` sind bewusst literal. */
export interface IgnoreRule { source: string; negate: boolean; anchored: boolean; regex: RegExp; }
export interface ParsedPatterns { rules: IgnoreRule[]; invalid: string[]; }

/** Trimmen, doppelte Slashes zusammenziehen, Slashes am Rand entfernen; Root wird "". */
export function normalizeFolderPath(raw: string): string {
  return raw.trim().replace(/\/{2,}/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

const META = /[.*+?^${}()|[\]\\]/g;

function globToRegexSource(glob: string): string {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        const atSegmentStart = i === 0 || glob[i - 1] === "/";
        if (atSegmentStart && glob[i + 2] === "/") { out += "(?:.*/)?"; i += 2; continue; }
        if (atSegmentStart && i + 2 === glob.length) { out += ".*"; i += 1; continue; }
        out += "[^/]*"; i += 1; continue;
      }
      out += "[^/]*";
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "\\" && i + 1 < glob.length) {
      out += glob[i + 1].replace(META, "\\$&"); i += 1;
    } else {
      out += c.replace(META, "\\$&");
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
    // "docs/**" trifft docs selbst und alles darunter: der Rest hinter dem letzten Slash wird optional.
    const withOptionalTail = src.endsWith("/.*") ? `${src.slice(0, -3)}(?:/.*)?` : src;
    rules.push({ source: line, negate, anchored, regex: new RegExp(`^${withOptionalTail}$`) });
  }
  return { rules, invalid };
}

/** Quelle der letzten treffenden Regel oder null. Der Root ("" bzw. "/") trifft nie. */
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
