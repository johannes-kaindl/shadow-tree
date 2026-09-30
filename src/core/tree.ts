/** Der Eingabebaum des Evaluators: schlicht, ohne Obsidian-Typen, damit src/core pur bleibt. */
export interface FolderNode {
  /** Vault-relativer Pfad ohne führenden und ohne abschließenden Slash; "" ist der Root. */
  path: string;
  folders: FolderNode[];
  /** Endungen der Dateien direkt in diesem Ordner, klein geschrieben, ohne Punkt. */
  fileExtensions: string[];
}
