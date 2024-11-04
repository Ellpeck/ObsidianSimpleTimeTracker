export const defaultSettings: SimpleTimeTrackerSettings = {
    timestampFormat: "YY-MM-DD HH:mm:ss",
    editableTimestampFormat: "YYYY-MM-DD HH:mm:ss",
    csvDelimiter: ",",
    fineGrainedDurations: true,
    reverseSegmentOrder: false,
    timestampDurations: false,
    tagConfigurationsYaml: `
# This is a sample configuration file for the tag configurations

# You can have as many 'sections' as you want to track different domains separately or in parallel

# Example section 1
streams:
  name: "🌊 Streams"
  items:
    - topic: "Accounting"
      icon: "🧮"
      tag: "#tt_accounting"
      subTags: []

    - topic: "Development"
      icon: "💗"
      tag: "#tt_dev"
      subTags:
        - topic: "Frontend"
          tag: "#tt_frontend"
          subTags: []

        - topic: "Backend"
          tag: "#tt_backend"
          subTags: []

# Example section 2
clients:
  name: "👨🏼‍💼 Clients"
  items:
    - topic: "Client A"
      tag: "#tt_client_a"
      subTags: []

    - topic: "Client B"
      tag: "#tt_client_b"
      subTags: []`
};

export interface SimpleTimeTrackerSettings {
    timestampFormat: string;
    editableTimestampFormat: string;
    csvDelimiter: string;
    fineGrainedDurations: boolean;
    reverseSegmentOrder: boolean;
    timestampDurations: boolean;
    tagConfigurationsYaml: string;
}
