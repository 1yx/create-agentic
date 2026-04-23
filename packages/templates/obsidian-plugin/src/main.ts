import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type PluginSettings, SettingTab } from "./settings";

export default class {{PluginName}}Plugin extends Plugin {
  settings!: PluginSettings;

  async onload() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<PluginSettings>,
    );

    this.addSettingTab(new SettingTab(this.app, this));
  }

  onunload() {}

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
