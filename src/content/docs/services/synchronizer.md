---
title: Synchronizer Service
description: High-performance multicore event collection
---

The Synchronizer service is the core data collection engine of BigBrotr. It collects Nostr events from relays using multicore processing, incremental sync, and an intelligent time-window algorithm.

## Overview

| Property | Value |
|----------|-------|
| **Service Name** | `synchronizer` |
| **Lifecycle** | Continuous (`run_forever`) |
| **Default Interval** | 900 seconds (15 minutes) |
| **Dependencies** | PostgreSQL, Tor (optional), Monitor data |
| **Configuration** | `yaml/services/synchronizer.yaml` |

## Key Features

- **Multicore Processing**: Uses `aiomultiprocess` for parallel relay synchronization
- **Time-Window Stack Algorithm**: Efficiently handles large event volumes
- **Incremental Sync**: Per-relay timestamp tracking for efficient updates
- **Per-Relay Overrides**: Custom timeouts for high-traffic relays
- **Graceful Shutdown**: Clean worker process termination

## Configuration

```yaml
# yaml/services/synchronizer.yaml

# Cycle interval
interval: 900.0  # 15 minutes (minimum: 60.0)

# Tor proxy for .onion relays
tor:
  enabled: true
  host: "tor"
  port: 9050

# Event filter settings
filter:
  ids: null        # Event IDs to sync (null = all)
  kinds: null      # Event kinds to sync (null = all)
  authors: null    # Authors to sync (null = all)
  tags: null       # Tag filters
  limit: 500       # Events per request (1-5000)

# Time range for sync
time_range:
  default_start: 0           # Default start timestamp (0 = epoch)
  use_relay_state: true      # Use per-relay incremental state
  lookback_seconds: 86400    # Lookback window (3600-604800)

# Network-specific timeouts
timeouts:
  clearnet:
    request: 30.0    # WebSocket timeout (5.0-120.0)
    relay: 1800.0    # Max time per relay (60.0-14400.0)
  tor:
    request: 60.0
    relay: 3600.0

# Concurrency settings
concurrency:
  max_parallel: 10    # Connections per process (1-100)
  max_processes: 10   # Worker processes (1-32)
  stagger_delay: [0, 60]  # Random delay range

# Relay source settings
source:
  from_database: true       # Fetch relays from database
  max_metadata_age: 43200   # Only sync recently checked relays
  require_readable: true    # Only sync readable relays

# Per-relay overrides
overrides:
  - url: "wss://relay.damus.io"
    timeouts:
      request: 60.0
      relay: 7200.0    # 2 hours for high-traffic relay
```

### Configuration Reference

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `interval` | float | 900.0 | ≥60.0 | Seconds between cycles |
| `filter.limit` | int | 500 | 1-5000 | Events per request |
| `time_range.lookback_seconds` | int | 86400 | 3600-604800 | Lookback window |
| `timeouts.clearnet.request` | float | 30.0 | 5.0-120.0 | WebSocket timeout |
| `timeouts.clearnet.relay` | float | 1800.0 | 60.0-14400.0 | Per-relay timeout |
| `concurrency.max_parallel` | int | 10 | 1-100 | Connections per process |
| `concurrency.max_processes` | int | 10 | 1-32 | Worker processes |

## Time-Window Stack Algorithm

For relays with large event volumes, the Synchronizer uses an intelligent algorithm to ensure complete event collection:

### The Problem

Nostr relays typically limit responses to a fixed number of events (e.g., 500). For relays with millions of events, a simple query would miss data.

### The Solution

```
Initial Request: events from timestamp START to NOW
                 │
                 ▼
         [Returns 500 events - limit reached]
                 │
                 ▼
    Split window into two halves
                 │
         ┌───────┴───────┐
         ▼               ▼
    [START → MID]   [MID → NOW]
         │               │
         ▼               ▼
    [< 500? Done]   [500? Split again]
```

### How It Works

1. **Initial Request**: Query events from `start_timestamp` to `now`
2. **Check Limit**: If response has `limit` events, window needs splitting
3. **Binary Split**: Divide time window in half, push both to stack
4. **Process Stack**: Continue until all windows return fewer than `limit` events
5. **Result**: Complete event collection regardless of relay size

```python
stack = [(start_timestamp, now)]

while stack:
    start, end = stack.pop()
    events = await fetch_events(relay, start, end, limit=500)

    if len(events) >= limit:
        # Split window
        mid = (start + end) // 2
        stack.append((start, mid))
        stack.append((mid, end))
    else:
        # Window complete, store events
        yield events
```

## Multicore Processing

The Synchronizer distributes work across multiple processes:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│                                                                  │
│   1. Fetch readable relays from database                        │
│   2. Distribute relays to worker pool                           │
│   3. Collect results from workers                               │
│   4. Insert events to database                                  │
│   5. Update per-relay state                                     │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Worker 1   │ │  Worker 2   │ │  Worker N   │
    │             │ │             │ │             │
    │ Process 10  │ │ Process 10  │ │ Process 10  │
    │ relays in   │ │ relays in   │ │ relays in   │
    │ parallel    │ │ parallel    │ │ parallel    │
    └─────────────┘ └─────────────┘ └─────────────┘
