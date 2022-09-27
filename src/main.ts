import { ButtonComponent, MarkdownView, Plugin, TextComponent } from "obsidian";
import { defaultSettings, SimpleTimeTrackerSettings } from "./settings";
import { SimpleTimeTrackerSettingsTab } from "./settings-tab";
import { Tracker } from "./tracker";

export default class SimpleTimeTrackerPlugin extends Plugin {

	settings: SimpleTimeTrackerSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SimpleTimeTrackerSettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("simple-time-tracker", (s, e, i) => {
			e.empty();
			e.addClass("simple-time-tracker");

			let tracker = Tracker.load(s);

			let name = new TextComponent(e)
				.setPlaceholder("Name this segment");
			new ButtonComponent(e)
				.setButtonText("Start")
				.onClick(() => {
					tracker.start(name.getValue());

					// TODO how do we save to the code block??
					tracker.save();
				});
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, defaultSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
