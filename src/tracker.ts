import { moment, App, MarkdownSectionInformation, ButtonComponent, TextComponent, TFile } from "obsidian";
import { SimpleTimeTrackerSettings } from "./settings";


export interface Tracker {
    entries: Entry[];
}

export interface Entry {
    name: string;
    task: string;
    startTime: number;
    endTime: number;
    subEntries: Entry[];
}

class EditableTableCell {
    cell : HTMLTableCellElement;
    show_component : HTMLSpanElement;
    input_component : TextComponent;
    tracker: Tracker;
    app: App;
    entry: Entry;
    fileName: string;
    getSectionInfo: () => MarkdownSectionInformation;

    public constructor(row : HTMLTableRowElement, tracker: Tracker, entry: Entry, app: App, fileName: string, getSectionInfo: () => MarkdownSectionInformation) {
        this.cell = row.createEl("td");
        this.show_component = this.cell.createEl("span");
        this.input_component = new TextComponent(this.cell);
        this.input_component.inputEl.hidden = true;
        this.tracker = tracker;
        this.app = app;
        this.fileName = fileName;
        this.getSectionInfo = getSectionInfo;
        this.entry = entry;
    }

    public hasSubEntry() : boolean {
        return this.entry.subEntries != null && this.entry.subEntries.length > 0;
    }

    public editable() : boolean {
        if (this.show_component.hidden) {
            return true;
        }
        return false;
    }

    public setText(text : string) {
        this.show_component.setText(text);
        this.input_component.setValue(text);
    }

    public getText() {
        return this.input_component.getValue();
    }

    public changeEditableMode() : void {
        this.show_component.hidden = true;
        this.input_component.inputEl.hidden = false;
        this.input_component.setValue(this.show_component.getText());
    }

    protected async saveContent() : Promise<void> {
        await saveTracker(this.tracker, this.app, this.fileName, this.getSectionInfo())
    }

    protected setEntry() : void {
    
    }

    protected checkValid() : boolean {
        return this.input_component.getValue().length > 0;
    }

    public changeShowMode() : void {
        this.show_component.hidden = false;
        this.input_component.inputEl.hidden = true;
        if (this.checkValid()) {
            this.setEntry();
            this.show_component.setText(this.getText());
            this.saveContent();
        } else {
            this.input_component.setValue(this.show_component.getText());
        }
    }
}

class NameTableCell extends EditableTableCell {
    public constructor(row : HTMLTableRowElement, tracker: Tracker, entry: Entry,
            app: App, fileName: string,
            getSectionInfo: () => MarkdownSectionInformation, indent: number) {
        super(row, tracker, entry, app, fileName, getSectionInfo);
        this.show_component.style.marginLeft = `${indent}em`;
    }

    protected override setEntry() : void {
        this.entry.name = this.getText();
    }
}

class TaskTableCell extends EditableTableCell {
    public constructor(row : HTMLTableRowElement, tracker: Tracker, entry: Entry,
        app: App, fileName: string,
        getSectionInfo: () => MarkdownSectionInformation, is_top_entry : boolean) {
    super(row, tracker, entry, app, fileName, getSectionInfo);
    if (!is_top_entry) {
        this.input_component = null;
    } 
}

    protected override setEntry() : void {
        this.entry.task = this.getText();
    }

    public override changeEditableMode() : void {
        // 如果是subentry，不需要task
        if (this.input_component == null) {
            return;
        }
        super.changeEditableMode();
    }

    public override changeShowMode() : void {
        // 如果是subentry，不需要task
        if (this.input_component == null) {
            return;
        }
        super.changeShowMode();
    }

    public setText(text : string) {
        this.show_component.setText(text);
        if (this.input_component) {
            this.input_component.setValue(text);
        }
    }
}

class DateTableCell extends EditableTableCell {
    settings : SimpleTimeTrackerSettings;

    public constructor(row : HTMLTableRowElement, tracker: Tracker, entry: Entry,
            app: App, fileName: string, getSectionInfo: () => MarkdownSectionInformation,
            settings: SimpleTimeTrackerSettings) {
        super(row, tracker, entry, app, fileName, getSectionInfo);
        this.settings = settings;
    }

    protected override setEntry() : void {
        let unix_time = moment(this.getText(), this.settings.timestampFormat, true)
                        .unix();
        this.entry.startTime = unix_time;
    }

    protected override checkValid() : boolean {
        let time = moment(this.getText(), this.settings.timestampFormat, true);
        if (!time.isValid()) {
            return false;
        }
        if (time.unix() > moment().unix()) {
            return false;
        }
        return true;
    }

    public override changeEditableMode() : void {
        if (!this.hasSubEntry()) {
            super.changeEditableMode();
        }
    }
    public override changeShowMode() : void {
        super.changeShowMode();
    }
}

class EndTimeDateTableCell extends DateTableCell {
    start_time_cell : DateTableCell;

