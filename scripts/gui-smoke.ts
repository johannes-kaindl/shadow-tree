/**
 * GUI-Smoke — fährt die Prüfpunkte aus docs/SMOKE.md gegen ein LAUFENDES Obsidian
 * (CORE-TEST-02 b), Zweitinstanz-Rezept aus der Dach-AGENTS.md § Staging-Vaults.
 *
 * A  repo-empty ist ausgeblendet (display none) — Leere-Regel
 * B  repo-notes/node_modules ist ausgeblendet trotz README — Muster-Regel; repo-notes/docs sichtbar; B2 dist per Standard-Muster
 * C  repo-deep/a/b/c ist samt Pfad sichtbar — Tiefe
 * D  Pin „immer anzeigen“ macht repo-empty sichtbar, Pin weg macht es wieder unsichtbar
 * E  Umschalter (Command) blendet alles ein, Ribbon nennt den Zustand, aria-pressed wechselt
 * F  Notiz anlegen lässt repo-empty erscheinen, Löschen lässt es verschwinden
 * G  Settings-Tab: Hilfe-Zeile zuerst, „Currently hidden“ nennt 3, Sync-Statuszeile nennt einen der drei Zustände (welcher, steht im Detail)
 * H  Verdeckungsprobe: elementFromPoint auf repo-notes trifft die Titelzeile
 * Der Sync-SCHREIBPFAD wird nicht gemessen (kein Sync-Konto im Staging-Vault) und als „nichts gemessen“ ausgewiesen.
 *
 * ## Zweitinstanz (eigenes Profil, eigener Port 9350 — NICHT die reguläre Instanz anfassen)
 *
 *   echo "$STAGING_VAULTS_DIR"                                         # muss gesetzt sein
 *   npm run build && npm run smoke:gui -- --setup
 *   UD=/tmp/obs-test-shadow-tree; mkdir -p "$UD"
 *   lsof -nP -iTCP:9350 -sTCP:LISTEN && echo "Port belegt — anderen nehmen"
 *   node -e 'const p=process.env.STAGING_VAULTS_DIR+"/shadow-tree";require("fs").writeFileSync(process.argv[1]+"/obsidian.json",JSON.stringify({vaults:{"shadow-tree":{path:p,ts:Date.now(),open:true}},language:"en"}))' "$UD"
 *   cp ~/Library/Application\ Support/obsidian/obsidian-1.14.3.asar "$UD"/   # aktuelle Version statt gebündelter
 *   /Applications/Obsidian.app/Contents/MacOS/Obsidian --user-data-dir="$UD" --remote-debugging-port=9350 &
 *   python3 ~/.claude/hooks/obsidian-cdp-lock.py acquire --label shadow-tree --intent "GUI-Smoke" --exclusive focus --port 9350 --ttl 900
 *   npm run smoke:gui -- --port 9350
 *   python3 ~/.claude/hooks/obsidian-cdp-lock.py release --port 9350
 *
 * Ein frisches Profil fragt „Trust author?“ und startet im Restricted Mode — der Treiber klickt den
 * Vertrauens-Knopf und schaltet per `app.plugins.setEnable(true)` frei, bevor etwas gemessen wird.
 * Prozess der Zweitinstanz je Messlauf neu starten (Dach-Regel Welle 11, recycelte Fenster altern).
 *
 * Typen: `tsconfig.scripts.json` (im `gate` über `npm run typecheck:scripts`).
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { cwd } from "node:process";

import { Cdp, attachTo, pollUntil, requireVisible } from "../../tools/obsidian-cdp/cdp.js";
import { buildVault, requireEigenerBuild, stagingVaultDir } from "../../tools/obsidian-cdp/vault.js";

const REPO_NAME = "shadow-tree";
const PLUGIN_ID = "shadow-tree";
const REPO_ROOT = cwd();
const FIXTURE_DIR = join(REPO_ROOT, "fixtures/vault");

type Zustand = "gruen" | "rot" | "uebersprungen" | "nichts-gemessen";
interface Check { name: string; zustand: Zustand; detail: string }
const checks: Check[] = [];
function record(name: string, passed: boolean, detail: string): void {
  checks.push({ name, zustand: passed ? "gruen" : "rot", detail });
  console.log(`${passed ? "  ✓" : "  ✗"} ${name} — ${detail}`);
}
function notMeasured(name: string, reason: string): void {
  checks.push({ name, zustand: "nichts-gemessen", detail: reason });
  console.log(`  ∅ ${name} — nichts gemessen: ${reason}`);
}

const q = (s: unknown): string => JSON.stringify(s);

/** display-Wert der Titelzeile eines Ordners; null, wenn der Explorer sie (noch) nicht rendert. */
function displayExpr(path: string): string {
  return `(() => { const el = document.querySelector('.nav-folder-title[data-path=' + ${q(q(path))} + ']'); return el ? { d: getComputedStyle(el).display } : null; })()`;
}
async function display(cdp: Cdp, path: string): Promise<string | null> {
  const r = await cdp.evaluate<{ d: string } | null>(`return ${displayExpr(path)};`);
  return r?.d ?? null;
}
async function waitDisplay(cdp: Cdp, path: string, want: (d: string) => boolean, ms = 4000): Promise<string | null> {
  const r = await pollUntil<{ d: string }>(cdp, `const r = ${displayExpr(path)}; return r && (${want.toString()})(r.d) ? r : null;`, ms, 200);
  return r?.d ?? null;
}

