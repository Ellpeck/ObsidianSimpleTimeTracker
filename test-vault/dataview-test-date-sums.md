```dataviewjs
// get the time tracker plugin api instance
let api = dv.app.plugins.plugins["simple-time-tracker"].api;
        console.log(api);

for (let page of dv.pages()) {
    // load trackers in the file with the given path
    let trackers = await api.loadAllTrackers(page.file.path);

    if (!trackers.length) continue;

    for (let { section, tracker } of trackers) {
        // print the total duration of the tracker
        let duration = api.getTotalDurationDate(tracker.entries, '1811-11-11');
        if(duration > 0){
	        dv.el("p", page.file.link);
	        dv.el("p", api.formatDuration(duration));  
	    }
    }
}
```


```simple-time-tracker
{"entries":[{"name":"Segment 1","startTime":"1811-11-11T11:40:44.000Z","endTime":"1811-11-11T18:40:44.000Z"},{"name":"Segment 2","startTime":"2026-06-16T21:37:24.015Z","endTime":"2026-06-16T21:37:27.887Z"},{"name":"Segment 3","startTime":"2026-08-07T19:59:29.072Z","endTime":"2026-08-07T19:59:31.433Z"},{"name":"test segment","startTime":"2026-08-07T20:07:15.026Z","endTime":"2026-08-07T20:07:16.540Z"},{"name":"test segment 2","startTime":"2026-08-07T20:07:33.650Z","endTime":"2026-08-07T20:07:36.987Z"},{"name":"test segment 3","startTime":"2026-08-07T20:07:39.494Z","endTime":"2026-08-07T20:07:41.320Z"},{"name":"","startTime":"2026-08-07T20:07:54.576Z","endTime":"2026-08-07T20:07:58.342Z"}]}
```

```simple-time-tracker
{"entries":[{"name":"Segment 1","startTime":"1811-11-10T11:40:44.000Z","endTime":"1811-11-14T18:40:44.000Z"}]}
```


