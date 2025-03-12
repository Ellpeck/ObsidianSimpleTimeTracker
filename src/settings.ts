export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "YY-MM-DD HH:mm:ss",
    editableTimestampFormat: "YYYY-MM-DD HH:mm:ss",
    csvDelimiter: ",",
    fineGrainedDurations: true,
    reverseSegmentOrder: false,
    timestampDurations: false,
    showToday: false,
    trackerEndCommand: "",
};

export interface SimpleTimeTrackerSettings {

    timestampFormat: string;
    editableTimestampFormat: string;
    csvDelimiter: string;
    fineGrainedDurations: boolean;
    reverseSegmentOrder: boolean;
    timestampDurations: boolean;
    showToday: boolean;
    trackerEndCommand: string;
}
