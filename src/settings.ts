export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "YY-MM-DD hh:mm:ss",
    csvDelimiter: ",",
    fineGrainedDurations: true
};

export interface SimpleTimeTrackerSettings {

    timestampFormat: string;
    csvDelimiter: string;
    fineGrainedDurations: boolean;

}
