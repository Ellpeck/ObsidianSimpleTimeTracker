import { SimpleTimeTrackerSettings } from "./settings";
import { Configuration, Section, Item, SubTag } from "./interfaces";
import { parseYaml, moment } from "obsidian";


export class TimeTrackingSummary {
    settings: SimpleTimeTrackerSettings;
    api: any;
    app: any; // Reference to the Obsidian app

    constructor(app: any, settings: SimpleTimeTrackerSettings, api: any) {
        this.app = app;
        this.settings = settings;
        this.api = api;
    }

    async timeTrackingSummaryForPeriod(
        containerEl: HTMLElement,
        startDateStr: string,
        endDateStr: string,
        streamKey?: string
    ) {
        // Define the time interval (inclusive)
        const startDate = moment(startDateStr).startOf("day");
        const endDate = moment(endDateStr).endOf("day");

        // Initialize an object to hold total durations per dimension
        let dimensionDurations: {
            [dimension: string]: { [tag: string]: number };
        } = {};
        const untrackedSectionName = "Other";

        // Parse the configuration from settings
        let config: Configuration;
        try {
            config = this.parseConfiguration();
        } catch (error: any) {
            containerEl.createEl("p", {
                text: `Error parsing configuration: ${error.message}`,
            });
            return;
        }

        const api = this.api;

        // Load all trackers from all markdown files
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const trackers = await api.loadAllTrackers(file.path);

            for (let { tracker } of trackers) {
                for (let entry of tracker.entries) {
                    let entryDate = moment(entry.startTime);
                    if (
                        !entryDate.isValid() ||
                        !entryDate.isBetween(startDate, endDate, null, "[]")
                    ) {
                        continue;
                    }

                    let tags = entry.name.match(/#\w+/g) || [];
                    let duration = api.getDuration(entry); // Use API duration calculation
                    duration = duration / (1000 * 60 * 60); // Convert ms to hours

                    let mappedDimensions = this.mapTagsToDimensions(
                        tags,
                        config
                    );

                    if (Object.keys(mappedDimensions).length === 0) {
                        // Handle untracked time
                        if (!dimensionDurations[untrackedSectionName]) {
                            dimensionDurations[untrackedSectionName] = {};
                        }
                        if (
                            !dimensionDurations[untrackedSectionName][
                                untrackedSectionName
                            ]
                        ) {
                            dimensionDurations[untrackedSectionName][
                                untrackedSectionName
                            ] = 0;
                        }
                        dimensionDurations[untrackedSectionName][
                            untrackedSectionName
                        ] += duration;
                    } else {
                        // Accumulate tracked time
                        for (let dimension in mappedDimensions) {
                            if (!dimensionDurations[dimension]) {
                                dimensionDurations[dimension] = {};
                            }
                            for (let topic of mappedDimensions[dimension]) {
                                if (!dimensionDurations[dimension][topic]) {
                                    dimensionDurations[dimension][topic] = 0;
                                }
                                dimensionDurations[dimension][topic] +=
                                    duration;
                            }
                        }
                    }
                }
            }
        }

        streamKey = streamKey?.replace(/^["']|["']$/g, '').trim().toLowerCase() // remove any quotes and trim

        
        if (streamKey && streamKey.trim() !== "") {
            console.log(`streamKey: ${streamKey} is not empty, proceeding to filter dimensions`);
            
            // Create mapping of section keys and names to dimensions
            const sectionMapping: { [key: string]: string } = {};
            for (const [key, section] of Object.entries(config)) {
                sectionMapping[key.toLowerCase()] = section.name;
                sectionMapping[section.name.toLowerCase()] = section.name;
            }
    
            // Find matching section
            const filteredDimensions: typeof dimensionDurations = {};
            for (const dimension in dimensionDurations) {
                console.log(`dimension: ${dimension}, checking match with ${streamKey}`);
                // Check if streamKey matches either section key or display name
                if (dimension.toLowerCase() === streamKey || 
                    Object.keys(sectionMapping).includes(streamKey)) {
                    const matchedDimension = sectionMapping[streamKey] || dimension;
                    if (dimensionDurations[matchedDimension]) {
                        filteredDimensions[matchedDimension] = dimensionDurations[matchedDimension];
                        break;
                    }
                }
            }
    
            // Show message if no matching stream found
            if (Object.keys(filteredDimensions).length === 0) {
                containerEl.createEl("p", {
                    text: `No results found for stream "${streamKey}" in the selected period [${startDate.format(
                        "YYYY-MM-DD"
                    )} → ${endDate.format("YYYY-MM-DD")}]`,
                });
                return;
            }
    
            // Replace original dimensions with filtered
            dimensionDurations = filteredDimensions;
        }


        // Display the results
        for (let dimension in dimensionDurations) {
            console.log(`dimension: ${dimension}`);
            let totalDuration = Object.values(
                dimensionDurations[dimension]
            ).reduce((sum, hours) => sum + hours, 0);
            let totalMs = totalDuration * 60 * 60 * 1000; // Convert hours to ms
            let formattedTotalDuration = api.formatDuration(totalMs);

            containerEl.createEl("h2", {
                text: `${dimension} 📅 [${startDate.format(
                    "YYYY-MM-DD"
                )} → ${endDate.format(
                    "YYYY-MM-DD"
                )}] ⏳Total: ${formattedTotalDuration}`,
            });

            let tableEl = containerEl.createEl("table");
            let headerRow = tableEl.createEl("tr");
            ["Icon", "Topic", "Total Hours", "Formatted Duration"].forEach(
                (text) => {
                    headerRow.createEl("th", { text });
                }
            );

            let tableData = Object.entries(dimensionDurations[dimension]).map(
                ([topic, hours]) => {
                    let durationMs = hours * 60 * 60 * 1000;
                    let formattedHours = api.formatDuration(durationMs);
                    let icon = this.getIconForTag(topic, config);
                    return {
                        icon,
                        topic,
                        hours: hours.toFixed(2),
                        formattedHours,
                    };
                }
            );

            // Sort table data by time spent (hours) in descending order
            tableData.sort((a, b) => parseFloat(b.hours) - parseFloat(a.hours));

            tableData.forEach((row) => {
                let rowEl = tableEl.createEl("tr");
                ["icon", "topic", "hours", "formattedHours"].forEach((key) => {
                    rowEl.createEl("td", { text: (row as any)[key] });
                });
            });
        }
    }

    parseConfiguration(): Configuration {
        const yamlContent = this.settings.tagConfigurationsYaml;
        console.log(`received config:\n ${yamlContent}`);
        const config = parseYaml(yamlContent);

        console.log("Parsed configuration:", config);

        if (!config || typeof config !== "object") {
            throw new Error("Invalid configuration format.");
        }

        // Validate and transform the configuration
        for (const [sectionKey, sectionValue] of Object.entries(config)) {
            console.log(`sectionKey: ${sectionKey}`);
            if (
                !sectionValue.hasOwnProperty("name") ||
                !sectionValue.hasOwnProperty("items")
            ) {
                throw new Error(
                    `Section ${sectionKey} is missing 'name' or 'items' properties.`
                );
            }

            // Recursively validate items and subTags
            const validateItems = (items: any[]) => {
                console.log(`items: ${items}`);
                for (const item of items) {
                    if (
                        !item.hasOwnProperty("topic") ||
                        !item.hasOwnProperty("tag")
                    ) {
                        throw new Error(
                            `Item ${JSON.stringify(
                                item
                            )} is missing 'topic' or 'tag' properties.`
                        );
                    }
                    item.subTags = item.subTags || [];
                    validateItems(item.subTags);
                }
            };

            validateItems((sectionValue as Section).items);
        }

        return config as Configuration;
    }

    mapTagsToDimensions(
        tags: string[],
        config: Configuration
    ): { [dimension: string]: string[] } {
        const mappedDimensions: { [dimension: string]: string[] } = {};

        const processItems = (
            items: (Item | SubTag)[],
            dimensionName: string,
            tagsInDimension: Set<string>
        ) => {
            for (const item of items) {
                if (tags.includes(item.tag)) {
                    tagsInDimension.add(item.topic);
                }
                if (item.subTags && item.subTags.length > 0) {
                    processItems(item.subTags, dimensionName, tagsInDimension);
                }
            }
        };

        for (const section of Object.values(config)) {
            const dimensionName = section.name;
            const tagsInDimension: Set<string> = new Set();
            processItems(section.items, dimensionName, tagsInDimension);
            if (tagsInDimension.size > 0) {
                mappedDimensions[dimensionName] = Array.from(tagsInDimension);
            }
        }

        return mappedDimensions;
    }

    getIconForTag(topic: string, config: Configuration): string {
        let foundIcon = "";

        const searchItems = (items: (Item | SubTag)[]): boolean => {
            for (const item of items) {
                if (item.topic === topic) {
                    foundIcon = item.icon || "";
                    return true;
                }
                if (item.subTags && item.subTags.length > 0) {
                    if (searchItems(item.subTags)) {
                        return true;
                    }
                }
            }
            return false;
        };

        for (const section of Object.values(config)) {
            if (searchItems(section.items)) {
                break;
            }
        }

        return foundIcon;
    }
}
