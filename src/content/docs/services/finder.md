---
title: Finder Service
description: Continuous relay URL discovery
---

The Finder service is responsible for discovering new Nostr relays from external APIs. It runs continuously, periodically fetching relay lists and adding newly discovered URLs to the database.

## Overview

| Property | Value |
|----------|-------|
| **Service Name** | `finder` |
| **Lifecycle** | Continuous (`run_forever`) |
| **Default Interval** | 3600 seconds (1 hour) |
| **Dependencies** | PostgreSQL, Internet access |
| **Configuration** | `yaml/services/finder.yaml` |

## Operations

Each cycle, the Finder:

1. **Fetch API Sources**: Queries configured API endpoints for relay lists
2. **Validate URLs**: Ensures URLs are valid WebSocket addresses
3. **Detect Network**: Identifies clearnet vs Tor (`.onion`) relays
4. **Batch Insert**: Adds new relays to the database (idempotent)

## Configuration

```yaml
# yaml/services/finder.yaml

# Cycle interval (seconds between discovery runs)
interval: 3600.0  # 1 hour (minimum: 60.0)

# External API discovery
api:
  enabled: true
  sources:
    - url: https://api.nostr.watch/v1/online
      enabled: true
      timeout: 30.0    # Request timeout (1.0-120.0)
    - url: https://api.nostr.watch/v1/offline
      enabled: true
      timeout: 30.0
  delay_between_requests: 1.0  # Delay between API calls (0.0-10.0)

# Event-based discovery (planned feature)
events:
  enabled: false
```

### Configuration Reference

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `interval` | float | 3600.0 | ≥60.0 | Seconds between cycles |
| `api.enabled` | bool | true | - | Enable API discovery |
| `api.sources[].url` | string | - | - | API endpoint URL |
| `api.sources[].enabled` | bool | true | - | Enable this source |
| `api.sources[].timeout` | float | 30.0 | 1.0-120.0 | Request timeout |
| `api.delay_between_requests` | float | 1.0 | 0.0-10.0 | Inter-request delay |

## API Sources

### nostr.watch

The default configuration uses [nostr.watch](https://nostr.watch) APIs:

| Endpoint | Description |
|----------|-------------|
| `/v1/online` | Currently reachable relays |
| `/v1/offline` | Previously known but currently offline relays |

Response format:
```json
[
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol"
]
```

### Adding Custom Sources

You can add additional API sources:

```yaml
api:
  sources:
    # Default sources
    - url: https://api.nostr.watch/v1/online
      enabled: true
    - url: https://api.nostr.watch/v1/offline
      enabled: true

    # Custom source (must return JSON array of URLs)
    - url: https://my-relay-list.example.com/api/relays
      enabled: true
      timeout: 60.0
```

Requirements for custom sources:
- Must return HTTP 200 with JSON body
- Body must be an array of WebSocket URLs
- URLs must be valid `wss://` or `ws://` addresses

## Usage

### Docker Compose

Finder runs automatically in the stack:

```yaml
finder:
  command: ["python", "-m", "services", "finder"]
  restart: unless-stopped
  depends_on:
    initializer:
      condition: service_completed_successfully
```

### Manual Run

```bash
cd implementations/bigbrotr
python -m services finder
```

### Debug Mode

```bash
python -m services finder --log-level DEBUG
```

### Custom Config

```bash
python -m services finder --config yaml/services/finder.yaml
```

## Output

Typical Finder output:

```
INFO finder: cycle_started
INFO finder: fetching_source url=https://api.nostr.watch/v1/online
INFO finder: source_fetched url=https://api.nostr.watch/v1/online relays=2341
INFO finder: fetching_source url=https://api.nostr.watch/v1/offline
INFO finder: source_fetched url=https://api.nostr.watch/v1/offline relays=6524
INFO finder: relays_discovered total=8865 new=127 clearnet=7892 tor=973
INFO finder: cycle_completed duration=4.56
INFO finder: waiting seconds=3600
```

## Network Detection

Finder automatically detects network type from URLs:

| Pattern | Network |
|---------|---------|
| `*.onion` | tor |
| Everything else | clearnet |

```python
def detect_network(url: str) -> str:
    if ".onion" in url:
        return "tor"
    return "clearnet"
```

## Database Interaction

Finder uses the `insert_relay` stored procedure:

```sql
-- Idempotent insertion (ignores duplicates)
INSERT INTO relays (url, network, inserted_at)
VALUES ($1, $2, $3)
ON CONFLICT (url) DO NOTHING;
```

This means:
- Running Finder multiple times is safe
- Existing relays are not modified
- Only truly new relays are added

## Error Handling

### API Timeout

```
WARNING finder: source_timeout url=https://api.nostr.watch/v1/online timeout=30.0
```

The Finder continues with other sources and retries on the next cycle.

### Invalid Response

```
WARNING finder: source_invalid_response url=https://example.com status=500
```

Non-200 responses are logged and skipped.

### Network Errors

```
WARNING finder: source_network_error url=https://example.com error=Connection refused
```

Network errors are logged; the Finder continues with other sources.

## Monitoring

### Check Relay Growth

```sql
-- Relays discovered over time
SELECT
    DATE(TO_TIMESTAMP(inserted_at)) as date,
    COUNT(*) as relays_added
FROM relays
GROUP BY DATE(TO_TIMESTAMP(inserted_at))
ORDER BY date DESC
LIMIT 30;
```

### Check Network Distribution

```sql
SELECT network, COUNT(*) as count
FROM relays
GROUP BY network;
```

## Performance Considerations

- **Rate Limiting**: Use `delay_between_requests` to avoid overwhelming APIs
- **Timeout Tuning**: Increase timeouts for slow APIs
- **Interval**: Hourly discovery is sufficient; more frequent adds little value

## Next Steps

- Learn about [Monitor Service](/services/monitor/)
- Understand [Synchronizer Service](/services/synchronizer/)
- Explore [Configuration](/configuration/services/)
