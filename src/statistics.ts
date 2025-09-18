import { MarkdownRenderer, setIcon, TFile } from "obsidian";
import { DataviewApi } from "obsidian-dataview";
import SimpleTimeTrackerPlugin from "./main";
import { Entry, formatDuration, getDuration, getTotalDuration, isRunning, loadAllTrackers } from "./tracker";

// Helper to extract a date (YYYY-MM-DD) from a string
function extractDate(input: string): string | null {
    if (!input) return null;
    const match = input.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
}

// Gathers and processes all time tracking entries for a specific day
async function getWorkingTimeOfDay(dataviewApi: DataviewApi, plugin: SimpleTimeTrackerPlugin, date: string) {
    const fileTags: string[] = [];
    const pageNames: string[] = [];
    const entryNames: string[] = [];
    const entryDurations: number[] = [];
    const filteredEntries: Entry[] = [];

    // Recursively processes entries and their sub-entries
    function processEntries(entries: Entry[], page: TFile, isWork: boolean, parentName = '') {
        entries.forEach(entry => {

            if (extractDate(entry.startTime) === date) {
                filteredEntries.push(entry);
                fileTags.push(isWork ? "#work" : "other");
                pageNames.push(page.basename);
                const fullName = parentName ? `${parentName} -> ${entry.name}` : entry.name;
                entryNames.push(fullName);
                entryDurations.push(getDuration(entry));
            }

            if (entry.subEntries) {
                const newParentName = parentName ? `${parentName} -> ${entry.name}` : entry.name;
                processEntries(entry.subEntries, page, isWork, newParentName);
            }
        });
    }

    // Iterate over all markdown files in the vault
    for (const page of dataviewApi.pages('""') as any[]) {
        if (!page.file?.path) continue;

        const file = plugin.app.vault.getAbstractFileByPath(page.file.path);
        if (!(file instanceof TFile)) {
            continue;
        }

        const trackers = await loadAllTrackers(file.path);
        const isWork = page.file.tags?.includes("#work");

        for (const { tracker } of trackers) {
            processEntries(tracker.entries, file, isWork);
        }
    }

    return {
        totalDuration: getTotalDuration(filteredEntries),
        fileTags,
        pageNames,
        entryNames,
        entryDurations
    };
}

// Finds and formats a markdown link for any currently running tracker
async function getRunningTrackerMarkdown(dataviewApi: DataviewApi): Promise<string> {
    for (const page of dataviewApi.pages('""') as any[]) {
        if (!page.file?.path) continue;
        const trackers = await loadAllTrackers(page.file.path);
        for (const { tracker } of trackers) {
            if (isRunning(tracker)) {
                return `**Currently running:** [[${page.file.path}|${page.file.name}]]\n\n---\n`;
            }
        }
    }
    return "_No tracker is currently running._\n";
}

// Main function to be called by the code block processor
export async function displayStatistics(container: HTMLElement, plugin: SimpleTimeTrackerPlugin, sourcePath: string): Promise<void> {
    const app = plugin.app;

    // This function contains the core logic to generate and render the report.
    const renderReport = async (contentContainer: HTMLElement) => {
        const dataviewApi = app.plugins.plugins.dataview?.api;
        if (!dataviewApi) {
            contentContainer.empty();
            contentContainer.createEl("p", { text: "Error: Dataview plugin is not enabled..." });
            return;
        }

        const fileName = sourcePath.split('/').pop() || '';
        const date = extractDate(fileName);
        if (!date) {
            contentContainer.empty();
            contentContainer.createEl("p", { text: `Error: Could not extract date (YYYY-MM-DD) from file name: "${fileName}"` });
            return;
        }

        try {
            contentContainer.empty();
            contentContainer.createEl("p", { text: "Loading statistics..." });

            const runningTrackerMd = await getRunningTrackerMarkdown(dataviewApi);
            const workingTime = await getWorkingTimeOfDay(dataviewApi, plugin, date);

            let dailyReportMd = "";
            if (workingTime.totalDuration === 0) {
                dailyReportMd = "_No tracked time found for this day._";
            } else {
                let workMs = 0;
                workingTime.entryDurations.forEach((dur, i) => {
                    if (workingTime.fileTags[i] === "#work") workMs += dur;
                });
                const otherMs = workingTime.totalDuration - workMs;

                const totalsTable = `| Category | Duration |\n|:---|:---|\n| **Work** | ${formatDuration(workMs, plugin.settings)} |\n| **Other** | ${formatDuration(otherMs, plugin.settings)} |\n| **Total** | **${formatDuration(workingTime.totalDuration, plugin.settings)}** |`;
                let breakdownTable = `| Type | Entry | Duration |\n|:---|:---|:---|\n`;
                workingTime.fileTags.forEach((tag, i) => {
                    const type = tag === "#work" ? "Work" : "Other";
                    const entryKey = `[[${workingTime.pageNames[i]}]] - ${workingTime.entryNames[i]}`;
                    const durStr = formatDuration(workingTime.entryDurations[i], plugin.settings);
                    breakdownTable += `| ${type} | ${entryKey} | ${durStr} |\n`;
                });
                dailyReportMd = `#### Totals\n\n${totalsTable}\n\n#### Entries Breakdown\n\n${breakdownTable}`;
            }

            const finalMarkdown = `${runningTrackerMd}\n${dailyReportMd}`;
            contentContainer.empty();
            await MarkdownRenderer.render(app, finalMarkdown, contentContainer, sourcePath, plugin);

        } catch (error) {
            console.error("Simple Time Tracker (Statistics) Error:", error);
            contentContainer.empty();
            contentContainer.createEl("p", { text: "An error occurred while generating the report. Check the developer console for details." });
        }
    };

    container.empty();
    container.addClass("simple-time-tracker-stats-container");

    const header = container.createDiv({ cls: "simple-time-tracker-stats-header" });

    const titleGroup = header.createDiv({ attr: { style: "display: flex; align-items: center; gap: 0.5em;" } });
    titleGroup.createEl("h4", { text: "Daily Statistics" });
    const refreshButton = titleGroup.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh" } });
    setIcon(refreshButton, "refresh-cw");

    const contentContainer = container.createDiv({ cls: "simple-time-tracker-stats-content" });

    refreshButton.addEventListener("click", () => {
        setIcon(refreshButton, "loader");
        refreshButton.disabled = true;
        renderReport(contentContainer).finally(() => {
            setIcon(refreshButton, "refresh-cw");
            refreshButton.disabled = false;
        });
    });

    renderReport(contentContainer);
}


