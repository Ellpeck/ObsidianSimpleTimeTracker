import { moment, App, MarkdownSectionInformation } from "obsidian";

export class Tracker {
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
    let content = await app.vault.cachedRead(file);

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

export function displayTracker(tracker: Tracker, element: HTMLElement): void {
    // add timers
    let timer = element.createDiv({ cls: "simple-time-tracker-timers" });
    let currentDiv = timer.createEl("div", { cls: "simple-time-tracker-timer" });
    let current = currentDiv.createEl("span", { cls: "simple-time-tracker-timer-time", text: "00:00" });
    currentDiv.createEl("span", { text: "CURRENT" });
    let totalDiv = timer.createEl("div", { cls: "simple-time-tracker-timer" });
    let total = totalDiv.createEl("span", { cls: "simple-time-tracker-timer-time", text: "00:00" });
    totalDiv.createEl("span", { text: "TOTAL" });

    // add list
    let table = element.createEl("table", { cls: "simple-time-tracker-table" });
    for (let entry of tracker.entries) {
        let row = table.createEl("tr");
        row.createEl("td", { text: entry.name });
        row.createEl("td", { text: moment.unix(entry.startTime).format("YY-MM-DD hh:mm:ss") });
        if (entry.endTime) {
            row.createEl("td", { text: moment.unix(entry.endTime).format("YY-MM-DD hh:mm:ss") });
            let duration = moment.unix(entry.endTime).diff(moment.unix(entry.startTime));
            row.createEl("td", { text: getCountdownDisplay(moment.duration(duration)) });
        }
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

};

function getCountdownDisplay(duration: moment.Duration): string {
    let ret = "";
    if (duration.hours() > 0)
        ret += duration.hours().toString().padStart(2, "0") + ":";
    ret += duration.minutes().toString().padStart(2, "0") + ":" + duration.seconds().toString().padStart(2, "0");
    return ret;
}

function setCountdownValues(tracker: Tracker, current: HTMLElement, total: HTMLElement, currentDiv: HTMLDivElement) {
    let currEntry = tracker.entries.last();
    if (currEntry) {
        let currDuration = moment().diff(moment.unix(currEntry.startTime));
        if (!currEntry.endTime)
            current.setText(getCountdownDisplay(moment.duration(currDuration)));

        let totalDuration = 0;
        for (let entry of tracker.entries) {
            if (entry == currEntry && !currEntry.endTime) {
                totalDuration += currDuration;
            } else {
                totalDuration += moment.unix(entry.endTime).diff(moment.unix(entry.startTime));
            }
        }
        total.setText(getCountdownDisplay(moment.duration(totalDuration)));
    }
    currentDiv.toggleClass("simple-time-tracker-grayed", !currEntry || !!currEntry.endTime);
}