    public constructor(row : HTMLTableRowElement, tracker: Tracker, entry: Entry,
            app: App, fileName: string, getSectionInfo: () => MarkdownSectionInformation,
            settings: SimpleTimeTrackerSettings, start_time_cell : DateTableCell) {
        super(row, tracker, entry, app, fileName, getSectionInfo, settings);
        this.start_time_cell = start_time_cell;
    }
    protected override setEntry() : void {
        let unix_time = moment(this.getText(), this.settings.timestampFormat, true)
                        .unix();
        this.entry.endTime = unix_time;
    }

    protected override checkValid() : boolean {
        if (!super.checkValid()) {
            return false;
        }
        let start_time_moment = moment(this.start_time_cell.getText(), this.settings.timestampFormat, true);
        if (start_time_moment.isValid()) {
            let end_time_unix = moment(this.show_component.getText(), this.settings.timestampFormat, true).unix();
            return start_time_moment.unix() < end_time_unix;
        }
        return false;
    }
}


export async function saveTracker(tracker: Tracker, app: App, fileName: string, section: MarkdownSectionInformation): Promise<void> {
    let file = app.vault.getAbstractFileByPath(fileName) as TFile;
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
    return {entries: []};
}

export function displayTracker(tracker: Tracker, element: HTMLElement, file: string, getSectionInfo: () => MarkdownSectionInformation, settings: SimpleTimeTrackerSettings): void {
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
            await saveTracker(tracker, this.app, file, getSectionInfo());
        });
    btn.buttonEl.addClass("simple-time-tracker-btn");
    let newSegmentNameBox = new TextComponent(element)
        .setPlaceholder("Segment name")
        .setDisabled(running);
    newSegmentNameBox.inputEl.addClass("simple-time-tracker-txt");

    // add timers
    let timer = element.createDiv({cls: "simple-time-tracker-timers"});
    let currentDiv = timer.createEl("div", {cls: "simple-time-tracker-timer"});
    let current = currentDiv.createEl("span", {cls: "simple-time-tracker-timer-time"});
    currentDiv.createEl("span", {text: "Current"});
    let totalDiv = timer.createEl("div", {cls: "simple-time-tracker-timer"});
    let total = totalDiv.createEl("span", {cls: "simple-time-tracker-timer-time", text: "0s"});
    totalDiv.createEl("span", {text: "Total"});

    if (tracker.entries.length > 0) {
        // add table
        let table = element.createEl("table", {cls: "simple-time-tracker-table"});
        table.createEl("tr").append(
            createEl("th", {text: "Segment"}),
            createEl("th", {text: "task"}),
            createEl("th", {text: "Start time"}),
            createEl("th", {text: "End time"}),
            createEl("th", {text: "Duration"}),
            createEl("th"));

        for (let entry of tracker.entries)
            addEditableTableRow(tracker, entry, table, newSegmentNameBox, running, file, getSectionInfo, settings, 0, true);

        // add copy buttons
        let buttons = element.createEl("div", {cls: "simple-time-tracker-bottom"});
        new ButtonComponent(buttons)
            .setButtonText("Copy as table")
            .onClick(() => navigator.clipboard.writeText(createMarkdownTable(tracker, settings)));
        new ButtonComponent(buttons)
            .setButtonText("Copy as CSV")
            .onClick(() => navigator.clipboard.writeText(createCsv(tracker, settings)));
    }


    setCountdownValues(tracker, current, total, currentDiv, settings);
    let intervalId = window.setInterval(() => {
        // we delete the interval timer when the element is removed
        if (!element.isConnected) {
            window.clearInterval(intervalId);
            return;
        }
        setCountdownValues(tracker, current, total, currentDiv, settings);
    }, 1000);
}

function startSubEntry(entry: Entry, name: string) {
    // if this entry is not split yet, we add its time as a sub-entry instead
    if (!entry.subEntries) {
        entry.subEntries = [{...entry, name: `Part 1`}];
        entry.startTime = null;
        entry.endTime = null;
    }

    if (!name)
        name = `Part ${entry.subEntries.length + 1}`;
    entry.subEntries.push({name: name, task : "", startTime: moment().unix(), endTime: null, subEntries: null});
}

function startNewEntry(tracker: Tracker, name: string): void {
    if (!name)
        name = `Segment ${tracker.entries.length + 1}`;
    let entry: Entry = {name: name, task: "", startTime: moment().unix(), endTime: null, subEntries: null};
    tracker.entries.push(entry);
}

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

function setCountdownValues(tracker: Tracker, current: HTMLElement, total: HTMLElement, currentDiv: HTMLDivElement, settings: SimpleTimeTrackerSettings) {
    let running = getRunningEntry(tracker.entries);
    if (running && !running.endTime) {
        current.setText(formatDuration(getDuration(running), settings));
        currentDiv.hidden = false;
    } else {
        currentDiv.hidden = true;
    }
    total.setText(formatDuration(getTotalDuration(tracker.entries), settings));
}

