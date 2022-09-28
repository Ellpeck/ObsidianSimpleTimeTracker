export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "YY-MM-DD hh:mm:ss",
    csvDelimiter: ","
};

export interface SimpleTimeTrackerSettings {

    timestampFormat: string;
    csvDelimiter: string;

}
