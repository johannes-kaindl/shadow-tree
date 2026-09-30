# Shadow Tree

> [🇬🇧 English](https://github.com/johannes-kaindl/shadow-tree/blob/main/README.md) · 🇩🇪 Deutsch

**Blendet leere und irrelevante Ordner im Datei-Explorer aus, ohne sie zu löschen: Ignore-Muster, Pins je Ordner, optional Ausschluss aus Obsidian Sync.**

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Docs: CC BY-SA 4.0](https://img.shields.io/badge/docs-CC%20BY--SA%204.0-lightgrey.svg)](LICENSE-DOCS)
[![Release](https://img.shields.io/github/v/release/johannes-kaindl/shadow-tree?label=release)](https://github.com/johannes-kaindl/shadow-tree/releases)
![Platform](https://img.shields.io/badge/platform-Obsidian%201.11.4%2B%20%C2%B7%20Desktop%20%26%20Mobil-7c3aed)

Wer ein Verzeichnis voller Code-Repositories als Vault öffnet, sieht im Datei-Explorer `node_modules`, Build-Ausgaben und Ordner, in denen nie eine Notiz lag. Shadow Tree filtert diese Ansicht. Ein Ordner verschwindet aus dem Datei-Explorer, wenn unter ihm nichts als Inhalt zählt (standardmäßig Markdown-, Canvas- und Base-Dateien) oder wenn ein Ausschlussmuster in `.gitignore`-Art auf ihn passt. Notizen in einem Ordner, den ein Muster ausblendet, zählen für seine Elternordner nicht; ein Repository, dessen einziges Markdown in `node_modules` liegt, verschwindet damit ganz. Nichts wird gelöscht, verschoben oder umbenannt: Die Ordner sind noch da, sie werden nur nicht gezeichnet. Ein Klick auf das Symbol in der Seitenleiste zeigt wieder alles.

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/hero.png" width="820" alt="Obsidians Datei-Explorer mit aktivem Shadow Tree: der Vault zeigt Welcome.md, repo-deep mit seiner einzigen Notiz drei Ordner tief und repo-notes mit README und docs, während repo-empty, node_modules und dist nicht gezeichnet werden; die Seitenleiste zeigt das Symbol mit dem durchgestrichenen Auge">

## Funktionen

- **Leere Ordner verschwinden** — ein Ordner ist leer, wenn nirgends unter ihm eine Datei eines relevanten Typs liegt. Welche Typen relevant sind, ist eine Einstellung (`md, canvas, base` als Standard); ein Ordner nur mit Bildern oder Code verschwindet also.
- **Ausschlussmuster wie eine `.gitignore`** — eine Regel je Zeile: `node_modules` trifft in jeder Tiefe, `repo-a/dist` gilt ab dem Vault-Wurzelordner, `*` bleibt innerhalb eines Ordnernamens, `**` geht über Ordner hinweg, `!` hebt eine frühere Regel auf. Getroffene Ordner werden auch mit Notizen darin ausgeblendet. Standard: `node_modules`, `dist`, `build`, `coverage`, `__pycache__`.
- **Pins je Ordner** — Rechtsklick auf einen Ordner, dann **Shadow Tree: immer anzeigen** oder **immer verstecken**. „Immer anzeigen“ hält auch die Elternordner sichtbar; Pins schlagen jede Regel.
- **Ein Schalter für alles** — das Symbol in der Seitenleiste (oder der Befehl **Ausgeblendete Ordner umschalten**) zeigt alle ausgeblendeten Ordner für diese Sitzung. Symbol und Tooltip nennen den aktuellen Zustand.
- **Du siehst, warum** — der Einstellungs-Tab listet, was gerade ausgeblendet ist und weshalb: leer, welches Muster, oder angepinnt.
- **Optional: aus Obsidian Sync ausschließen** — ein Opt-in-Schalter trägt die durch ein Muster oder einen „Immer verstecken“-Pin ausgeblendeten Ordner in die ausgeschlossenen Ordner von Obsidian Sync ein und nimmt sie wieder heraus, wenn sie sichtbar werden. Nur leere Ordner werden nicht ausgeschlossen, und Ordner, die du selbst ausgeschlossen hast, bleiben unangetastet.

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/revealed.png" width="820" alt="Derselbe Vault nach dem Umschalten: repo-empty, node_modules und dist werden wieder gezeichnet, die Seitenleiste zeigt das Auge-Symbol">

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/settings.png" width="820" alt="Der Einstellungs-Tab von Shadow Tree: die Hilfe-Zeile, die Gruppe Rules mit Hide empty folders, Relevant file types und Ignore patterns sowie die Liste Currently hidden mit drei Ordnern und ihren Gründen">

<img src="https://raw.githubusercontent.com/johannes-kaindl/shadow-tree/main/docs/images/context-menu.png" width="820" alt="Das Ordner-Kontextmenü im Datei-Explorer mit den beiden Einträgen Shadow Tree: always show und Shadow Tree: always hide">

## Voraussetzungen

- **Obsidian 1.11.4+**, Desktop und Mobil. Auf iOS älter als 16.4 kann das Stylesheet nicht angewendet werden, die Ordner bleiben sichtbar; der Einstellungs-Tab sagt das.
- Sonst nichts. Das Plugin macht keine Netzwerkanfragen und liest nur den Ordnerbaum deines Vaults.

## Installation

### Plugin-Katalog (empfohlen)

[AnySource Sideloader](https://git.jkaindl.de/jkaindl/anysource-sideloader) installieren, den Katalog `https://git.jkaindl.de/jkaindl/obsidian-catalog/raw/branch/main/catalog.json` eintragen, dann **Shadow Tree** daraus installieren und unter **Einstellungen → Community-Plugins** aktivieren.

### Von Hand

`main.js`, `manifest.json` und `styles.css` aus dem [neuesten Release](https://github.com/johannes-kaindl/shadow-tree/releases) laden, nach `<vault>/.obsidian/plugins/shadow-tree/` legen, dann **Shadow Tree** unter **Einstellungen → Community-Plugins** aktivieren.

### Aus dem Quelltext

```bash
git clone https://github.com/johannes-kaindl/shadow-tree
cd shadow-tree && npm install && npm run build
# main.js, manifest.json und styles.css nach <vault>/.obsidian/plugins/shadow-tree/ kopieren
```

## Bedienung

1. Plugin aktivieren. Ordner ohne Notizen und Ordner, die auf die Standard-Ausschlussmuster passen, verschwinden sofort aus dem Datei-Explorer.
2. Auf das **Auge**-Symbol in der Seitenleiste klicken (oder **Shadow Tree: Ausgeblendete Ordner umschalten** ausführen), um alles zu sehen; erneut klicken blendet wieder aus. Das ist ein Sitzungsschalter: Nach einem Neustart sind die Ordner wieder ausgeblendet.
3. Rechtsklick auf einen Ordner, dann **Shadow Tree: immer anzeigen** oder **Shadow Tree: immer verstecken**. Dasselbe Menü entfernt den Pin später. Ausgeblendete Ordner lassen sich nicht anklicken; erst einblenden oder den Pin in den Einstellungen setzen.
4. **Einstellungen → Shadow Tree** öffnen, um relevante Dateitypen zu ändern, Ausschlussmuster zu bearbeiten, Pins zu verwalten und unter **Derzeit ausgeblendet** nachzusehen, wo ein Ordner geblieben ist.

### Einstellungen

| Einstellung | Wirkung | Standard |
|---|---|---|
| Leere Ordner ausblenden | Blendet Ordner aus, unter denen keine relevante Datei liegt. | an |
| Relevante Dateitypen | Endungen, die als Inhalt zählen, durch Komma oder Leerzeichen getrennt. | `md, canvas, base` |
| Ausschlussmuster | Eine Regel je Zeile in `.gitignore`-Art; getroffene Ordner werden auch mit Notizen ausgeblendet. Siehe [Ignore-Muster](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/ignore-patterns.md) (englisch). | `node_modules`, `dist`, `build`, `coverage`, `__pycache__` |
| Angepinnte Ordner | Übersteuerung je Ordner: **Immer anzeigen** oder **Immer verstecken**. Aus dem Kontextmenü oder hier. | keine |
| Ausgeblendete Ordner auch aus Obsidian Sync ausschließen | Trägt die durch Muster oder „Immer verstecken“-Pin ausgeblendeten Ordner in die ausgeschlossenen Ordner von Sync ein (je Gerät) und nimmt sie später wieder heraus; nur leere Ordner bleiben unangetastet. Gesperrt, wenn Sync aus ist oder kein Remote-Vault verbunden ist. Vor dem Deaktivieren des Plugins ausschalten. | aus |

## So funktioniert es

Das Plugin fasst das DOM des Datei-Explorers nie an. Es liest den Ordnerbaum des Vaults über die Obsidian-API, berechnet die obersten ausgeblendeten Ordner und installiert ein Stylesheet (ein Constructable Stylesheet am Hauptfenster) mit einer Regel je Ordner, verankert am `data-path`-Attribut des Ordners. Der Baum wird eine Viertelsekunde nach der letzten Anlage, Löschung oder Umbenennung neu berechnet. Weil das Plugin nur ausblendet, tauchen im schlimmsten Fall eines Obsidian-Updates, das die Explorer-Struktur ändert, die Ordner wieder auf; verloren geht nichts. Den Code-Aufbau beschreibt [`AGENTS.md`](https://github.com/johannes-kaindl/shadow-tree/blob/main/AGENTS.md).

## Grenzen

- **Suche, Schnellwechsler und Graph** sehen Notizen in ausgeblendeten Ordnern weiter. Dafür ist Obsidians eigene Einstellung **Dateien und Links → Ausgeschlossene Dateien** da.
- **Dot-Ordner** wie `.obsidian` zeigt Obsidians Datei-Explorer nie; das Plugin kann sie nicht sichtbar machen.
- **Nur Ordner** werden ausgeblendet, nie einzelne Dateien.
- **Der Sync-Ausschluss gilt je Gerät.** Obsidian Sync führt seine ausgeschlossenen Ordner auf jedem Gerät; das Plugin schreibt die Liste des Geräts, auf dem es läuft. Die Ausschlussliste ist ein interner Teil des Sync-Core-Plugins ohne öffentliche API; ändert eine künftige Obsidian-Version sie, wird der Schalter gesperrt und die Statuszeile sagt warum, aber schon geschriebene Einträge bleiben in der Sync-Liste, bis du sie dort entfernst. Dasselbe gilt, wenn du das Plugin deaktivierst, ohne den Schalter vorher auszuschalten.
- **Pop-out-Fenster.** Das Stylesheet wird nur im Hauptfenster installiert; ein in ein Pop-out-Fenster verschobener Datei-Explorer zeigt alle Ordner.
- **Muster und Pins unterscheiden Groß- und Kleinschreibung**, wie Obsidians eigene Pfade.

## Dokumentation

- [Dokumentations-Index](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/README.md) (englisch)
- [Erste Schritte](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/getting-started.md) — von der Installation zum ersten Pin
- [Ausschlussmuster](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/ignore-patterns.md) — die Syntax mit Beispielen (englisch)
- [Fehlersuche](https://github.com/johannes-kaindl/shadow-tree/blob/main/docs/troubleshooting.md) — ein Ordner ist sichtbar oder versteckt, obwohl er es nicht sein sollte

## Mitmachen

Issues und Pull Requests auf [GitHub](https://github.com/johannes-kaindl/shadow-tree/issues). Testgetrieben (`npm run gate`); siehe [`AGENTS.md`](https://github.com/johannes-kaindl/shadow-tree/blob/main/AGENTS.md) und [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Lizenz

- **Code:** AGPL-3.0-or-later ([`LICENSE`](LICENSE)).
- **Doku/Text:** CC BY-SA 4.0 ([`LICENSE-DOCS`](LICENSE-DOCS)).

Copyright © 2026 Johannes Kaindl.