function formatTimestamp(timestamp: number, settings: SimpleTimeTrackerSettings): string {
    return moment.unix(timestamp).format(settings.timestampFormat);
}

function formatDuration(totalTime: number, settings: SimpleTimeTrackerSettings): string {
    let ret = "";
    let duration = moment.duration(totalTime);
    let hours: number;
    if (settings.fineGrainedDurations) {
        if (duration.years() > 0)
            ret += duration.years() + "y ";
        if (duration.months() > 0)
            ret += duration.months() + "M ";
        if (duration.days() > 0)
            ret += duration.days() + "d ";
        hours = duration.hours();
    } else {
        hours = Math.floor(duration.asHours());
    }
    if (hours > 0)
        ret += hours + "h ";
    if (duration.minutes() > 0)
        ret += duration.minutes() + "m ";
    ret += duration.seconds() + "s";
    return ret;
}

function createMarkdownTable(tracker: Tracker, settings: SimpleTimeTrackerSettings): string {
    let table = [["Segment", "Start time", "End time", "Duration"]];
    for (let entry of tracker.entries)
        table.push(...createTableSection(entry, settings));
    table.push(["**Total**", "", "", `**${formatDuration(getTotalDuration(tracker.entries), settings)}**`]);

    let ret = "";
    // calculate the width every column needs to look neat when monospaced
    let widths = Array.from(Array(4).keys()).map(i => Math.max(...table.map(a => a[i].length)));
    for (let r = 0; r < table.length; r++) {
        // add separators after first row
        if (r == 1)
            ret += "| " + Array.from(Array(4).keys()).map(i => "-".repeat(widths[i])).join(" | ") + " |\n";

        let row: string[] = [];
        for (let i = 0; i < 4; i++)
            row.push(table[r][i].padEnd(widths[i], " "));
        ret += "| " + row.join(" | ") + " |\n";
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
        entry.endTime || entry.subEntries ? formatDuration(getDuration(entry), settings) : ""]];
    if (entry.subEntries) {
        for (let sub of entry.subEntries)
            ret.push(...createTableSection(sub, settings));
    }
    return ret;
}

function addEditableTableRow(tracker: Tracker, entry: Entry, table: HTMLTableElement, newSegmentNameBox: TextComponent, running: boolean, file: string, getSectionInfo: () => MarkdownSectionInformation, settings: SimpleTimeTrackerSettings, indent: number, is_top_entry : boolean) {
    let row = table.createEl("tr");
    let name_cell = new NameTableCell(row, tracker, entry, app, file, getSectionInfo, indent);
    name_cell.setText(entry.name);
    let task_cell = new TaskTableCell(row, tracker, entry, app, file, getSectionInfo, is_top_entry);
    task_cell.setText(entry.task);

    let start_time_cell = new DateTableCell(row, tracker, entry, app, file, getSectionInfo, settings);
    start_time_cell.setText(entry.startTime ? formatTimestamp(entry.startTime, settings) : "");
    let end_time_cell = new EndTimeDateTableCell(
            row, tracker, entry, app, file, getSectionInfo, settings, start_time_cell);
    end_time_cell.setText(entry.endTime ? formatTimestamp(entry.endTime, settings) : "");
    let duration_cell = row.createEl("td", {text: entry.endTime || entry.subEntries ? formatDuration(getDuration(entry), settings) : ""});

    let entryButtons = row.createEl("td");
    if (!running) {
        new ButtonComponent(entryButtons)
            .setClass("clickable-icon")
            .setIcon(`lucide-play`)
            .setTooltip("Continue")
            .onClick(async () => {
                startSubEntry(entry, newSegmentNameBox.getValue());
                await saveTracker(tracker, this.app, file, getSectionInfo());
            });
    }
    let editButton = new ButtonComponent(entryButtons)
        .setClass("clickable-icon")
        .setTooltip("Edit")
        .setIcon("lucide-pencil")
        .onClick(async () => {
            if (name_cell.editable()) {
                name_cell.changeShowMode();
                start_time_cell.changeShowMode();
                end_time_cell.changeShowMode();
                task_cell.changeShowMode();
                duration_cell.setText(entry.endTime || entry.subEntries ? formatDuration(getDuration(entry), settings) : "");
                editButton.setIcon("lucide-pencil");
            } else {
                name_cell.changeEditableMode();
                start_time_cell.changeEditableMode();
                end_time_cell.changeEditableMode();
                task_cell.changeEditableMode();
                editButton.setIcon("lucide-check");
            }
        });
    new ButtonComponent(entryButtons)
        .setClass("clickable-icon")
        .setTooltip("Remove")
        .setIcon("lucide-trash")
        .onClick(async () => {
            removeEntry(tracker.entries, entry);
            await saveTracker(tracker, this.app, file, getSectionInfo());
        });

    if (entry.subEntries) {
        for (let sub of entry.subEntries)
            addEditableTableRow(tracker, sub, table, newSegmentNameBox, running, file, getSectionInfo, settings, indent + 1, false);
    }
}
