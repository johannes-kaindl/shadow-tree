import { Notice, Plugin, TFolder, getLanguage, setIcon } from "obsidian";
import "./i18n/strings";
import { pickLang, setLang, t } from "./vendor/kit/i18n";
import { tn } from "./i18n/strings";
import { createDebouncer, type Debouncer, type Timers } from "./core/debounce";
import { evaluate, evaluateSyncTargets, rulesFromSettings, type HiddenFolder } from "./core/evaluate";
import { ribbonState } from "./core/hidden-view";
import { loadSettings, pinOf, withPin, type PinState, type ShadowTreeSettings } from "./core/settings";
import { planSyncExclusions } from "./core/sync-plan";
import { addPinMenuItems } from "./obsidian/folder-menu";
import { installFolderHide, type FolderHideHandle } from "./vendor/kit-obsidian/folder-hide";
import { ShadowTreeSettingTab } from "./obsidian/settings-tab";
import { syncFacade, type SyncUnavailable } from "./obsidian/sync-exclude";
import { snapshotVault } from "./obsidian/tree-snapshot";

export type SyncStatus =
  | { kind: "pending" }
  | { kind: "unavailable"; reason: SyncUnavailable }
  | { kind: "ok"; managed: number; total: number }
  | { kind: "partial"; arrived: number; wanted: number }
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
  /** Muster- und Pin-Treffer für Obsidian Sync, auch unter „leer“ ausgeblendeten Vorfahren; leer, solange der Opt-in aus ist. */
  syncTargets: HiddenFolder[] = [];
  invalidPatterns: string[] = [];
  /** Sitzungszustand „alles einblenden“; nicht persistiert (Spec § 6). */
  revealed = false;
  sheetSupported = true;
  /** Injizierbar für Tests. */
  installSheet: typeof installFolderHide = installFolderHide;
  timers: Timers = { set: (cb, ms) => window.setTimeout(cb, ms), clear: (id) => window.clearTimeout(id) };

  private sheet: FolderHideHandle | null = null;
  private ribbon: HTMLElement | null = null;
  private viewDebounce!: Debouncer;
  private syncDebounce!: Debouncer;
  private lastSync: SyncStatus = { kind: "pending" };
  /** Nach einem Wurf von `setIgnoreFolders` ist unklar, ob Sync die Liste gespeichert hat: der nächste Lauf schreibt
   *  dieselbe Liste noch einmal, auch wenn der Plan „unverändert“ sagt. */
  private retryWrite = false;
  private noticed = false;
  private unloaded = false;

  async onload(): Promise<void> {
    setLang(pickLang(safeGetLanguage()));
    this.settings = loadSettings(await this.loadData());
    this.viewDebounce = createDebouncer(() => { this.recompute(); }, VIEW_DEBOUNCE_MS, this.timers);
    this.syncDebounce = createDebouncer(() => { this.applySync(); }, SYNC_DEBOUNCE_MS, this.timers);

    this.ribbon = this.addRibbonIcon("eye-off", tn("ribbon.hiding", 0), () => { this.toggleReveal(); });
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
      if (this.unloaded) return;
      const doc = this.app.workspace.rootSplit.doc;
      this.sheet = this.installSheet(doc, [], true, (e) => { this.onSheetError(e); });
      this.sheetSupported = this.sheet.supported;
      this.recompute();
    });
  }

  onunload(): void {
    this.unloaded = true;
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
    const snapshot = snapshotVault(this.app.vault.getRoot());
    this.hidden = evaluate(snapshot, rules);
    this.syncTargets = this.settings.syncExclude ? evaluateSyncTargets(snapshot, rules) : [];
    this.applyView();
    this.syncDebounce.schedule();
  }

  toggleReveal(): void {
    this.revealed = !this.revealed;
    this.applyView();
  }

  /** Verfügbarkeit live (billig), Ergebnis des letzten Schreibversuchs aus dem Cache — sonst zeigte der Tab bis zu
   *  3 s den alten Zustand und sperrte den Schalter, obwohl Sync inzwischen an ist (Review 2026-09-30, Befund 6). */
  syncStatus(): SyncStatus {
    const facade = syncFacade(this.app);
    if (!facade.available) return { kind: "unavailable", reason: facade.reason };
    return this.lastSync.kind === "unavailable" ? { kind: "pending" } : this.lastSync;
  }

  private applyView(): void {
    // Kit 0.46.0: eine Liste statt eines Ordners; `hide=true` mit leerer Liste ergibt ein leeres Blatt.
    this.sheet?.update(this.revealed ? [] : this.hidden.map((h) => h.path), true);
    if (this.ribbon) {
      const st = ribbonState(this.hidden.length, this.revealed);
      setIcon(this.ribbon, st.icon);
      this.ribbon.setAttribute("aria-label", st.labelKey === "ribbon.hiding" ? tn("ribbon.hiding", st.count) : t(st.labelKey));
      this.ribbon.setAttribute("aria-pressed", String(!this.revealed));
    }
  }

  /** Sync-Ausschluss (Opt-in, Spec § 7). Schreibt nur bei echter Änderung; eigene Einträge stehen in
   *  `syncManaged`, fremde werden nie entfernt. `saveData` direkt, nicht `saveSettings` — sonst Schleife. */
  private applySync(): void {
    const facade = syncFacade(this.app);
    if (!facade.available) { this.lastSync = { kind: "unavailable", reason: facade.reason }; return; }
    // Nur Muster- und Pin-Treffer wandern in die Sync-Liste. Ein bloß „leerer“ Ordner kann Anhänge tragen, die der
    // Nutzer auf anderen Geräten will, und ein auf Gerät B leerer Ordner bekäme dort nie die Notizen von Gerät A
    // (Selbstsperre) — Review 2026-09-30, Befund 3. Die Treffer kommen aus `evaluateSyncTargets`, nicht aus `hidden`:
    // dort verschluckt ein „leerer“ Elternordner alle Muster-Kinder darunter (`__pycache__` in `scripts/` ohne Notizen).
    const desired = this.syncTargets.map((h) => h.path);
    const plan = planSyncExclusions(facade.getIgnoreFolders(), this.settings.syncManaged, desired);
    let managed = plan.managed;
    let failure: string | null = null;
    if (plan.changed || this.retryWrite) {
      try {
        facade.setIgnoreFolders(plan.next);
        this.retryWrite = false;
      } catch (e) {
        failure = e instanceof Error ? e.message : String(e);
        this.retryWrite = true;
      }
      // Zurücklesen: gültig ist, was in Syncs Liste steht, nicht was wir schreiben wollten (CORE-DATA-01). Auch nach einem
      // Wurf, denn Sync ändert seine Liste im Speicher, bevor `changeFilter` fertig ist und `forceSaveData` läuft
      // (Messung 2026-10-23, Welle 26: `RangeError` aus `unshift.apply`, Liste im Speicher neu, Ablage alt).
      const arrived = new Set(facade.getIgnoreFolders());
      managed = plan.managed.filter((p) => arrived.has(p));
    }
    if (managed.join("\n") !== this.settings.syncManaged.join("\n")) {
      this.settings.syncManaged = managed;
      this.saveData(this.settings).catch((e: unknown) => { console.error("shadow-tree: saving syncManaged failed", e); });
    }
    if (failure !== null) {
      this.lastSync = { kind: "error", message: failure };
      new Notice(t("sync.error", failure), 8000);
    } else if (managed.length < plan.managed.length) {
      const was = this.lastSync;
      this.lastSync = { kind: "partial", arrived: managed.length, wanted: plan.managed.length };
      if (was.kind !== "partial" || was.arrived !== managed.length || was.wanted !== plan.managed.length) {
        new Notice(t("sync.partial", String(managed.length), String(plan.managed.length)), 8000);
      }
    } else {
      this.lastSync = { kind: "ok", managed: managed.length, total: facade.getIgnoreFolders().length };
    }
  }

  private onSheetError(e: unknown): void {
    console.error("shadow-tree: stylesheet failed — folders stay visible (cosmetic)", e);
    if (this.noticed) return;
    this.noticed = true;
    new Notice(t("notice.sheetFailed"), 8000);
  }
}
