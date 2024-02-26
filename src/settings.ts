export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "YY-MM-DD HH:mm:ss",
    editableTimestampFormat: "YYYY-MM-DD HH:mm:ss",
    csvDelimiter: ",",
    fineGrainedDurations: true,
    reverseSegmentOrder: false
};

export interface SimpleTimeTrackerSettings {

    timestampFormat: string;
    editableTimestampFormat: string;
    csvDelimiter: string;
    fineGrainedDurations: boolean;
    reverseSegmentOrder: boolean;

}
