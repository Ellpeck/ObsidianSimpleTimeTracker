import { App, PluginSettingTab } from "obsidian";
import SimpleTimeTrackerPlugin from "./main";

export class SimpleTimeTrackerSettingsTab extends PluginSettingTab {

    plugin: SimpleTimeTrackerPlugin;

    constructor(app: App, plugin: SimpleTimeTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();
        this.containerEl.createEl("h2", { text: "Simple Time Tracker Settings" });

        // TODO settings go here

        this.containerEl.createEl("hr");
        this.containerEl.createEl("p", { text: "If you like this plugin and want to support its development, you can do so through my website by clicking this fancy image!" });
        this.containerEl.createEl("a", { href: "https://ellpeck.de/support" })
            .createEl("img", { attr: { src: "https://ellpeck.de/res/generalsupport.png" }, cls: "simple-time-tracker-support" });
    }
}
