import { Notice, Plugin, TFolder, getLanguage, setIcon } from "obsidian";
import "./i18n/strings";
import { pickLang, setLang, t } from "./vendor/kit/i18n";
import { createDebouncer, type Debouncer, type Timers } from "./core/debounce";
import { evaluate, rulesFromSettings, type HiddenFolder } from "./core/evaluate";
import { ribbonState } from "./core/hidden-view";
import { loadSettings, pinOf, withPin, type PinState, type ShadowTreeSettings } from "./core/settings";
import { planSyncExclusions } from "./core/sync-plan";
import { addPinMenuItems } from "./obsidian/folder-menu";
import { installHideSheet, type HideSheetHandle } from "./obsidian/hide-sheet";
import { ShadowTreeSettingTab } from "./obsidian/settings-tab";
import { syncFacade, type SyncUnavailable } from "./obsidian/sync-exclude";
import { snapshotVault } from "./obsidian/tree-snapshot";

export type SyncStatus =
  | { kind: "unavailable"; reason: SyncUnavailable }
  | { kind: "ok"; managed: number }
  | { kind: "error"; message: string };

/** Ansicht: Vault-Events werden auf 250 ms entprellt; der Sync-Schreibpfad wartet weitere 3 s Ruhe,
 *  damit ein Ordner, der während einer Umbenennung kurz leer ist, keinen Sync-Schreibvorgang erzeugt (Spec § 7). */
export const VIEW_DEBOUNCE_MS = 250;
export const SYNC_DEBOUNCE_MS = 3000;

function safeGetLanguage(): string | null {
  try { return getLanguage(); } catch { return null; }
}

export default class ShadowTreePlugin extends Plugin {
  settings: ShadowTreeSettings = loadSettings(null);
  /** Oberste ausgeblendete Ordner der letzten Berechnung. */
  hidden: HiddenFolder[] = [];
  invalidPatterns: string[] = [];
  /** Sitzungszustand „alles einblenden“; nicht persistiert (Spec § 6). */
  revealed = false;
  sheetSupported = true;
  /** Injizierbar für Tests. */
  installSheet: typeof installHideSheet = installHideSheet;
  timers: Timers = { set: (cb, ms) => window.setTimeout(cb, ms), clear: (id) => window.clearTimeout(id) };

  private sheet: HideSheetHandle | null = null;
  private ribbon: HTMLElement | null = null;
  private viewDebounce!: Debouncer;
  private syncDebounce!: Debouncer;
  private lastSync: SyncStatus = { kind: "unavailable", reason: "no-plugin" };
  private noticed = false;

  async onload(): Promise<void> {
    setLang(pickLang(safeGetLanguage()));
    this.settings = loadSettings(await this.loadData());
    this.viewDebounce = createDebouncer(() => { this.recompute(); }, VIEW_DEBOUNCE_MS, this.timers);
    this.syncDebounce = createDebouncer(() => { this.applySync(); }, SYNC_DEBOUNCE_MS, this.timers);

    this.ribbon = this.addRibbonIcon("eye-off", t("ribbon.hiding", "0"), () => { this.toggleReveal(); });
    this.ribbon.setAttribute("aria-pressed", "true");
    this.addCommand({ id: "toggle-hidden-folders", name: t("cmd.toggle"), callback: () => { this.toggleReveal(); } });

    this.registerEvent(this.app.vault.on("create", () => { this.viewDebounce.schedule(); }));
    this.registerEvent(this.app.vault.on("delete", () => { this.viewDebounce.schedule(); }));
    this.registerEvent(this.app.vault.on("rename", () => { this.viewDebounce.schedule(); }));
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFolder) || file.isRoot()) return;
      addPinMenuItems(menu, pinOf(this.settings, file.path), (state) => { void this.setPin(file.path, state); });
    }));
    this.addSettingTab(new ShadowTreeSettingTab(this.app, this));

    // Das Hauptfenster, in dem der Datei-Explorer lebt — nicht activeDocument (Pop-out-Falle, Kit-Modulkopf).
    this.app.workspace.onLayoutReady(() => {
      const doc = this.app.workspace.rootSplit.doc;
      this.sheet = this.installSheet(doc, [], (e) => { this.onSheetError(e); });
      this.sheetSupported = this.sheet.supported;
      this.recompute();
    });
  }

  onunload(): void {
    this.viewDebounce.cancel();
    this.syncDebounce.cancel();
    this.sheet?.remove();
    this.sheet = null;
  }

  /** Speichern rechnet immer neu: Regeln, Pins und Schalter wirken sofort. */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.recompute();
  }

  async setPin(path: string, state: PinState | null): Promise<void> {
    this.settings = withPin(this.settings, path, state);
    await this.saveSettings();
  }

  recompute(): void {
    const { rules, invalidPatterns } = rulesFromSettings(this.settings);
    this.invalidPatterns = invalidPatterns;
    this.hidden = evaluate(snapshotVault(this.app.vault.getRoot()), rules);
    this.applyView();
    this.syncDebounce.schedule();
  }

  toggleReveal(): void {
    this.revealed = !this.revealed;
    this.applyView();
  }

  syncStatus(): SyncStatus {
    return this.lastSync;
  }

  private applyView(): void {
    this.sheet?.update(this.revealed ? [] : this.hidden.map((h) => h.path));
    if (this.ribbon) {
      const st = ribbonState(this.hidden.length, this.revealed);
      setIcon(this.ribbon, st.icon);
      this.ribbon.setAttribute("aria-label", t(st.labelKey, String(st.count)));
      this.ribbon.setAttribute("aria-pressed", String(!this.revealed));
    }
  }

  /** Sync-Ausschluss (Opt-in, Spec § 7). Schreibt nur bei echter Änderung; eigene Einträge stehen in
   *  `syncManaged`, fremde werden nie entfernt. `saveData` direkt, nicht `saveSettings` — sonst Schleife. */
  private applySync(): void {
    const facade = syncFacade(this.app);
    if (!facade.available) { this.lastSync = { kind: "unavailable", reason: facade.reason }; return; }
    const desired = this.settings.syncExclude ? this.hidden.map((h) => h.path) : [];
    const plan = planSyncExclusions(facade.getIgnoreFolders(), this.settings.syncManaged, desired);
    if (plan.changed) {
      try {
        facade.setIgnoreFolders(plan.next);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.lastSync = { kind: "error", message };
        new Notice(t("sync.error", message), 8000);
        return;
      }
    }
    if (plan.managed.join("\n") !== this.settings.syncManaged.join("\n")) {
      this.settings.syncManaged = plan.managed;
      void this.saveData(this.settings);
    }
    this.lastSync = { kind: "ok", managed: plan.managed.length };
  }

  private onSheetError(e: unknown): void {
    console.error("shadow-tree: stylesheet failed — folders stay visible (cosmetic)", e);
    if (this.noticed) return;
    this.noticed = true;
    new Notice(t("notice.sheetFailed"), 8000);
  }
}
