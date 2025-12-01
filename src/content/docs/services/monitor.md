---
title: Monitor Service
description: Relay health and capability assessment
---

The Monitor service continuously evaluates relay health by testing NIP-11 information documents and NIP-66 capabilities. It measures round-trip times and tracks relay status over time.

## Overview

| Property | Value |
|----------|-------|
| **Service Name** | `monitor` |
| **Lifecycle** | Continuous (`run_forever`) |
| **Default Interval** | 3600 seconds (1 hour) |
| **Dependencies** | PostgreSQL, Tor (optional) |
| **Configuration** | `yaml/services/monitor.yaml` |

## Operations

Each cycle, the Monitor:

1. **Select Relays**: Query relays needing health check (based on `min_age_since_check`)
2. **Connect**: Establish WebSocket connections (via Tor for `.onion`)
3. **Fetch NIP-11**: Request relay information document
4. **Test NIP-66**: Test capabilities (open, read, write)
5. **Measure RTT**: Record round-trip times for each operation
6. **Deduplicate**: Hash NIP-11/NIP-66 content for storage efficiency
7. **Store Results**: Insert metadata snapshots into database

## Configuration

```yaml
# yaml/services/monitor.yaml

# Cycle interval
interval: 3600.0  # 1 hour (minimum: 60.0)

# Tor proxy for .onion relays
tor:
  enabled: true
  host: "tor"      # Docker service name
  port: 9050

# Nostr keys for NIP-66 write tests
keys:
  public_key: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
  # private_key loaded from MONITOR_PRIVATE_KEY environment variable

# Timeouts for relay checks
timeouts:
  clearnet: 30.0   # seconds (5.0-120.0)
  tor: 60.0        # seconds (10.0-180.0)

# Concurrency settings
concurrency:
  max_parallel: 50   # concurrent checks (1-500)
  batch_size: 50     # relays per DB batch (1-500)

# Relay selection criteria
selection:
  min_age_since_check: 3600  # seconds since last check (≥0)
```

### Configuration Reference

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `interval` | float | 3600.0 | ≥60.0 | Seconds between cycles |
| `tor.enabled` | bool | true | - | Enable Tor proxy |
| `tor.host` | string | 127.0.0.1 | - | Tor SOCKS5 host |
| `tor.port` | int | 9050 | 1-65535 | Tor SOCKS5 port |
| `timeouts.clearnet` | float | 30.0 | 5.0-120.0 | Clearnet timeout |
| `timeouts.tor` | float | 60.0 | 10.0-180.0 | Tor timeout |
| `concurrency.max_parallel` | int | 50 | 1-500 | Concurrent checks |
| `concurrency.batch_size` | int | 50 | 1-500 | DB batch size |

## NIP-11 Testing

The Monitor fetches the [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md) relay information document:

```http
GET / HTTP/1.1
Host: relay.example.com
Accept: application/nostr+json
```

Captured fields:

| Field | Description |
|-------|-------------|
| `name` | Relay name |
| `description` | Relay description |
| `pubkey` | Operator's public key |
| `contact` | Contact information |
| `supported_nips` | Array of supported NIPs |
| `software` | Software name/URL |
| `version` | Software version |
| `limitation` | Relay limitations |
| `privacy_policy` | Privacy policy URL |
| `terms_of_service` | Terms of service URL |

## NIP-66 Testing

