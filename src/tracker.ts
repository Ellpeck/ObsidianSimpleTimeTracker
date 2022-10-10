import { moment, App, MarkdownSectionInformation, ButtonComponent, TextComponent } from "obsidian";
import { SimpleTimeTrackerSettings } from "./settings";

export interface Tracker {
    entries: Entry[];
}

export interface Entry {
    name: string;
    startTime: number;
    endTime: number;
}

export function startEntry(tracker: Tracker, name: string): void {
    if (!name)
        name = `Segment ${tracker.entries.length + 1}`;
    let entry: Entry = { name: name, startTime: moment().unix(), endTime: null };
    tracker.entries.push(entry);
};

export function endEntry(tracker: Tracker): void {
    let last = tracker.entries.last();
    last.endTime = moment().unix();
}

export function isRunning(tracker: Tracker): boolean {
    let last = tracker.entries.last();
    return last != null && !last.endTime;
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
        .setButtonText(running ? "End" : "Start")
        .onClick(async () => {
            if (running) {
                endEntry(tracker);
            } else {
                startEntry(tracker, name.getValue());
            }
            await saveTracker(tracker, this.app, getSectionInfo());
        });
    btn.buttonEl.addClass("simple-time-tracker-btn");
    let name = new TextComponent(element)
        .setPlaceholder("Segment name")
        .setDisabled(running);
    name.inputEl.addClass("simple-time-tracker-txt");

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

        for (let entry of tracker.entries) {
            let row = table.createEl("tr");

            let name = row.createEl("td");
            let namePar = name.createEl("span", { text: entry.name });
            let nameBox = new TextComponent(name).setValue(entry.name);
            nameBox.inputEl.hidden = true;

            row.createEl("td", { text: formatTimestamp(entry.startTime, settings) });
            if (entry.endTime) {
                row.createEl("td", { text: formatTimestamp(entry.endTime, settings) });
                row.createEl("td", { text: formatDurationBetween(entry.startTime, entry.endTime) });
            }

            let entryButtons = row.createEl("td");
            let editButton = new ButtonComponent(entryButtons)
                .setClass("clickable-icon")
                .setTooltip("Edit")
                .setIcon("lucide-pencil")
                .onClick(() => {
                    if (namePar.hidden) {
                        namePar.hidden = false;
                        nameBox.inputEl.hidden = true;
                        if (nameBox.getValue())
                            namePar.setText(nameBox.getValue());
                        editButton.setIcon("lucide-pencil");
                    } else {
                        namePar.hidden = true;
                        nameBox.inputEl.hidden = false;
                        nameBox.setValue(namePar.getText());
                        editButton.setIcon("lucide-check");
                    }
                });
            new ButtonComponent(entryButtons)
                .setClass("clickable-icon")
                .setTooltip("Remove")
                .setIcon("lucide-trash")
                .onClick(async () => {
                    tracker.entries.remove(entry);
                    await saveTracker(tracker, this.app, getSectionInfo());
                });
        }

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

function setCountdownValues(tracker: Tracker, current: HTMLElement, total: HTMLElement, currentDiv: HTMLDivElement) {
    let currEntry = tracker.entries.last();
    if (currEntry) {
        if (!currEntry.endTime)
            current.setText(formatDurationBetween(currEntry.startTime, moment().unix()));
        total.setText(formatDuration(getTotalDuration(tracker)));
    }
    currentDiv.hidden = !currEntry || !!currEntry.endTime;
}

function getTotalDuration(tracker: Tracker): number {
    let totalDuration = 0;
    for (let entry of tracker.entries) {
        let endTime = entry.endTime ? moment.unix(entry.endTime) : moment();
        totalDuration += endTime.diff(moment.unix(entry.startTime));
    }
    return totalDuration;
}

function formatTimestamp(timestamp: number, settings: SimpleTimeTrackerSettings): string {
    return moment.unix(timestamp).format(settings.timestampFormat);
}

function formatDurationBetween(startTime: number, endTime: number): string {
    return formatDuration(moment.unix(endTime).diff(moment.unix(startTime)));
}

function formatDuration(totalTime: number): string {
    let duration = moment.duration(totalTime);
    let ret = "";
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
        table.push(createTableRow(entry, settings));
    table.push(["**Total**", "", "", `**${formatDuration(getTotalDuration(tracker))}**`]);

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
    for (let entry of tracker.entries)
        ret += createTableRow(entry, settings).join(settings.csvDelimiter) + "\n";
    return ret;
}

function createTableRow(entry: Entry, settings: SimpleTimeTrackerSettings): string[] {
    return [
        entry.name,
        formatTimestamp(entry.startTime, settings),
        entry.endTime ? formatTimestamp(entry.endTime, settings) : "",
        entry.endTime ? formatDurationBetween(entry.startTime, entry.endTime) : ""];
}
