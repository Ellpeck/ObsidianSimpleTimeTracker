import { moment, App, MarkdownSectionInformation, ButtonComponent, TextComponent } from "obsidian";
import { SimpleTimeTrackerSettings } from "./settings";

export interface Tracker {
    entries: Entry[];
}

export interface Entry {
    name: string;
    startTime: number;
    endTime: number;
    subEntries: Entry[];
}

export async function saveTracker(tracker: Tracker, app: App, section: MarkdownSectionInformation): Promise<void> {
    let file = app.workspace.getActiveFile();
    if (!file)
        return;
    let content = await app.vault.read(file);

    // figure out what part of the content we have to edit
    let lines = content.split("\n");
    let prev = lines.filter((_, i) => i <= section.lineStart).join("\n");
    let next = lines.filter((_, i) => i >= section.lineEnd).join("\n");
    // edit only the code block content, leave the rest untouched
    content = `${prev}\n${JSON.stringify(tracker)}\n${next}`;

    await app.vault.modify(file, content);
}

export function loadTracker(json: string): Tracker {
    if (json) {
        try {
            return JSON.parse(json);
        } catch (e) {
            console.log(`Failed to parse Tracker from ${json}`);
        }
    }
    return { entries: [] };
}

export function displayTracker(tracker: Tracker, element: HTMLElement, getSectionInfo: () => MarkdownSectionInformation, settings: SimpleTimeTrackerSettings): void {
    // add start/stop controls
    let running = isRunning(tracker);
    let btn = new ButtonComponent(element)
        .setClass("clickable-icon")
        .setIcon(`lucide-${running ? "stop" : "play"}-circle`)
        .setTooltip(running ? "End" : "Start")
        .onClick(async () => {
            if (running) {
                endRunningEntry(tracker);
            } else {
                startNewEntry(tracker, newSegmentNameBox.getValue());
            }
            await saveTracker(tracker, this.app, getSectionInfo());
        });
    btn.buttonEl.addClass("simple-time-tracker-btn");
    let newSegmentNameBox = new TextComponent(element)
        .setPlaceholder("Segment name")
        .setDisabled(running);
    newSegmentNameBox.inputEl.addClass("simple-time-tracker-txt");

    // add timers
    let timer = element.createDiv({ cls: "simple-time-tracker-timers" });
    let currentDiv = timer.createEl("div", { cls: "simple-time-tracker-timer" });
    let current = currentDiv.createEl("span", { cls: "simple-time-tracker-timer-time" });
    currentDiv.createEl("span", { text: "Current" });
    let totalDiv = timer.createEl("div", { cls: "simple-time-tracker-timer" });
    let total = totalDiv.createEl("span", { cls: "simple-time-tracker-timer-time", text: "0s" });
    totalDiv.createEl("span", { text: "Total" });

    if (tracker.entries.length > 0) {
        // add table
        let table = element.createEl("table", { cls: "simple-time-tracker-table" });
        table.createEl("tr").append(
            createEl("th", { text: "Segment" }),
            createEl("th", { text: "Start time" }),
            createEl("th", { text: "End time" }),
            createEl("th", { text: "Duration" }),
            createEl("th"));

        for (let entry of tracker.entries)
            addEditableTableRow(tracker, entry, table, newSegmentNameBox, running, getSectionInfo, settings, 0);

        // add copy buttons
        let buttons = element.createEl("div", { cls: "simple-time-tracker-bottom" });
        new ButtonComponent(buttons)
            .setButtonText("Copy as table")
            .onClick(() => navigator.clipboard.writeText(createMarkdownTable(tracker, settings)));
        new ButtonComponent(buttons)
            .setButtonText("Copy as CSV")
            .onClick(() => navigator.clipboard.writeText(createCsv(tracker, settings)));
    }


    setCountdownValues(tracker, current, total, currentDiv);
    let intervalId = window.setInterval(() => {
        // we delete the interval timer when the element is removed
        if (!element.isConnected) {
            window.clearInterval(intervalId);
            return;
        }
        setCountdownValues(tracker, current, total, currentDiv);
    }, 1000);
}

function startSubEntry(entry: Entry, name: string) {
    // if this entry is not split yet, we add its time as a sub-entry instead
    if (!entry.subEntries) {
        entry.subEntries = [{ ...entry, name: `Part 1` }];
        entry.startTime = null;
        entry.endTime = null;
    }

    if (!name)
        name = `Part ${entry.subEntries.length + 1}`;
    entry.subEntries.push({ name: name, startTime: moment().unix(), endTime: null, subEntries: null });
}

function startNewEntry(tracker: Tracker, name: string): void {
    if (!name)
        name = `Segment ${tracker.entries.length + 1}`;
    let entry: Entry = { name: name, startTime: moment().unix(), endTime: null, subEntries: null };
    tracker.entries.push(entry);
};

