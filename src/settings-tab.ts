import { App, PluginSettingTab, Setting } from "obsidian";
import SimpleTimeTrackerPlugin from "./main";
import { defaultSettings } from "./settings";

export class SimpleTimeTrackerSettingsTab extends PluginSettingTab {

    plugin: SimpleTimeTrackerPlugin;

    constructor(app: App, plugin: SimpleTimeTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();
        this.containerEl.createEl("h2", { text: "Super Simple Time Tracker Settings" });

        new Setting(this.containerEl)
            .setName("Timestamp Display Format")
            .setDesc(createFragment(f => {
                f.createSpan({ text: "The way that timestamps in time tracker tables should be displayed. Uses " });
                f.createEl("a", { text: "moment.js", href: "https://momentjs.com/docs/#/parsing/string-format/" });
                f.createSpan({ text: " syntax." });
            }))
            .addText(t => {
                t.setValue(String(this.plugin.settings.timestampFormat));
                t.onChange(async v => {
                    this.plugin.settings.timestampFormat = v.length ? v : defaultSettings.timestampFormat;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl)
            .setName("CSV Delimiter")
            .setDesc("The delimiter character that should be used when copying a tracker table as CSV. For example, some languages use a semicolon instead of a comma.")
            .addText(t => {
                t.setValue(String(this.plugin.settings.csvDelimiter));
                t.onChange(async v => {
                    this.plugin.settings.csvDelimiter = v.length ? v : defaultSettings.csvDelimiter;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl)
            .setName("Fine-Grained Durations")
            .setDesc("Whether durations should include days, months and years. If this is disabled, additional time units will be displayed as part of the hours.")
            .addToggle(t => {
                t.setValue(this.plugin.settings.fineGrainedDurations);
                t.onChange(async v => {
                    this.plugin.settings.fineGrainedDurations = v;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl)
            .setName("Timestamp Durations")
            .setDesc("Whether durations should be displayed in a timestamp format (12:15:01) rather than the default duration format (12h 15m 1s).")
            .addToggle(t => {
                t.setValue(this.plugin.settings.timestampDurations);
                t.onChange(async v => {
                    this.plugin.settings.timestampDurations = v;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl)
            .setName("Display Segments in Reverse Order")
            .setDesc("Whether older tracker segments should be displayed towards the bottom of the tracker, rather than the top.")
            .addToggle(t => {
                t.setValue(this.plugin.settings.reverseSegmentOrder);
                t.onChange(async v => {
                    this.plugin.settings.reverseSegmentOrder = v;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl)
            .setName('Show Total Today')
            .setDesc('Whether the total time spent today should be displayed in the tracker table.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.showToday);
                t.onChange(async v => {
                    this.plugin.settings.showToday = v;
                    await this.plugin.saveSettings();
                });
            });

        
        new Setting(this.containerEl)
            .setName("Timestamp Rounding")
            .setDesc("Whether timestamp are rounded to the nearest interval")
            .addToggle(t => {
                t.setValue(this.plugin.settings.timestampRounding);
                t.onChange(async v => {
                    this.plugin.settings.timestampRounding = v;
                    await this.plugin.saveSettings();
                });
            });

        this.containerEl.createEl("hr");
        this.containerEl.createEl("p", { text: "Need help using the plugin? Feel free to join the Discord server!" });
        this.containerEl.createEl("a", { href: "https://link.ellpeck.de/discordweb" }).createEl("img", {
            attr: { src: "https://ellpeck.de/res/discord-wide.png" },
            cls: "simple-time-tracker-settings-image"
        });
        this.containerEl.createEl("p", { text: "If you like this plugin and want to support its development, you can do so through my website by clicking this fancy image!" });
        this.containerEl.createEl("a", { href: "https://ellpeck.de/support" }).createEl("img", {
            attr: { src: "https://ellpeck.de/res/generalsupport-wide.png" },
            cls: "simple-time-tracker-settings-image"
        });
    }
}