/** Ordner im Explorer aufklappen: erst über die interne Baumstruktur, sonst per Klick auf die Titelzeile. */
async function expand(cdp: Cdp, path: string): Promise<boolean> {
  return (await cdp.evaluate<{ ok: boolean }>(`
    const leaf = app.workspace.getLeavesOfType("file-explorer")[0];
    const item = leaf && leaf.view && leaf.view.fileItems ? leaf.view.fileItems[${q(path)}] : null;
    if (item && typeof item.setCollapsed === "function") { await item.setCollapsed(false, false); return { ok: true }; }
    const el = document.querySelector('.nav-folder-title[data-path=' + ${q(q(path))} + ']');
    if (!el) return { ok: false };
    const folder = el.closest(".nav-folder");
    if (folder && folder.classList.contains("is-collapsed")) el.click();
    return { ok: true };
  `)).ok;
}

function setup(): void {
  const vaultDir = stagingVaultDir(REPO_NAME);
  const log = buildVault({ repoRoot: REPO_ROOT, vaultDir, fixtureDir: FIXTURE_DIR, pluginId: PLUGIN_ID });
  console.log(`Staging-Vault gebaut: ${vaultDir}`);
  for (const l of log) console.log(`  · ${l}`);
  console.log("\nZweitinstanz starten (Rezept im Dateikopf), dann:\n  npm run smoke:gui -- --port 9350");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--setup")) { setup(); return; }
  const flag = (name: string): string | undefined => { const i = argv.indexOf(`--${name}`); return i === -1 ? undefined : argv[i + 1]; };
  const port = Number(flag("port") ?? 9350);

  console.log(`GUI-Smoke shadow-tree — Obsidian auf Port ${port}`);
  const cdp = await attachTo("workspace", port, REPO_NAME);
  if (!cdp) throw new Error(`Kein Obsidian-Hauptfenster auf Port ${port} für Vault „${REPO_NAME}“. Läuft die Zweitinstanz mit --remote-debugging-port? (siehe Kopfkommentar)`);

  const warnungen: string[] = [];
  let pinnedForTest = false;
  let createdNote = false;
  try {
    if (process.platform === "darwin") {
      try { execFileSync("osascript", ["-e", 'tell application "Obsidian" to activate']); await new Promise((r) => setTimeout(r, 1500)); }
      catch { console.log("  (Hinweis: osascript activate schlug fehl — Fenster ggf. von Hand nach vorn holen)"); }
    }
    await requireVisible(cdp);

    // Vertrauensdialog eines frischen Profils (Dach-AGENTS § Staging-Vaults (c)).
    const trusted = await cdp.evaluate<{ clicked: boolean }>(`
      const btn = Array.from(document.querySelectorAll(".modal-container button")).find((b) => /trust/i.test(b.textContent || ""));
      if (btn) { btn.click(); await new Promise((r) => setTimeout(r, 800)); return { clicked: true }; }
      return { clicked: false };
    `);
    if (trusted.clicked) console.log("  (Vertrauensdialog bestätigt)");

    const vaultInfo = await cdp.evaluate<{ name: string; basePath: string; configDir: string }>(`
      return window.app ? { name: app.vault.getName(), basePath: app.vault.adapter.basePath, configDir: app.vault.configDir } : { name: "", basePath: "", configDir: "" };
    `);
    if (!vaultInfo.name) throw new Error("Obsidians `app` ist im Renderer nicht erreichbar.");
    console.log(`Vault: ${vaultInfo.name} (${vaultInfo.basePath})\n`);

    requireEigenerBuild(join(vaultInfo.basePath, vaultInfo.configDir, "plugins", PLUGIN_ID, "main.js"), join(REPO_ROOT, "main.js"), (m) => warnungen.push(m));

    // Restricted-Mode-Guard + frischer Reload des Bundles.
    console.log("0 · Grundlage");
    await cdp.evaluate(`try { await app.plugins.disablePlugin(${q(PLUGIN_ID)}); await app.plugins.enablePlugin(${q(PLUGIN_ID)}); } catch {} return true;`);
    let geladen = (await cdp.evaluate<{ g: boolean }>(`return { g: Boolean(app.plugins.plugins[${q(PLUGIN_ID)}]) };`)).g;
    let frei = "";
    if (!geladen) {
      frei = (await cdp.evaluate<{ s: string }>(`
        try { if (app.plugins.setEnable) await app.plugins.setEnable(true); await app.plugins.enablePluginAndSave(${q(PLUGIN_ID)}); await new Promise((r) => setTimeout(r, 1200));
          return { s: app.plugins.plugins[${q(PLUGIN_ID)}] ? "freigeschaltet" : "Aufruf ohne Wirkung" }; } catch (e) { return { s: "Fehler: " + (e && e.message ? e.message : String(e)) }; }
      `)).s;
      geladen = (await cdp.evaluate<{ g: boolean }>(`return { g: Boolean(app.plugins.plugins[${q(PLUGIN_ID)}]) };`)).g;
    }
    record("0 Plugin geladen (Restricted-Mode-Guard)", geladen, geladen ? `Vault ${vaultInfo.name}${frei ? ` (${frei})` : " (bereits aktiv)"}` : `app.plugins.plugins.${PLUGIN_ID} fehlt — ${frei || "kein Freischaltversuch"}`);
    if (!geladen) throw new Error("Ohne geladenes Plugin ist jeder weitere Punkt gegenstandslos.");

    // Auslieferungszustand sicherstellen (ein abgebrochener Vorlauf könnte Pins hinterlassen haben).
    const restPins = await cdp.evaluate<number>(`const p = app.plugins.plugins[${q(PLUGIN_ID)}]; const n = Object.keys(p.settings.pins).length; if (n) { p.settings.pins = {}; await p.saveSettings(); } if (p.revealed) p.toggleReveal(); return n;`);
    if (restPins > 0) warnungen.push(`${restPins} Pin(s) aus einem Vorlauf weggeräumt`);
    await new Promise((r) => setTimeout(r, 600));

    // --- A ---------------------------------------------------------------------
    console.log("\nA · Leere-Regel");
    const dA = await waitDisplay(cdp, "repo-empty", (d) => d === "none");
    record("A repo-empty ausgeblendet (display none)", dA === "none", `display=${q(dA)}`);

    // --- B ---------------------------------------------------------------------
    console.log("\nB · Muster-Regel");
    const expanded = await expand(cdp, "repo-notes");
    const dNm = await waitDisplay(cdp, "repo-notes/node_modules", (d) => d === "none");
    const dDocs = await waitDisplay(cdp, "repo-notes/docs", (d) => d !== "none");
    const dNotes = await display(cdp, "repo-notes");
    record("B node_modules ausgeblendet trotz README, repo-notes und docs sichtbar", expanded && dNm === "none" && dDocs !== null && dDocs !== "none" && dNotes !== null && dNotes !== "none", `aufgeklappt=${expanded}, node_modules=${q(dNm)}, docs=${q(dDocs)}, repo-notes=${q(dNotes)}`);
    const dDist = await display(cdp, "repo-notes/dist");
    record("B2 repo-notes/dist ausgeblendet (Standard-Muster dist; die Leere-Regel misst A)", dDist === "none", `display=${q(dDist)}`);

    // --- C ---------------------------------------------------------------------
    console.log("\nC · Tiefe");
    for (const p of ["repo-deep", "repo-deep/a", "repo-deep/a/b"]) await expand(cdp, p);
    const dC = await waitDisplay(cdp, "repo-deep/a/b/c", (d) => d !== "none");
    const dC0 = await display(cdp, "repo-deep");
    record("C repo-deep bis a/b/c sichtbar", dC !== null && dC !== "none" && dC0 !== null && dC0 !== "none", `repo-deep=${q(dC0)}, a/b/c=${q(dC)}`);

    // --- D ---------------------------------------------------------------------
    console.log("\nD · Pin");
    await cdp.evaluate(`await app.plugins.plugins[${q(PLUGIN_ID)}].setPin("repo-empty", "show"); return true;`);
    pinnedForTest = true;
    const dPin = await waitDisplay(cdp, "repo-empty", (d) => d !== "none");
    await cdp.evaluate(`await app.plugins.plugins[${q(PLUGIN_ID)}].setPin("repo-empty", null); return true;`);
    pinnedForTest = false;
    const dUnpin = await waitDisplay(cdp, "repo-empty", (d) => d === "none");
    record("D Pin „immer anzeigen“ zeigt repo-empty, Pin weg blendet wieder aus", dPin !== null && dPin !== "none" && dUnpin === "none", `gepinnt=${q(dPin)}, entpinnt=${q(dUnpin)}`);

    // --- E ---------------------------------------------------------------------
    console.log("\nE · Umschalter");
    const ribbonExpr = `Array.from(document.querySelectorAll(".side-dock-ribbon-action")).find((b) => /Shadow Tree/.test(b.getAttribute("aria-label") || ""))`;
    await cdp.evaluate(`app.commands.executeCommandById(${q(`${PLUGIN_ID}:toggle-hidden-folders`)}); return true;`);
    const dRev = await waitDisplay(cdp, "repo-empty", (d) => d !== "none");
    const ribbonOn = await cdp.evaluate<{ label: string | null; pressed: string | null; icon: string | null }>(`const b = ${ribbonExpr}; return b ? { label: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed"), icon: b.querySelector("svg") ? b.querySelector("svg").getAttribute("class") : null } : { label: null, pressed: null, icon: null };`);
    await cdp.evaluate(`app.commands.executeCommandById(${q(`${PLUGIN_ID}:toggle-hidden-folders`)}); return true;`);
    const dBack = await waitDisplay(cdp, "repo-empty", (d) => d === "none");
    const ribbonOff = await cdp.evaluate<{ label: string | null; pressed: string | null }>(`const b = ${ribbonExpr}; return b ? { label: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed") } : { label: null, pressed: null };`);
    record("E Umschalter: alles sichtbar, Ribbon nennt Zustand, zurück ausgeblendet",
      dRev !== null && dRev !== "none" && /all folders visible|alle Ordner sichtbar/.test(ribbonOn.label ?? "") && ribbonOn.pressed === "false" && dBack === "none" && /hiding 3 folder|3 Ordner ausgeblendet/.test(ribbonOff.label ?? "") && ribbonOff.pressed === "true",
      `sichtbar=${q(dRev)} · Ribbon an=${q(ribbonOn.label)}/${ribbonOn.pressed} · zurück=${q(dBack)} · Ribbon aus=${q(ribbonOff.label)}/${ribbonOff.pressed}`);

    // --- F ---------------------------------------------------------------------
    console.log("\nF · Dynamik");
    await cdp.evaluate(`await app.vault.create("repo-empty/smoke-note.md", "# smoke"); return true;`);
    createdNote = true;
    const dNew = await waitDisplay(cdp, "repo-empty", (d) => d !== "none", 5000);
    await cdp.evaluate(`const f = app.vault.getAbstractFileByPath("repo-empty/smoke-note.md"); if (f) await app.fileManager.trashFile(f); return true;`);
    createdNote = false;
    const dGone = await waitDisplay(cdp, "repo-empty", (d) => d === "none", 5000);
    record("F Notiz anlegen zeigt repo-empty, Löschen blendet wieder aus", dNew !== null && dNew !== "none" && dGone === "none", `nach create=${q(dNew)}, nach trash=${q(dGone)}`);

    // --- H ---------------------------------------------------------------------
    console.log("\nH · Verdeckungsprobe");
    const h = await cdp.evaluate<{ hit: boolean; tag: string | null }>(`
      const el = document.querySelector('.nav-folder-title[data-path="repo-notes"]');
      if (!el) return { hit: false, tag: null };
      const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { hit: !!at && (at === el || el.contains(at)), tag: at ? at.className : null };
    `);
    record("H elementFromPoint auf repo-notes trifft die Titelzeile", h.hit, `getroffen=${q(h.tag)}`);
    // --- G ---------------------------------------------------------------------
    console.log("\nG · Settings-Tab");
    await cdp.evaluate(`app.setting.open(); await new Promise((r) => setTimeout(r, 500)); app.setting.openTabById(${q(PLUGIN_ID)}); await new Promise((r) => setTimeout(r, 1000)); return true;`);
    let sCdp: Cdp = cdp;
    const asModal = await cdp.evaluate<boolean>(`return Boolean(document.querySelector(".modal.mod-settings"));`);
    let ownWindow = false;
    if (!asModal) { const w = await attachTo("settings", port, REPO_NAME); if (w) { sCdp = w; ownWindow = true; } }
    const g = await sCdp.evaluate<{ first: string | null; hidden: string | null; sync: string | null; syncDisabled: boolean | null }>(`
      const root = document.querySelector(".modal.mod-settings") || document.body;
      const items = Array.from(root.querySelectorAll(".vertical-tab-content .setting-item, .setting-item"));
      const first = items.length ? (items[0].querySelector(".setting-item-name") || {}).textContent || null : null;
      const all = root.textContent || "";
      const hidden = (all.match(/(\\d+) folder\\(s\\) are hidden right now|(\\d+) Ordner sind gerade ausgeblendet/) || [null])[0];
      const sync = (all.match(/Obsidian Sync is not (enabled|available)[^.]*\\.|Obsidian Sync ist in diese[mr] (Vault|App) nicht [^.]*\\.|Obsidian Sync is enabled, but[^.]*\\.|Obsidian Sync ist aktiv, aber[^.]*\\.|\\d+ folder\\(s\\) are excluded from Sync by Shadow Tree\\.|\\d+ Ordner sind durch Shadow Tree von Sync ausgeschlossen\\.|Sync status has not been checked yet[^.]*\\.|Der Sync-Status wurde noch nicht geprüft[^.]*\\./) || [null])[0];
      const toggle = Array.from(root.querySelectorAll(".checkbox-container")).find((t) => /exclude hidden folders|Ordner auch aus Obsidian Sync/i.test((t.closest(".setting-item") || {}).textContent || ""));
      return { first, hidden, sync, syncDisabled: toggle ? toggle.classList.contains("is-disabled") || toggle.hasAttribute("disabled") || toggle.getAttribute("aria-disabled") === "true" : null };
    `);
    record("G Settings: Hilfe-Zeile zuerst, „3 folder(s) are hidden“, Sync-Statuszeile vorhanden", (g.first === "Help" || g.first === "Hilfe") && /^3 /.test(g.hidden ?? "") && g.sync !== null, `erste Zeile=${q(g.first)} · hidden=${q(g.hidden)} · sync=${q(g.sync)} · Toggle gesperrt=${q(g.syncDisabled)}`);
    notMeasured("G2 Sync-Schreibpfad (setIgnoreFolders)", "kein Sync-Konto im Staging-Vault; Abnahme an einem Vault mit aktivem Sync (Handover)");
    if (ownWindow) sCdp.close();
    // Das Einstellungen-Fenster (ab 1.13 eigenes Fenster) schließt nur `app.setting.close()` im Hauptfenster; die
    // CDP-Verbindung zu schließen lässt es offen stehen (gemessen 2026-09-30: Zielliste zeigte es nach dem Lauf).
    await cdp.evaluate(`app.setting.close(); return true;`).catch(() => undefined);
    await pollUntil<{ ok: boolean }>(cdp, `return document.querySelector(".modal-container") ? null : { ok: true };`, 4000, 200);

  } finally {
    // Aufräumen auf den Vorwert — auch nach Abbruch.
    try {
      await cdp.evaluate(`
        const p = app.plugins.plugins[${q(PLUGIN_ID)}];
        if (p) { if (${pinnedForTest}) await p.setPin("repo-empty", null); if (p.revealed) p.toggleReveal(); }
        if (${createdNote}) { const f = app.vault.getAbstractFileByPath("repo-empty/smoke-note.md"); if (f) await app.fileManager.trashFile(f); }
        return true;
      `);
    } catch { console.log("  ! Aufräumen im Renderer fehlgeschlagen — Pins/Notiz im Staging-Vault von Hand prüfen"); }
    cdp.close();
  }

  const n = (z: Zustand) => checks.filter((c) => c.zustand === z).length;
  console.log(`\nBilanz: ${n("gruen")} grün · ${n("rot")} rot · ${n("uebersprungen")} übersprungen · ${n("nichts-gemessen")} nichts gemessen · Nenner ${checks.length}`);
  for (const w of warnungen) console.log(`  ⚠ ${w}`);
  if (n("rot") > 0) process.exitCode = 1;
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 2; });
