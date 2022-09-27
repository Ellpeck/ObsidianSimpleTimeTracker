import { MarkdownSectionInformation } from "obsidian";

export class Tracker {

    entries: Entry[] = [];

    display(element: HTMLElement): void {
        let list = element.createEl("ul");
        for (let entry of this.entries)
            list.createEl("li", { text: entry.toString() });
    }


    start(name: string): void {
        // date constructor returns the current date
        let entry = new Entry(name, new Date());
        this.entries.push(entry);
    }

    end(): void {

    }

    save(): void {
        // TODO save
        JSON.stringify(this);
    }

    static load(json: string): Tracker {
        if (json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                console.log(`Failed to parse Tracker from ${json}`);
            }
        }
        return new Tracker();
    }
}

export class Entry {

    private name: string;
    private startTime: Date;
    private endTime: Date;

    constructor(name: string, startTime: Date) {
        this.name = name;
        this.startTime = startTime;
    }

    toString(): string {
        let ret = "";
        if (this.name)
            ret += `${this.name}: `;

        // if the days or months are different, we want to add the full date
        if (this.startTime.getDay() != this.endTime.getDay() || this.startTime.getMonth() != this.endTime.getMonth()) {
            ret += `${this.startTime.toLocaleString()} - ${this.endTime.toLocaleString()}`;
        } else {
            ret += `${this.startTime.toLocaleTimeString()} - ${this.endTime.toLocaleTimeString()}`;
        }
        return ret;
    }
}
