/**
 * Aufnahme-Treiber für `docs/images/` — fährt den Vertrag aus `docs/images/README.md` gegen ein
 * **laufendes** Obsidian (Skill `readme-shots`), Zweitinstanz mit eigenem Profil und Port 9350.
 *
 * ```bash
 * npm run build && npm run shots -- --setup            # Vault aus dem Fixture bauen (dasselbe wie der GUI-Smoke)
 * # Zweitinstanz mit Vault + englischer Oberfläche starten (obsidian.json UND localStorage["language"] = "en")
 * npm run shots -- --port 9350 [--only hero|revealed|settings|context-menu]
 * ```
 *
 * Der Treiber ändert keine Plugin-Daten: Auslieferungszustand (keine Pins, Standard-Muster). Für
 * `revealed.png` schaltet er den Sitzungsschalter um und danach zurück.
 */
import { execFileSync } from "node:child_process";
import { argv, cwd, exit } from "node:process";

import { Cdp, attachTo, openExisting, pollUntil, requireVisible } from "../../tools/obsidian-cdp/cdp.js";
import { capture, setWindowSize, writeShot, type Rect } from "../../tools/obsidian-cdp/shot.js";
import { buildVault, stagingVaultDir } from "../../tools/obsidian-cdp/vault.js";

const PLUGIN_ID = "shadow-tree";
const REPO_NAME = "shadow-tree";
const CAPTURE_WIDTH = 1200;
const THUMB_WIDTH = 380;
const WINDOW = { width: 1200, height: 760 };
const SETTINGS_WINDOW = { width: 1000, height: 900 };

const q = (s: unknown): string => JSON.stringify(s);

async function expandAll(ws: Cdp): Promise<void> {
  await ws.evaluate(`
    const leaf = app.workspace.getLeavesOfType("file-explorer")[0];
    const items = leaf && leaf.view && leaf.view.fileItems ? leaf.view.fileItems : {};
    for (const [path, item] of Object.entries(items)) {
      if (path !== "/" && item && typeof item.setCollapsed === "function" && item.file && item.file.children) await item.setCollapsed(false, false);
    }
    await new Promise((r) => setTimeout(r, 600));
    return true;
  `);
}

/** Linke Spalte: Ribbon + Datei-Explorer bis zum Ende des Baums, plus ein Stück der offenen Notiz rechts. */
async function explorerBox(ws: Cdp): Promise<Rect> {
  const raw = await ws.evaluate<string>(`
    const explorer = document.querySelector(".workspace-leaf-content[data-type='file-explorer']");
    const r = explorer.getBoundingClientRect();
    const last = [...explorer.querySelectorAll(".tree-item-self")].filter((e) => e.getBoundingClientRect().height > 1).pop();
    const bottom = last ? last.getBoundingClientRect().bottom : r.bottom;
    return JSON.stringify({ right: r.right, bottom, w: innerWidth, h: innerHeight });
  `);
  const r = JSON.parse(raw) as { right: number; bottom: number; w: number; h: number };
  const height = Math.min(r.h, Math.max(420, r.bottom + 40));
  return { x: 0, y: 0, width: r.w, height };
}

async function aufnehmen(win: Cdp, name: string, box: Rect | undefined, outDir: string): Promise<void> {
  const png = await capture(win, box, 2);
  console.log(" ", await writeShot(win, name, png, { outDir, captureWidth: CAPTURE_WIDTH, thumbWidth: THUMB_WIDTH }));
}

async function openSettings(ws: Cdp, port: number): Promise<Cdp> {
  await ws.evaluate(`app.setting.open(); await new Promise((r) => setTimeout(r, 500)); app.setting.openTabById(${q(PLUGIN_ID)}); await new Promise((r) => setTimeout(r, 1200)); return true;`);
  const win = await attachTo("settings", port, REPO_NAME);
  if (!win) throw new Error("Kein Einstellungen-Fenster gefunden");
  await requireVisible(win).catch(() => undefined);
  return win;
}

function setup(): void {
  const vaultDir = stagingVaultDir(REPO_NAME);
  const log = buildVault({ repoRoot: cwd(), vaultDir, fixtureDir: "fixtures/vault", pluginId: PLUGIN_ID });
  console.log(`Vault: ${vaultDir}`);
  for (const zeile of log) console.log(" ·", zeile);
  console.log("\nZweitinstanz mit diesem Vault UND englischer Oberfläche starten, dann:\n  npm run shots -- --port 9350");
}

