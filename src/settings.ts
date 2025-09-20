export interface Category {
    name: string;
    tags: string[];
    target: string;
}

export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "YY-MM-DD HH:mm:ss",
    editableTimestampFormat: "YYYY-MM-DD HH:mm:ss",
    csvDelimiter: ",",
    fineGrainedDurations: true,
    reverseSegmentOrder: false,
    timestampDurations: false,
    showToday: false,
    categories : [
        {
            name: "Work",
            tags: ['#work'],
            target: "08:00:00"
        },
        {
            name: "Leisure", 
            tags: ['#leisure'],
            target: "00:00:00"
        }
    ]
};

export interface SimpleTimeTrackerSettings {

    timestampFormat: string;
    editableTimestampFormat: string;
    csvDelimiter: string;
    fineGrainedDurations: boolean;
    reverseSegmentOrder: boolean;
    timestampDurations: boolean;
    showToday: boolean;
    categories: Category[];
}
