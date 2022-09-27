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

			let tracker = loadTracker(s);
			let running = isRunning(tracker);

			let btn = new ButtonComponent(e)
				.setButtonText(running ? "End" : "Start")
				.onClick(async () => {
					if (running) {
						endEntry(tracker);
					} else {
						startEntry(tracker, name.getValue());
					}
					await saveTracker(tracker, this.app, i.getSectionInfo(e));
				});
			btn.buttonEl.addClass("simple-time-tracker-btn");

			let name = new TextComponent(e)
				.setPlaceholder("Segment name")
				.setDisabled(running);
			name.inputEl.addClass("simple-time-tracker-txt");

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
