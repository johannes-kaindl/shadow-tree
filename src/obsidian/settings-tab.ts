import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type ShadowTreePlugin from "../main";
import { t } from "../vendor/kit/i18n";
import { renderSettingDefinitions, settingBodyHost, refreshSettingsTab } from "../vendor/kit-obsidian/settings_walker";
import { githubHelpUrls, helpSettingDefinition, type HelpSettingOptions } from "../vendor/kit-obsidian/help-setting";
import { FolderSuggest } from "../vendor/kit-obsidian/folder-suggest";
import { hiddenView } from "../core/hidden-view";
import { normalizeFolderPath } from "../core/ignore";
import { withPin, type PinState } from "../core/settings";

/** Doku-Index und Issues auf GitHub (Repo-Name); `open` nur für Tests. */
export function helpOptions(open?: (url: string) => void): HelpSettingOptions {
  return {
    ...githubHelpUrls("shadow-tree"),
    texts: { name: t("help.name"), desc: t("help.desc"), openDocs: t("help.openDocs"), reportIssue: t("help.reportIssue") },
    ...(open ? { open } : {}),
  };
}

type ItemDef = { name?: string; desc?: string; visible?: () => boolean; control?: { type: string; key: string; rows?: number }; render?: (setting: Setting) => void };
type GroupDef = { type: "group"; heading: string; items: ItemDef[] };

export class ShadowTreeSettingTab extends PluginSettingTab {
  private cleanupPrevious: () => void = () => {};

  constructor(app: App, readonly plugin: ShadowTreePlugin) {
    super(app, plugin);
  }

