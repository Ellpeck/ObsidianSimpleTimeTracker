import { Editor, MarkdownRenderChild, moment, Plugin, TFile } from "obsidian";
import { defaultSettings, SimpleTimeTrackerSettings } from "./settings";
import { SimpleTimeTrackerSettingsTab } from "./settings-tab";
import {
    displayTracker,
    Entry,
    formatDuration,
    formatTimestamp,
    getDuration,
    getRunningEntry,
    getTotalDuration,
    isRunning,
    loadAllTrackers,
    loadTracker,
    orderedEntries,
} from "./tracker";
import { TimeTrackingSummary } from "./timeTrackingSummary";

export default class SimpleTimeTrackerPlugin extends Plugin {
    public api = {
        // verbatim versions of the functions found in tracker.ts with the same parameters
        loadTracker,
        loadAllTrackers,
        getDuration,
        getTotalDuration,
        getRunningEntry,
        isRunning,

        // modified versions of the functions found in tracker.ts, with the number of required arguments reduced
        formatTimestamp: (timestamp: string) =>
            formatTimestamp(timestamp, this.settings),
        formatDuration: (totalTime: number) =>
            formatDuration(totalTime, this.settings),
        orderedEntries: (entries: Entry[]) =>
            orderedEntries(entries, this.settings),
    };
    public settings: SimpleTimeTrackerSettings;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.addSettingTab(new SimpleTimeTrackerSettingsTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor(
            "simple-time-tracker",
            (s, e, i) => {
                e.empty();
                let component = new MarkdownRenderChild(e);
                let tracker = loadTracker(s);

                // Wrap file name in a function since it can change
                let filePath = i.sourcePath;
                const getFile = () => filePath;

                // Hook rename events to update the file path
                component.registerEvent(
                    this.app.vault.on("rename", (file, oldPath) => {
                        if (file instanceof TFile && oldPath === filePath) {
                            filePath = file.path;
                        }
                    })
                );

                displayTracker(
                    tracker,
                    e,
                    getFile,
                    () => i.getSectionInfo(e),
                    this.settings,
                    component
                );
                i.addChild(component);
            }
        );

        this.addCommand({
            id: `insert`,
            name: `Insert Time Tracker`,
            editorCallback: (e, _) => {
                e.replaceSelection("```simple-time-tracker\n```\n");
            },
        });

        this.addCommand({
            id: `insert-time-tracking-summary`,
            name: `Insert Time Tracking Summary`,
            editorCallback: (editor) => this.insertTimeTrackingSummarySummary(editor),
        });

        this.registerMarkdownCodeBlockProcessor(
            "time-tracking-summary",
            async (source, el, ctx) => {
                const sourceWithoutComments = source
                    .split("\n")[0]
                    .replace(/\/\/.*$/g, ''); // Remove everything after //
                    
                const params = sourceWithoutComments
                    .split(",")
                    .map((s) => s.trim());
                    
                const [startDateStr, endDateStr, streamKey] = params;
        
                const timeTracking = new TimeTrackingSummary(
                    this.app,
                    this.settings,
                    this.api
                );
                await timeTracking.timeTrackingSummaryForPeriod(
                    el,
                    startDateStr,
                    endDateStr,
                    streamKey // Optional parameter
                );
            }
        );
    }
  

    insertTimeTrackingSummarySummary(editor: Editor) {
        const now = moment();
           // First day of the current month
        const firstDay = now.clone().startOf('month').format('YYYY-MM-DD');

        // Last day of the current month
        const lastDay = now.clone().endOf('month').format('YYYY-MM-DD');

        const snippet = `
\`\`\`time-tracking-summary
    "${firstDay}", "${lastDay}" // Optional: add ", stream_name" to filter by streams section. By default will print all.
\`\`\``;
        editor.replaceSelection(snippet);
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign(
            {},
            defaultSettings,
            await this.loadData()
        );
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
