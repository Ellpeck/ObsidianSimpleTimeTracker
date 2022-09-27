import { ButtonComponent, Plugin, TextComponent } from "obsidian";
import { defaultSettings, SimpleTimeTrackerSettings } from "./settings";
import { SimpleTimeTrackerSettingsTab } from "./settings-tab";
import { displayTracker, endEntry, isRunning, loadTracker, saveTracker, startEntry, Tracker } from "./tracker";

export default class SimpleTimeTrackerPlugin extends Plugin {

	settings: SimpleTimeTrackerSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SimpleTimeTrackerSettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("simple-time-tracker", (s, e, i) => {
			e.empty();
			e.addClass("simple-time-tracker");

			let tracker = loadTracker(s);

			let name = new TextComponent(e)
				.setPlaceholder("Name this segment");
			new ButtonComponent(e)
				.setButtonText("Start")
				.onClick(async () => {
					if (isRunning(tracker)) {
						endEntry(tracker);
					} else {
						startEntry(tracker, name.getValue());
					}
					name.setValue("");
					await saveTracker(tracker, this.app, i.getSectionInfo(e));
				});

			displayTracker(tracker, e);
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, defaultSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
