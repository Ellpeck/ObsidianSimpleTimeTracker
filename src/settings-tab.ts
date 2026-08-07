import {App, PluginSettingTab, SettingGroup} from "obsidian";
import SimpleTimeTrackerPlugin from "./main";
import {defaultSettings} from "./settings";

export class SimpleTimeTrackerSettingsTab extends PluginSettingTab {

    plugin: SimpleTimeTrackerPlugin;

    constructor(app: App, plugin: SimpleTimeTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.icon = "timer";
    }

    display(): void {
        this.containerEl.empty();

        let group = new SettingGroup(this.containerEl);
        group.addSetting(s => void s
            .setName("Timestamp display format")
            .setDesc(createFragment(f => {
                f.createSpan({ text: "The way that timestamps in time tracker tables should be displayed. Uses " });
                f.createEl("a", { text: "moment.js", href: "https://momentjs.com/docs/#/parsing/string-format/" });
                f.createSpan({ text: " syntax." });
            }))
            .addText(t => {
                void t.setValue(String(this.plugin.settings.timestampFormat));
                void t.onChange(async v => {
                    this.plugin.settings.timestampFormat = v.length ? v : defaultSettings.timestampFormat;
                    await this.plugin.saveSettings();
                });
            }));

        group.addSetting(s => void s
            .setName("CSV delimiter")
            .setDesc("The delimiter character that should be used when copying a tracker table as CSV. For example, some languages use a semicolon instead of a comma.")
            .addText(t => {
                void t.setValue(String(this.plugin.settings.csvDelimiter));
                void t.onChange(async v => {
                    this.plugin.settings.csvDelimiter = v.length ? v : defaultSettings.csvDelimiter;
                    await this.plugin.saveSettings();
                });
            }));

        group.addSetting(s => void s
            .setName("Fine-grained durations")
            .setDesc("Whether durations should include days, months and years. If this is disabled, additional time units will be displayed as part of the hours.")
            .addToggle(t => {
                void t.setValue(this.plugin.settings.fineGrainedDurations);
                void t.onChange(async v => {
                    this.plugin.settings.fineGrainedDurations = v;
                    await this.plugin.saveSettings();
                });
            }));

        group.addSetting(s => void s
            .setName("Timestamp durations")
            .setDesc("Whether durations should be displayed in a timestamp format (12:15:01) rather than the default duration format (12h 15m 1s).")
            .addToggle(t => {
                void t.setValue(this.plugin.settings.timestampDurations);
                void t.onChange(async v => {
                    this.plugin.settings.timestampDurations = v;
                    await this.plugin.saveSettings();
                });
            }));

        group.addSetting(s => void s
            .setName("Display segments in reverse order")
            .setDesc("Whether older tracker segments should be displayed towards the bottom of the tracker, rather than the top.")
            .addToggle(t => {
                void t.setValue(this.plugin.settings.reverseSegmentOrder);
                void t.onChange(async v => {
                    this.plugin.settings.reverseSegmentOrder = v;
                    await this.plugin.saveSettings();
                });
            }));

        group.addSetting(s => void s
            .setName("Show total today")
            .setDesc("Whether the total time spent today should be displayed in the tracker table.")
            .addToggle(t => {
                void t.setValue(this.plugin.settings.showToday);
                void t.onChange(async v => {
                    this.plugin.settings.showToday = v;
                    await this.plugin.saveSettings();
                });
            }));

        group.addSetting(s => void s
            .setName("Use monospaced font for times")
            .setDesc("Whether your configured monospaced font should be used for the times in the title, causing them to jump around less while counting up.")
            .addToggle(t => {
                void t.setValue(this.plugin.settings.useMonospacedFont);
                void t.onChange(async v => {
                    this.plugin.settings.useMonospacedFont = v;
                    await this.plugin.saveSettings();
                });
            }));

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
