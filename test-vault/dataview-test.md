```dataviewjs
// get the time tracker plugin api instance
let api = dv.app.plugins.plugins["simple-time-tracker"].api;

for(let page of dv.pages()) {
	// load trackers in the file with the given path
	let trackers = await api.loadAllTrackers(page.file.path);
	
	if (trackers.length)
		dv.el("strong", "Trackers in " + page.file.name);
	
	for (let {section, tracker} of trackers) {
		// print the total duration of the tracker
		let duration = api.getTotalDuration(tracker.entries);
		dv.el("p", api.formatDuration(duration))
	}
}
```
