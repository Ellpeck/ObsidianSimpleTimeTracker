
# Example data
```simple-time-tracker
{"entries":[{"name":"#tt_accounting #tt_client_a bills processing","startTime":"2024-11-01T09:25:42.000Z","endTime":"2024-11-01T17:25:56.000Z"},{"name":"#tt_dev #tt_client2  ","startTime":"2024-11-02T13:26:21.000Z","endTime":"2024-11-02T17:27:18.000Z"},{"name":"#tt_dev #tt_client_a #tt_frontend did this","startTime":"2024-11-03T08:27:20.000Z","endTime":"2024-11-03T17:27:39.000Z"},{"name":"#tt_dev #tt_client_b  #tt_backend did that","startTime":"2024-11-04T14:27:40.000Z","endTime":"2024-11-04T17:27:53.000Z"}]}
```

# Example report
## Report only one stream

```time-tracking-summary
    "2024-11-01", "2024-11-30" // Optional: add ", stream_name" to filter by streams section. By default will print all.
```
## Report only one stream

```time-tracking-summary
    "2024-11-01", "2024-11-30", clients // Optional: add ", stream_name" to filter by streams section. By default will print all.
```