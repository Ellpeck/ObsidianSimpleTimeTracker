import { moment, App, MarkdownSectionInformation, ButtonComponent, TextComponent } from "obsidian";

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

export function displayTracker(tracker: Tracker, element: HTMLElement, getSectionInfo: () => MarkdownSectionInformation): void {
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

    // add table
    if (tracker.entries.length > 0) {
        let table = element.createEl("table", { cls: "simple-time-tracker-table" });
        table.createEl("tr").append(
            createEl("th", { text: "Segment" }),
            createEl("th", { text: "Start time" }),
            createEl("th", { text: "End time" }),
            createEl("th", { text: "Total" }));

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

function getCountdownDisplay(duration: moment.Duration): string {
    let ret = "";
    if (duration.hours() > 0)
        ret += duration.hours() + "h ";
    if (duration.minutes() > 0)
        ret += duration.minutes() + "m ";
    ret += duration.seconds() + "s";
    return ret;
}

function setCountdownValues(tracker: Tracker, current: HTMLElement, total: HTMLElement, currentDiv: HTMLDivElement) {
    let currEntry = tracker.entries.last();
    if (currEntry) {
        if (!currEntry.endTime) {
            let currDuration = moment().diff(moment.unix(currEntry.startTime));
            current.setText(getCountdownDisplay(moment.duration(currDuration)));
        }

        let totalDuration = 0;
        for (let entry of tracker.entries) {
            let endTime = entry.endTime ? moment.unix(entry.endTime) : moment();
            totalDuration += endTime.diff(moment.unix(entry.startTime));
        }
        total.setText(getCountdownDisplay(moment.duration(totalDuration)));
    }
    currentDiv.hidden = !currEntry || !!currEntry.endTime;
}
