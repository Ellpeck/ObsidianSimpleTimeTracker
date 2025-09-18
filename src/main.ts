import { MarkdownRenderChild, Plugin, TFile } from "obsidian";
import { defaultSettings, SimpleTimeTrackerSettings } from "./settings";
import { SimpleTimeTrackerSettingsTab } from "./settings-tab";
import { displayStatistics } from "./statistics";
import { displayTracker, Entry, formatDuration, formatTimestamp, getDuration, getDurationToday, getRunningEntry, getTotalDuration, getTotalDurationToday, isRunning, loadAllTrackers, loadTracker, orderedEntries } from "./tracker";

export default class SimpleTimeTrackerPlugin extends Plugin {

    public api = {
        // verbatim versions of the functions found in tracker.ts with the same parameters
        loadTracker, loadAllTrackers, getDuration, getTotalDuration, getDurationToday, getTotalDurationToday, getRunningEntry, isRunning,

        // modified versions of the functions found in tracker.ts, with the number of required arguments reduced
        formatTimestamp: (timestamp: string) => formatTimestamp(timestamp, this.settings),
        formatDuration: (totalTime: number) => formatDuration(totalTime, this.settings),
        orderedEntries: (entries: Entry[]) => orderedEntries(entries, this.settings)
    };
    public settings: SimpleTimeTrackerSettings;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.addSettingTab(new SimpleTimeTrackerSettingsTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor("simple-time-tracker", (s, e, i) => {
            e.empty();
            let component = new MarkdownRenderChild(e);
            let tracker = loadTracker(s);

            // Wrap file name in a function since it can change
            let filePath = i.sourcePath;
            const getFile = () => filePath;

            // Hook rename events to update the file path
            component.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
                if (file instanceof TFile && oldPath === filePath) {
                    filePath = file.path;
                }
            }));

            displayTracker(tracker, e, getFile, () => i.getSectionInfo(e), this.settings, component);
            i.addChild(component);
        });

        this.registerMarkdownCodeBlockProcessor("simple-time-tracker-statistics", (s, e, i) => {
            e.empty();
            const component = new MarkdownRenderChild(e);

            displayStatistics(e, this, i.sourcePath);

            i.addChild(component);
        });

        this.addCommand({
            id: `insert`,
            name: `Insert Time Tracker`,
            editorCallback: (e, _) => {
                e.replaceSelection("```simple-time-tracker\n```\n");
             }
        });

        this.addCommand({
            id: `insert-stats`,
            name: `Insert Time Tracker Statistics`,
            editorCallback: (e, _) => {
                e.replaceSelection("```simple-time-tracker-statistics\n```\n");
            }
        });

    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, defaultSettings, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