function endRunningEntry(tracker: Tracker): void {
    let entry = getRunningEntry(tracker.entries);
    entry.endTime = moment().unix();
}

function removeEntry(entries: Entry[], toRemove: Entry): boolean {
    if (entries.contains(toRemove)) {
        entries.remove(toRemove);
        return true;
    } else {
        for (let entry of entries) {
            if (entry.subEntries && removeEntry(entry.subEntries, toRemove)) {
                // if we only have one sub entry remaining, we can merge back into our main entry
                if (entry.subEntries.length == 1) {
                    let single = entry.subEntries[0];
                    entry.startTime = single.startTime;
                    entry.endTime = single.endTime;
                    entry.subEntries = null;
                }
                return true;
            }
        }
    }
    return false;
}

function isRunning(tracker: Tracker): boolean {
    return !!getRunningEntry(tracker.entries);
}

function getRunningEntry(entries: Entry[]): Entry {
    for (let entry of entries) {
        // if this entry has sub entries, check if one of them is running
        if (entry.subEntries) {
            let running = getRunningEntry(entry.subEntries);
            if (running)
                return running;
        } else {
            // if this entry has no sub entries and no end time, it's running
            if (!entry.endTime)
                return entry;
        }
    }
    return null;
}

function getDuration(entry: Entry) {
    if (entry.subEntries) {
        return getTotalDuration(entry.subEntries);
    } else {
        let endTime = entry.endTime ? moment.unix(entry.endTime) : moment();
        return endTime.diff(moment.unix(entry.startTime));
    }
}

function getTotalDuration(entries: Entry[]): number {
    let ret = 0;
    for (let entry of entries)
        ret += getDuration(entry);
    return ret;
}

function setCountdownValues(tracker: Tracker, current: HTMLElement, total: HTMLElement, currentDiv: HTMLDivElement) {
    let running = getRunningEntry(tracker.entries);
    if (running && !running.endTime) {
        current.setText(formatDuration(getDuration(running)));
        currentDiv.hidden = false;
    } else {
        currentDiv.hidden = true;
    }
    total.setText(formatDuration(getTotalDuration(tracker.entries)));
}

function formatTimestamp(timestamp: number, settings: SimpleTimeTrackerSettings): string {
    return moment.unix(timestamp).format(settings.timestampFormat);
}

function formatDuration(totalTime: number): string {
    let duration = moment.duration(totalTime);
    let ret = "";
	if (duration.years() > 0)
		ret += duration.years() + "y ";
	if (duration.months() > 0)
		ret += duration.months() + "m ";
	if (duration.days() > 0)
		ret += duration.days() + "d ";
    if (duration.hours() > 0)
        ret += duration.hours() + "h ";
    if (duration.minutes() > 0)
        ret += duration.minutes() + "m ";
    ret += duration.seconds() + "s";
    return ret;
}

function createMarkdownTable(tracker: Tracker, settings: SimpleTimeTrackerSettings): string {
    let table = [["Segment", "Start time", "End time", "Duration"]];
    for (let entry of tracker.entries)
        table.push(...createTableSection(entry, settings));
    table.push(["**Total**", "", "", `**${formatDuration(getTotalDuration(tracker.entries))}**`]);

    let ret = "";
    // calculate the width every column needs to look neat when monospaced
    let widths = Array.from(Array(4).keys()).map(i => Math.max(...table.map(a => a[i].length)));
    for (let r = 0; r < table.length; r++) {
        // add separators after first row
        if (r == 1)
            ret += Array.from(Array(4).keys()).map(i => "-".repeat(widths[i])).join(" | ") + "\n";

        let row: string[] = [];
        for (let i = 0; i < 4; i++)
            row.push(table[r][i].padEnd(widths[i], " "));
        ret += row.join(" | ") + "\n";
    }
    return ret;
}

function createCsv(tracker: Tracker, settings: SimpleTimeTrackerSettings): string {
    let ret = "";
    for (let entry of tracker.entries) {
        for (let row of createTableSection(entry, settings))
            ret += row.join(settings.csvDelimiter) + "\n";
    }
    return ret;
}

function createTableSection(entry: Entry, settings: SimpleTimeTrackerSettings): string[][] {
    let ret: string[][] = [[
        entry.name,
        entry.startTime ? formatTimestamp(entry.startTime, settings) : "",
        entry.endTime ? formatTimestamp(entry.endTime, settings) : "",
        entry.endTime || entry.subEntries ? formatDuration(getDuration(entry)) : ""]];
    if (entry.subEntries) {
        for (let sub of entry.subEntries)
            ret.push(...createTableSection(sub, settings));
    }
    return ret;
}

