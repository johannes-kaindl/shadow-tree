import { TFile, TFolder } from "obsidian";
import type { FolderNode } from "../core/tree";

/** Wandelt den Vault-Baum in den puren Eingabetyp des Evaluators. Nur Vault-API, kein Dateisystem —
 *  läuft deshalb auch mobil. Dot-Ordner kennt die Vault-API nicht; sie kommen hier nie an. */
export function snapshotVault(root: TFolder): FolderNode {
  const node: FolderNode = { path: root.path === "/" ? "" : root.path, folders: [], fileExtensions: [] };
  for (const child of root.children) {
    if (child instanceof TFolder) node.folders.push(snapshotVault(child));
    else if (child instanceof TFile) node.fileExtensions.push(child.extension.toLowerCase());
  }
  node.folders.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return node;
}