  /** Deklarativ (Obsidian ≥ 1.13 rendert das selbst); darunter zeichnet `display()` dieselbe Struktur
   *  mit dem Kit-Walker nach. Hilfe-Zeile (UI-STANDARD §8) ist immer das ERSTE Element. */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const defs: (GroupDef | ReturnType<typeof helpSettingDefinition>)[] = [
      helpSettingDefinition(helpOptions()),
      { type: "group", heading: t("group.rules"), items: [
        { name: t("set.hideEmpty"), desc: t("set.hideEmptyDesc"), control: { type: "toggle", key: "hideEmpty" } },
        { name: t("set.extensions"), desc: t("set.extensionsDesc"), control: { type: "text", key: "relevantExtensions" } },
        { name: t("set.patterns"), desc: t("set.patternsDesc"), control: { type: "textarea", key: "ignorePatterns", rows: 6 } },
        { name: t("set.patterns"), visible: () => this.plugin.invalidPatterns.length > 0, render: (s) => { this.renderInvalid(s); } },
      ] },
      { type: "group", heading: t("group.pins"), items: [
        { name: t("group.pins"), desc: t("set.pinsDesc"), render: (s) => { this.renderPins(s); } },
      ] },
      { type: "group", heading: t("group.hidden"), items: [
        { name: t("group.hidden"), render: (s) => { this.renderHidden(s); } },
      ] },
      { type: "group", heading: t("group.sync"), items: [
        { name: t("set.syncExclude"), desc: t("set.syncExcludeDesc"), render: (s) => { this.renderSyncToggle(s); } },
        { name: t("group.sync"), render: (s) => { this.renderSyncStatus(s); } },
      ] },
    ];
    return defs as unknown as SettingDefinitionItem[];
  }

  /** Host-Vertrag der deklarativen Controls (nativ ab 1.13 und im Kit-Walker). */
  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const s = this.plugin.settings;
    switch (key) {
      case "hideEmpty": s.hideEmpty = Boolean(value); break;
      case "relevantExtensions": s.relevantExtensions = typeof value === "string" ? value : ""; break;
      case "ignorePatterns": s.ignorePatterns = typeof value === "string" ? value : ""; break;
      case "syncExclude": s.syncExclude = Boolean(value); break;
      default: return;
    }
    await this.plugin.saveSettings();
    this.refreshUi();
  }

  display(): void {
    this.renderImperative();
  }

  /* `display()` ist seit 1.13 als veraltet markiert; der volle Rebuild lebt deshalb hier, `display()` bleibt der
   * schlichte Fallback-Einstieg (Muster aus llm-endpoint-manager). */
  private renderImperative(): void {
    this.cleanupPrevious();
    this.containerEl.empty();
    this.cleanupPrevious = renderSettingDefinitions(this.containerEl, this.getSettingDefinitions(), this, this.app);
  }

  private refreshUi(): void {
    refreshSettingsTab(this, () => { this.renderImperative(); });
  }

  private async setPin(path: string, state: PinState | null): Promise<void> {
    this.plugin.settings = withPin(this.plugin.settings, path, state);
    await this.plugin.saveSettings();
    this.refreshUi();
  }

  private renderInvalid(setting: Setting): void {
    const host = settingBodyHost(setting);
    const bad = this.plugin.invalidPatterns;
    host.createDiv({ cls: "sht-status sht-warning", text: t("set.patternsInvalid", String(bad.length), bad.join(", ")) });
  }

  private renderPins(setting: Setting): void {
    const host = settingBodyHost(setting);
    host.createDiv({ cls: "sht-desc", text: t("set.pinsDesc") });
    const entries = Object.entries(this.plugin.settings.pins).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (entries.length === 0) host.createDiv({ cls: "sht-empty", text: t("pin.empty") });
    for (const [path, state] of entries) {
      const row = new Setting(host).setName(path);
      row.settingEl.addClass("sht-pin-row");
      row.addDropdown((d) => {
        d.addOption("show", t("pin.show")).addOption("hide", t("pin.hide")).setValue(state);
        d.selectEl.setAttribute("aria-label", t("pin.ariaState"));
        d.onChange((v) => { void this.setPin(path, v === "hide" ? "hide" : "show"); });
      });
      row.addExtraButton((b) => b.setIcon("trash-2").setTooltip(t("pin.remove")).onClick(() => { void this.setPin(path, null); }));
    }
    let newPath = "";
    let newState: PinState = "show";
    const adder = new Setting(host).setName(t("pin.add"));
    adder.settingEl.addClass("sht-pin-row");
    adder.addText((tx) => {
      tx.setPlaceholder(t("pin.addPlaceholder"));
      tx.inputEl.setAttribute("aria-label", t("pin.ariaPath"));
      tx.onChange((v) => { newPath = v; });
      new FolderSuggest(this.app, tx.inputEl);
    });
    adder.addDropdown((d) => {
      d.addOption("show", t("pin.show")).addOption("hide", t("pin.hide")).setValue("show");
      d.selectEl.setAttribute("aria-label", t("pin.ariaState"));
      d.onChange((v) => { newState = v === "hide" ? "hide" : "show"; });
    });
    adder.addButton((b) => b.setButtonText(t("pin.add")).setCta().onClick(() => {
      if (normalizeFolderPath(newPath) === "") return;
      void this.setPin(newPath, newState);
    }));
  }

  private renderHidden(setting: Setting): void {
    const host = settingBodyHost(setting);
    const view = hiddenView(this.plugin.hidden);
    if (!this.plugin.sheetSupported) host.createDiv({ cls: "sht-status sht-warning", text: t("hidden.unsupported") });
    if (this.plugin.revealed) host.createDiv({ cls: "sht-status", text: t("hidden.revealed") });
    host.createDiv({ cls: "sht-status", text: view.total === 0 ? t("hidden.none") : t("hidden.count", String(view.total)) });
    const list = host.createDiv({ cls: "sht-hidden-list" });
    for (const row of view.rows) {
      const r = list.createDiv({ cls: "sht-hidden-row" });
      r.createSpan({ cls: "sht-hidden-path", text: row.path });
      r.createSpan({ cls: "sht-hidden-reason", text: row.detail !== "" ? t(row.reasonKey, row.detail) : t(row.reasonKey) });
    }
    if (view.more > 0) list.createDiv({ cls: "sht-hidden-row sht-hidden-more", text: t("hidden.more", String(view.more)) });
    host.createDiv({ cls: "sht-status", text: t("hidden.searchNote") });
  }

  /** §8 Zustands-Knopf: ein nativer Toggle erfüllt die Regel; gesperrt sagt der Tooltip, warum. */
  private renderSyncToggle(setting: Setting): void {
    const status = this.plugin.syncStatus();
    setting.setName(t("set.syncExclude")).setDesc(t("set.syncExcludeDesc"));
    setting.addToggle((tg) => {
      tg.setValue(this.plugin.settings.syncExclude);
      tg.toggleEl.setAttribute("aria-label", t("set.syncExclude"));
      if (status.kind === "unavailable") {
        tg.setDisabled(true);
        tg.setTooltip(t(`sync.unavailable.${status.reason}`));
      }
      tg.onChange((v) => { void this.setControlValue("syncExclude", v); });
    });
  }

  private renderSyncStatus(setting: Setting): void {
    const host = settingBodyHost(setting);
    const status = this.plugin.syncStatus();
    const text = status.kind === "pending" ? t("sync.pending")
      : status.kind === "unavailable" ? t(`sync.unavailable.${status.reason}`)
      : status.kind === "error" ? t("sync.error", status.message)
      : t("sync.managed", String(status.managed));
    host.createDiv({ cls: status.kind === "error" ? "sht-status sht-warning" : "sht-status", text });
  }
}
