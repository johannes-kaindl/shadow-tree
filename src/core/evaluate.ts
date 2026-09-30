import { matchIgnore, parsePatterns, type IgnoreRule } from "./ignore";
import { parseExtensions, type PinState, type ShadowTreeSettings } from "./settings";
import type { FolderNode } from "./tree";

export type HiddenReason = { kind: "pinned" } | { kind: "pattern"; pattern: string } | { kind: "empty" };
export interface HiddenFolder { path: string; reason: HiddenReason; }
export interface EvaluateRules { hideEmpty: boolean; relevantExtensions: string[]; rules: IgnoreRule[]; pins: Record<string, PinState>; }

export function rulesFromSettings(s: ShadowTreeSettings): { rules: EvaluateRules; invalidPatterns: string[] } {
  const parsed = parsePatterns(s.ignorePatterns);
  return {
    rules: { hideEmpty: s.hideEmpty, relevantExtensions: parseExtensions(s.relevantExtensions), rules: parsed.rules, pins: s.pins },
    invalidPatterns: parsed.invalid,
  };
}

interface Facts { relevant: boolean; protectedShow: boolean; }

/** Erster Durchlauf, von unten nach oben: hat der Ordner relevanten Inhalt, und steckt irgendwo darunter ein
 *  Show-Pin? Ein Show-Pin zählt für alle Vorfahren wie relevanter Inhalt und schützt sie zusätzlich vor
 *  Mustern und Hide-Pins (Spec § 5). */
function gather(node: FolderNode, rules: EvaluateRules, ext: Set<string>, facts: Map<FolderNode, Facts>): Facts {
  let relevant = node.fileExtensions.some((e) => ext.has(e.toLowerCase()));
  let protectedShow = rules.pins[node.path] === "show";
  for (const child of node.folders) {
    const c = gather(child, rules, ext, facts);
    relevant = relevant || c.relevant || c.protectedShow;
    protectedShow = protectedShow || c.protectedShow;
  }
  const f = { relevant, protectedShow };
  facts.set(node, f);
  return f;
}

/** Zweiter Durchlauf, von oben nach unten: der erste ausgeblendete Ordner auf einem Pfad wird ausgegeben,
 *  seine Kinder nicht mehr (ihr Container verschwindet mit ihm). */
function walk(node: FolderNode, rules: EvaluateRules, facts: Map<FolderNode, Facts>, out: HiddenFolder[], isRoot: boolean): void {
  if (!isRoot) {
    const f = facts.get(node) ?? { relevant: false, protectedShow: false };
    if (!f.protectedShow) {
      if (rules.pins[node.path] === "hide") { out.push({ path: node.path, reason: { kind: "pinned" } }); return; }
      const pattern = matchIgnore(rules.rules, node.path);
      if (pattern !== null) { out.push({ path: node.path, reason: { kind: "pattern", pattern } }); return; }
      if (rules.hideEmpty && !f.relevant) { out.push({ path: node.path, reason: { kind: "empty" } }); return; }
    }
  }
  for (const child of node.folders) walk(child, rules, facts, out, false);
}

/** Oberste auszublendende Ordner, nach Pfad sortiert. Der Root wird nie ausgegeben. */
export function evaluate(root: FolderNode, rules: EvaluateRules): HiddenFolder[] {
  const ext = new Set(rules.relevantExtensions.map((e) => e.toLowerCase()));
  const facts = new Map<FolderNode, Facts>();
  gather(root, rules, ext, facts);
  const out: HiddenFolder[] = [];
  walk(root, rules, facts, out, true);
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
