import { App, MarkdownSectionInformation } from "obsidian";

export class Tracker {
    entries: Entry[];
}

export interface Entry {
    name: string;
    startTime: number;
    endTime: number;
}

export function startEntry(tracker: Tracker, name: string): void {
    // date constructor returns the current date
    let entry: Entry = { name: name, startTime: Date.now(), endTime: null };
    tracker.entries.push(entry);
};

export function endEntry(tracker: Tracker): void {
    let last = tracker.entries.last();
    last.endTime = Date.now();
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
    let timer = element.createDiv({ cls: "simple-time-tracker-timers" });
    let current = timer.createEl("div", { cls: "simple-time-tracker-timer" });
    current.createEl("span", { cls: "simple-time-tracker-timer-time", text: "00:00" });
    current.createEl("span", { text: "CURRENT" });
    let total = timer.createEl("div", { cls: "simple-time-tracker-timer" });
    total.createEl("span", { cls: "simple-time-tracker-timer-time", text: "01:00" });
    total.createEl("span", { text: "TOTAL" });

    let list = element.createEl("ul");
    for (let entry of tracker.entries)
        list.createEl("li", { text: displayEntry(entry) });
};

export function displayEntry(entry: Entry): string {
    // TODO add an option to display this as an interval rather than a from - to string
    let ret = "";
    if (entry.name)
        ret += `${entry.name}: `;

    let start = new Date(entry.startTime);
    ret += `${start.toLocaleString()} - `;

    if (entry.endTime) {
        let end = new Date(entry.endTime);
        ret += `${end.toLocaleString()}`;
    }

    return ret;
}