The Monitor tests [NIP-66](https://github.com/nostr-protocol/nips/blob/master/66.md) relay capabilities:

### Openable Test

Can we establish a WebSocket connection?

```
→ WebSocket CONNECT wss://relay.example.com
← Connection established
✓ openable = true, rtt_open = 142ms
```

### Readable Test

Does the relay respond to REQ messages?

```
→ ["REQ", "test", {"limit": 1}]
← ["EOSE", "test"]
✓ readable = true, rtt_read = 89ms
```

### Writable Test

Does the relay accept EVENT messages?

```
→ ["EVENT", {...signed_event...}]
← ["OK", "event_id", true, ""]
✓ writable = true, rtt_write = 234ms
```

:::note
Write tests require a valid Nostr keypair. Set `MONITOR_PRIVATE_KEY` environment variable.
:::

## Tor Support

Monitor automatically routes `.onion` URLs through Tor:

```python
if ".onion" in relay_url:
    connector = ProxyConnector.from_url(f"socks5://{tor_host}:{tor_port}")
    timeout = config.timeouts.tor
else:
    connector = None
    timeout = config.timeouts.clearnet
```

Benefits:
- Full support for Tor-only relays
- Separate, longer timeouts for Tor
- Configurable Tor proxy settings

## Content Deduplication

NIP-11 and NIP-66 documents are stored using content-addressed deduplication:

1. **Compute Hash**: SHA-256 of the document content
2. **Check Existence**: Does this hash already exist?
3. **Store or Reuse**: Insert new record or reference existing

```sql
-- nip11 table
CREATE TABLE nip11 (
    id BYTEA PRIMARY KEY,  -- SHA-256 hash
    name TEXT,
    description TEXT,
    ...
);

-- relay_metadata references by hash
CREATE TABLE relay_metadata (
    relay_url TEXT,
    generated_at BIGINT,
    nip11_id BYTEA REFERENCES nip11(id),
    nip66_id BYTEA REFERENCES nip66(id),
    ...
);
```

This means:
- Identical NIP-11 documents share one record
- Storage efficiency for relays with static metadata
- Historical tracking via `relay_metadata` timestamps

## Usage

### Docker Compose

```yaml
monitor:
  command: ["python", "-m", "services", "monitor"]
  environment:
    - MONITOR_PRIVATE_KEY=${MONITOR_PRIVATE_KEY}  # Optional
  restart: unless-stopped
```

### Manual Run

```bash
cd implementations/bigbrotr
python -m services monitor
```

### With Write Tests

```bash
MONITOR_PRIVATE_KEY=<hex_private_key> python -m services monitor
```

### Debug Mode

```bash
python -m services monitor --log-level DEBUG
```

## Output

Typical Monitor output:

```
INFO monitor: cycle_started
INFO monitor: relays_selected count=1250
INFO monitor: checking_relays batch=1 total=25
INFO monitor: relay_checked url=wss://relay.damus.io openable=true readable=true writable=true
INFO monitor: relay_checked url=wss://nos.lol openable=true readable=true writable=false
INFO monitor: batch_completed batch=1 checked=50 success=48 failed=2
...
INFO monitor: cycle_completed duration=245.6 checked=1250 success=1180 failed=70
INFO monitor: waiting seconds=3600
```

## Querying Results

### Latest Relay Status

```sql
SELECT
    relay_url,
    nip66_openable,
    nip66_readable,
    nip66_writable,
    nip66_rtt_open,
    nip66_rtt_read,
    nip11_name,
    nip11_software
FROM relay_metadata_latest
WHERE nip66_openable = true
ORDER BY nip66_rtt_open ASC
LIMIT 20;
```

### Relay Health Over Time

```sql
SELECT
    DATE(TO_TIMESTAMP(generated_at)) as date,
    COUNT(*) FILTER (WHERE n66.openable) as openable,
    COUNT(*) FILTER (WHERE n66.readable) as readable,
    COUNT(*) FILTER (WHERE n66.writable) as writable
FROM relay_metadata rm
JOIN nip66 n66 ON rm.nip66_id = n66.id
GROUP BY DATE(TO_TIMESTAMP(generated_at))
ORDER BY date DESC;
```

### Software Distribution

```sql
SELECT
    n11.software,
    COUNT(DISTINCT rm.relay_url) as relay_count
FROM relay_metadata_latest rml
JOIN nip11 n11 ON rml.nip11_id = n11.id
WHERE n11.software IS NOT NULL
GROUP BY n11.software
ORDER BY relay_count DESC;
```

## Error Handling

### Connection Timeout

```
WARNING monitor: relay_timeout url=wss://slow-relay.example.com timeout=30.0
```

Relay is marked as not openable; continues with other relays.

### Invalid NIP-11

```
WARNING monitor: nip11_invalid url=wss://relay.example.com error=Invalid JSON
```

NIP-11 fields are set to NULL; NIP-66 tests still attempted.

### Tor Not Available

```
ERROR monitor: tor_unavailable url=wss://xyz.onion error=Connection refused
```

Tor relays fail if Tor proxy is not running.

## Performance Tuning

### High Relay Count

For large deployments with many relays:

```yaml
concurrency:
  max_parallel: 100   # Increase parallelism
  batch_size: 100     # Larger DB batches
```

### Slow Network

For high-latency networks:

```yaml
timeouts:
  clearnet: 60.0
  tor: 120.0
```

### Resource Constraints

For limited resources:

```yaml
concurrency:
  max_parallel: 10
  batch_size: 25
```

## Next Steps

- Learn about [Synchronizer Service](/services/synchronizer/)
- Explore [Database Tables](/database/tables/)
- Understand [Configuration](/configuration/services/)
