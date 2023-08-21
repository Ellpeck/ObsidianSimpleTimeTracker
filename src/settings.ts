export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "HH:mm:ss",
    csvDelimiter: ",",
    fineGrainedDurations: true
};

export interface SimpleTimeTrackerSettings {

    timestampFormat: string;
    csvDelimiter: string;
    fineGrainedDurations: boolean;

}
