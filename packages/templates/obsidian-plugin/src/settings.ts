import { type App, PluginSettingTab, Setting } from "obsidian";
import type {{PluginName}}Plugin from "./main";

export type PluginSettings = {
  mySetting: string;
};

export const DEFAULT_SETTINGS: PluginSettings = {
  mySetting: "default",
};

export class SettingTab extends PluginSettingTab {
  plugin: {{PluginName}}Plugin;

  constructor(app: App, plugin: {{PluginName}}Plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Setting")
      .setDesc("A sample setting")
      .addText((text) =>
        text
          .setPlaceholder("Enter value")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