```

With default settings (10 processes × 10 parallel):
- Up to **100 relays** synced simultaneously
- Each relay synced independently
- Events aggregated in main process

## Incremental Sync

The Synchronizer tracks per-relay sync state:

```python
# State stored in service_state table
{
    "relay_timestamps": {
        "wss://relay.damus.io": 1704067200,
        "wss://nos.lol": 1704063600,
        ...
    }
}
```

Each cycle:
1. Load last sync timestamp for each relay
2. Sync events from `last_timestamp` to `now`
3. Update `last_timestamp` to latest event's `created_at`

Benefits:
- Efficient updates without re-syncing old data
- Fault tolerance: resumes from last known position
- Per-relay granularity for varied sync progress

## Per-Relay Overrides

High-traffic relays may need custom timeouts:

```yaml
overrides:
  - url: "wss://relay.damus.io"
    timeouts:
      request: 60.0     # Longer WebSocket timeout
      relay: 7200.0     # 2 hours total time

  - url: "wss://relay.snort.social"
    timeouts:
      request: 45.0
      relay: 5400.0     # 1.5 hours
```

## Usage

### Docker Compose

```yaml
synchronizer:
  command: ["python", "-m", "services", "synchronizer"]
  restart: unless-stopped
  depends_on:
    monitor:
      condition: service_started
```

### Manual Run

```bash
cd implementations/bigbrotr
python -m services synchronizer
```

### Debug Mode

```bash
python -m services synchronizer --log-level DEBUG
```

## Output

Typical Synchronizer output:

```
INFO synchronizer: cycle_started
INFO synchronizer: relays_loaded count=847 clearnet=782 tor=65
INFO synchronizer: workers_started processes=10
INFO synchronizer: relay_sync_started url=wss://relay.damus.io
INFO synchronizer: relay_sync_completed url=wss://relay.damus.io events=12453 duration=45.2
INFO synchronizer: relay_sync_started url=wss://nos.lol
...
INFO synchronizer: batch_inserted events=5000
INFO synchronizer: batch_inserted events=5000
INFO synchronizer: batch_inserted events=2453
INFO synchronizer: cycle_completed duration=312.5 relays=847 events=127834 new=45231
INFO synchronizer: state_saved
INFO synchronizer: waiting seconds=900
```

## Event Filtering

Filter events during sync:

### By Event Kind

```yaml
filter:
  kinds: [0, 1, 3, 6, 7]  # Profile, notes, contacts, reposts, reactions
```

### By Author

```yaml
filter:
  authors:
    - "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
```

### By Tags

```yaml
filter:
  tags:
    e: ["event_id_1", "event_id_2"]
    p: ["pubkey_1"]
```

## Querying Results

### Event Statistics

```sql
SELECT * FROM events_statistics;
```

### Events by Kind

```sql
SELECT * FROM kind_counts_total ORDER BY count DESC LIMIT 20;
```

### Events by Relay

```sql
SELECT * FROM relays_statistics ORDER BY event_count DESC LIMIT 20;
```

### Recent Events

```sql
SELECT
    encode(id, 'hex') as event_id,
    kind,
    TO_TIMESTAMP(created_at) as created
FROM events
ORDER BY created_at DESC
LIMIT 100;
```

## Error Handling

### Relay Timeout

```
WARNING synchronizer: relay_timeout url=wss://slow-relay.example.com elapsed=1800.0
```

Relay is skipped for this cycle; state is not updated.

### Connection Error

```
WARNING synchronizer: relay_connection_error url=wss://relay.example.com error=Connection refused
```

Relay is skipped; other relays continue processing.

### Worker Crash

Workers are monitored; crashes are logged and work is redistributed.

## Performance Tuning

### Maximum Throughput

```yaml
concurrency:
  max_parallel: 50
  max_processes: 16

timeouts:
  clearnet:
    relay: 3600.0  # Allow more time
```

### Resource Constrained

```yaml
concurrency:
  max_parallel: 5
  max_processes: 2

filter:
  limit: 100  # Smaller batches
```

### Tor-Heavy Deployment

```yaml
tor:
  enabled: true

timeouts:
  tor:
    request: 120.0
    relay: 7200.0
```

## Graceful Shutdown

The Synchronizer handles shutdown gracefully:

1. **Signal Handler**: Catches SIGTERM/SIGINT
2. **Request Shutdown**: Sets shutdown flag
3. **Wait for Workers**: Allows current operations to complete
4. **Save State**: Persists per-relay timestamps
5. **Exit**: Clean termination

```python
# Signal handler
def handle_signal(signum, frame):
    service.request_shutdown()

# Graceful worker cleanup
atexit.register(cleanup_workers)
```

## Next Steps

- Explore [Database Schema](/database/schema/)
- Learn about [Configuration](/configuration/services/)
- Check the [FAQ](/resources/faq/)
