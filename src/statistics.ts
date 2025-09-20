import { MarkdownRenderer, setIcon, TFile } from "obsidian";
import { DataviewApi } from "obsidian-dataview";
import moment from "moment";
import SimpleTimeTrackerPlugin from "./main";
import { Entry, formatDuration, getDuration, getTotalDuration, isRunning, loadAllTrackers } from "./tracker";

// Helper to extract a date (YYYY-MM-DD) from a string
function extractDate(input: string): string | null {
    if (!input) return null;
    const match = input.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
}

// Helper to parse target time from HH:mm:ss string to milliseconds
function parseTargetTime(target: string): number {
    if (!target) return 0;
    return moment.duration(target).asMilliseconds();
}

// Gathers and processes all time tracking entries for a specific day
async function getWorkingTimeOfDay(dataviewApi: DataviewApi, plugin: SimpleTimeTrackerPlugin, date: string) {
    const fileCategories: string[] = [];
    const pageNames: string[] = [];
    const entryNames: string[] = [];
    const entryDurations: number[] = [];
    const filteredEntries: Entry[] = [];

    // Recursively processes entries and their sub-entries
    function processEntries(entries: Entry[], page: TFile, category: string, parentName = '') {
        entries.forEach(entry => {
            if (extractDate(entry.startTime) === date) {
                filteredEntries.push(entry);
                fileCategories.push(category);
                pageNames.push(page.basename);
                const fullName = parentName ? `${parentName} -> ${entry.name}` : entry.name;
                entryNames.push(fullName);
                entryDurations.push(getDuration(entry));
            }

            if (entry.subEntries) {
                const newParentName = parentName ? `${parentName} -> ${entry.name}` : entry.name;
                processEntries(entry.subEntries, page, category, newParentName);
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
        const pageTags = new Set(page.file.tags || []);
        
        let category = "Other";
        for (const cat of plugin.settings.categories) {
            if (cat.tags.some(tag => pageTags.has(tag))) {
                category = cat.name;
                break;
            }
        }

        for (const { tracker } of trackers) {
            processEntries(tracker.entries, file, category);
        }
    }

    return {
        totalDuration: getTotalDuration(filteredEntries),
        fileCategories,
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
                const categoryTotals: { [key: string]: number } = {};
                workingTime.entryDurations.forEach((dur, i) => {
                    const category = workingTime.fileCategories[i];
                    if (!categoryTotals[category]) {
                        categoryTotals[category] = 0;
                    }
                    categoryTotals[category] += dur;
                });

                const showTargetColumns = plugin.settings.categories.some(c => c.target);
                
                let totalsTable = `| Category | Duration |`;
                if (showTargetColumns) {
                    totalsTable += ` Remaining | Overtime |\n|:---|:---|:---|:---|\n`;
                } else {
                    totalsTable += `\n|:---|:---|\n`;
                }
                
                for (const categoryName in categoryTotals) {
                    const category = plugin.settings.categories.find(c => c.name === categoryName);
                    const trackedDuration = categoryTotals[categoryName];
                    let remainingStr = "";
                    let overtimeStr = "";

                    if (category && category.target) {
                        const targetMs = parseTargetTime(category.target);
                        if (targetMs > 0) {
                            const diffMs = trackedDuration - targetMs;
                            if (diffMs < 0) {
                                remainingStr = formatDuration(-diffMs, plugin.settings);
                            } else {
                                overtimeStr = formatDuration(diffMs, plugin.settings);
                            }
                        }
                    }
                    
                    totalsTable += `| **${categoryName}** | ${formatDuration(trackedDuration, plugin.settings)} |`;
                    if (showTargetColumns) {
                        totalsTable += ` ${remainingStr} | ${overtimeStr} |\n`;
                    } else {
                        totalsTable += `\n`;
                    }
                }
                totalsTable += `| **Total** | **${formatDuration(workingTime.totalDuration, plugin.settings)}** |`;
                if (showTargetColumns) {
                    totalsTable += ` | |`;
                }

                let breakdownTable = `| Category | Entry | Duration |\n|:---|:---|:---|\n`;
                workingTime.fileCategories.forEach((category, i) => {
                    const entryKey = `[[${workingTime.pageNames[i]}]] - ${workingTime.entryNames[i]}`;
                    const durStr = formatDuration(workingTime.entryDurations[i], plugin.settings);
                    breakdownTable += `| ${category} | ${entryKey} | ${durStr} |\n`;
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