function addEditableTableRow(tracker: Tracker, entry: Entry, table: HTMLTableElement, newSegmentNameBox: TextComponent, running: boolean, getSectionInfo: () => MarkdownSectionInformation, settings: SimpleTimeTrackerSettings, indent: number) {
    let row = table.createEl("tr");

    let name = row.createEl("td");
    let namePar = name.createEl("span", { text: entry.name });
    namePar.style.marginLeft = `${indent}em`;
    let nameBox = new TextComponent(name).setValue(entry.name);
    nameBox.inputEl.hidden = true;

    let startTime = row.createEl("td");
    let startTimePar = startTime.createEl("span", { text: entry.startTime ? formatTimestamp(entry.startTime, settings) : "" });
    let startTimeBox = new TextComponent(startTime).setValue(entry.startTime ? formatTimestamp(entry.startTime, settings) : "");
    startTimeBox.inputEl.hidden = true;

    let endTime = row.createEl("td");
    let endTimePar = endTime.createEl("span", { text: entry.endTime ? formatTimestamp(entry.endTime, settings) : "" });
    let endTimeBox = new TextComponent(endTime).setValue(entry.endTime ? formatTimestamp(entry.endTime, settings) : "");
    endTimeBox.inputEl.hidden = true;

    row.createEl("td", { text: entry.endTime || entry.subEntries ? formatDuration(getDuration(entry)) : "" });

    let entryButtons = row.createEl("td");
    if (!running) {
        new ButtonComponent(entryButtons)
            .setClass("clickable-icon")
            .setIcon(`lucide-play`)
            .setTooltip("Continue")
            .onClick(async () => {
                startSubEntry(entry, newSegmentNameBox.getValue());
                await saveTracker(tracker, this.app, getSectionInfo());
            });
    }
    let editButton = new ButtonComponent(entryButtons)
        .setClass("clickable-icon")
        .setTooltip("Edit")
        .setIcon("lucide-pencil")
        .onClick(async () => {
            if (namePar.hidden) {
                namePar.hidden = false;
                nameBox.inputEl.hidden = true;
                if (entry.startTime) {
                    startTimePar.hidden = false;
                    startTimeBox.inputEl.hidden = true;
                }
                if (entry.endTime) {
                    endTimePar.hidden = false;
                    endTimeBox.inputEl.hidden = true;
                }
                editButton.setIcon("lucide-pencil");
                if (nameBox.getValue() || startTimeBox.getValue() || endTimeBox.getValue()) {
                    if (nameBox.getValue()) {
                        entry.name = nameBox.getValue();
                        namePar.setText(entry.name);
                    }
                    if (startTimeBox.getValue()) {
                        if (moment(startTimeBox.getValue(), settings.timestampFormat).isValid()) {
                            entry.startTime = moment(startTimeBox.getValue(), settings.timestampFormat).format("X");
                            startTimePar.setText(entry.startTime ? formatTimestamp(entry.startTime, settings) : "" );
                        } else {
                            startTimeBox.setText(entry.startTime ? formatTimestamp(entry.startTime, settings) : "" );
                        }
                    }
                    if (endTimeBox.getValue()) {
                        if (moment(endTimeBox.getValue(), settings.timestampFormat).isValid()) {
                            entry.endTime = moment(endTimeBox.getValue(), settings.timestampFormat).format("X");
                            endTimePar.setText(entry.endTime ? formatTimestamp(entry.endTime, settings) : "" );
                        } else {
                            endTimeBox.setText(entry.endTime ? formatTimestamp(entry.endTime, settings) : "" );
                        }
                    }
                    await saveTracker(tracker, this.app, getSectionInfo());
                }
            } else {
                namePar.hidden = true;
                nameBox.inputEl.hidden = false;
                nameBox.setValue(entry.name);
                if (entry.startTime) {
                    startTimePar.hidden = true;
                    startTimeBox.inputEl.hidden = false;
                    startTimeBox.setValue(formatTimestamp(entry.startTime, settings));
                }
                if (entry.endTime) {
                    endTimePar.hidden = true;
                    endTimeBox.inputEl.hidden = false;
                    endTimeBox.setValue(formatTimestamp(entry.endTime, settings));
                }
                editButton.setIcon("lucide-check");
            }
        });
    new ButtonComponent(entryButtons)
        .setClass("clickable-icon")
        .setTooltip("Remove")
        .setIcon("lucide-trash")
        .onClick(async () => {
            removeEntry(tracker.entries, entry);
            await saveTracker(tracker, this.app, getSectionInfo());
        });

    if (entry.subEntries) {
        for (let sub of entry.subEntries)
            addEditableTableRow(tracker, sub, table, newSegmentNameBox, running, getSectionInfo, settings, indent + 1);
    }
}