async function main(): Promise<void> {
  const args = argv.slice(2);
  const flag = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1]; };
  if (args.includes("--setup")) { setup(); return; }
  const port = Number(flag("port") ?? 9350);
  const only = flag("only");
  const outDir = flag("out") ?? "docs/images";
  const want = (n: string): boolean => only === undefined || only === n;

  const ws = await attachTo("workspace", port, REPO_NAME);
  if (!ws) throw new Error(`Kein Obsidian-Fenster für Vault „${REPO_NAME}“ auf Port ${port}`);
  let settingsWin: Cdp | null = null;
  let revealed = false;
  try {
    if (process.platform === "darwin") {
      try { execFileSync("osascript", ["-e", 'tell application "Obsidian" to activate']); await new Promise((r) => setTimeout(r, 1200)); }
      catch { console.log("  (Hinweis: osascript activate schlug fehl)"); }
    }
    await requireVisible(ws);
    const sprache = await ws.evaluate<{ lang: string }>(`return { lang: window.moment ? window.moment.locale() : "?" };`);
    if (!sprache.lang.startsWith("en")) throw new Error(`Oberfläche ist „${sprache.lang}“, nicht Englisch — obsidian.json UND localStorage["language"] auf "en", dann Neustart.`);

    const plugin = await ws.evaluate<{ ok: boolean; pins: number; revealed: boolean }>(`const p = app.plugins.plugins[${q(PLUGIN_ID)}]; return p ? { ok: true, pins: Object.keys(p.settings.pins).length, revealed: p.revealed } : { ok: false, pins: 0, revealed: false };`);
    if (!plugin.ok) throw new Error("Plugin nicht geladen (Restricted Mode? app.plugins.setEnable(true))");
    if (plugin.pins > 0) throw new Error("Vault trägt Pins — kein Auslieferungszustand; `npm run shots -- --setup` und Neustart.");
    if (plugin.revealed) await ws.evaluate(`app.plugins.plugins[${q(PLUGIN_ID)}].toggleReveal(); return true;`);

    await setWindowSize(ws, WINDOW.width, WINDOW.height);
    await openExisting(ws, "repo-notes/docs/guide.md", "preview");
    await new Promise((r) => setTimeout(r, 800));
    await expandAll(ws);
    await pollUntil<string>(ws, `return document.querySelector('.nav-folder-title[data-path="repo-deep/a/b/c"]') ? "ok" : null;`, 8000, 250);

    if (want("hero")) await aufnehmen(ws, "hero.png", await explorerBox(ws), outDir);

    if (want("revealed")) {
      await ws.evaluate(`app.plugins.plugins[${q(PLUGIN_ID)}].toggleReveal(); return true;`);
      revealed = true;
      await pollUntil<string>(ws, `const el = document.querySelector('.nav-folder-title[data-path="repo-empty"]'); return el && getComputedStyle(el).display !== "none" ? "ok" : null;`, 5000, 200);
      await expandAll(ws);
      await aufnehmen(ws, "revealed.png", await explorerBox(ws), outDir);
      await ws.evaluate(`app.plugins.plugins[${q(PLUGIN_ID)}].toggleReveal(); return true;`);
      revealed = false;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (want("context-menu")) {
      await ws.evaluate(`
        const el = document.querySelector('.nav-folder-title[data-path="repo-notes/docs"]');
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 60, clientY: r.top + r.height / 2, button: 2 }));
        await new Promise((res) => setTimeout(res, 700));
        return true;
      `);
      const box = await ws.evaluate<string>(`
        const menu = document.querySelector(".menu");
        const explorer = document.querySelector(".workspace-leaf-content[data-type='file-explorer']").getBoundingClientRect();
        const m = menu ? menu.getBoundingClientRect() : null;
        return JSON.stringify({ found: !!menu, items: menu ? [...menu.querySelectorAll(".menu-item-title")].map((e) => e.textContent).filter((t) => /Shadow Tree/.test(t)) : [], right: m ? m.right : explorer.right, bottom: m ? m.bottom : explorer.bottom });
      `);
      const b = JSON.parse(box) as { found: boolean; items: string[]; right: number; bottom: number };
      if (!b.found || b.items.length !== 2) throw new Error(`Kontextmenü nicht wie erwartet: ${box}`);
      await aufnehmen(ws, "context-menu.png", { x: 0, y: 0, width: Math.min(WINDOW.width, b.right + 40), height: Math.min(WINDOW.height, b.bottom + 40) }, outDir);
      await ws.evaluate(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); const m = document.querySelector(".menu"); if (m) m.remove(); return true;`);
    }

    if (want("settings")) {
      settingsWin = await openSettings(ws, port);
      await setWindowSize(settingsWin, SETTINGS_WINDOW.width, SETTINGS_WINDOW.height);
      await pollUntil<string>(settingsWin, `return document.querySelector(".sht-hidden-list") ? "ok" : null;`, 10_000, 250);
      const raw = await settingsWin.evaluate<string>(`
        const sc = document.querySelector(".vertical-tab-content"); sc.scrollTop = 0;
        await new Promise((r) => setTimeout(r, 300));
        const list = document.querySelector(".sht-hidden-list");
        const note = list.nextElementSibling;
        const b = (note || list).getBoundingClientRect();
        return JSON.stringify({ bottom: b.bottom, w: innerWidth, h: innerHeight });
      `);
      const r = JSON.parse(raw) as { bottom: number; w: number; h: number };
      await aufnehmen(settingsWin, "settings.png", { x: 0, y: 0, width: r.w, height: Math.min(r.h, r.bottom + 16) }, outDir);
    }
  } finally {
    if (revealed) await ws.evaluate(`const p = app.plugins.plugins[${q(PLUGIN_ID)}]; if (p && p.revealed) p.toggleReveal(); return true;`).catch(() => undefined);
    if (settingsWin) settingsWin.close();
    await ws.evaluate(`app.setting.close(); return true;`).catch(() => undefined);
    ws.close();
  }
}

await main().catch((fehler: Error) => { console.error(fehler.message); exit(1); });
