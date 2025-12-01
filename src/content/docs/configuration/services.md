---
title: Service Configuration
description: Configuration options for each BigBrotr service
---

Each service has its own YAML configuration file in `yaml/services/`. This page documents all available options.

## Initializer

**File**: `yaml/services/initializer.yaml`

```yaml
# Schema verification settings
verify:
  extensions: true      # Verify PostgreSQL extensions
  tables: true          # Verify tables exist
  procedures: true      # Verify stored procedures exist
  views: true           # Verify views exist

# Expected schema elements
schema:
  extensions:
    - pgcrypto
    - btree_gin
  tables:
    - relays
    - events
    - events_relays
    - nip11
    - nip66
    - relay_metadata
    - service_state
  procedures:
    - insert_event
    - insert_relay
    - insert_relay_metadata
    - delete_orphan_events
    - delete_orphan_nip11
    - delete_orphan_nip66
  views:
    - relay_metadata_latest

# Seed relay configuration
seed:
  enabled: true                     # Enable relay seeding
  file_path: data/seed_relays.txt   # Path to seed file
```

### Initializer Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `verify.extensions` | bool | true | Verify PostgreSQL extensions |
| `verify.tables` | bool | true | Verify tables exist |
| `verify.procedures` | bool | true | Verify stored procedures |
| `verify.views` | bool | true | Verify views exist |
| `seed.enabled` | bool | true | Enable relay seeding |
| `seed.file_path` | string | - | Path to seed file |

---

## Finder

**File**: `yaml/services/finder.yaml`

```yaml
# Cycle interval
interval: 3600.0  # 1 hour (minimum: 60.0)

# External API discovery
api:
  enabled: true
  sources:
    - url: https://api.nostr.watch/v1/online
      enabled: true
      timeout: 30.0
    - url: https://api.nostr.watch/v1/offline
      enabled: true
      timeout: 30.0
  delay_between_requests: 1.0

# Event-based discovery (planned)
events:
  enabled: false
```

### Finder Options

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `interval` | float | 3600.0 | ≥60.0 | Seconds between cycles |
| `api.enabled` | bool | true | - | Enable API discovery |
| `api.sources[].url` | string | - | - | API endpoint URL |
| `api.sources[].enabled` | bool | true | - | Enable this source |
| `api.sources[].timeout` | float | 30.0 | 1.0-120.0 | Request timeout |
| `api.delay_between_requests` | float | 1.0 | 0.0-10.0 | Delay between API calls |

---

## Monitor

**File**: `yaml/services/monitor.yaml`

```yaml
# Cycle interval
interval: 3600.0  # 1 hour

# Tor proxy for .onion relays
tor:
  enabled: true
  host: "tor"
  port: 9050

# Nostr keys for NIP-66 write tests
keys:
  public_key: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
  # private_key loaded from MONITOR_PRIVATE_KEY env

# Timeouts for relay checks
timeouts:
  clearnet: 30.0
  tor: 60.0

# Concurrency settings
concurrency:
  max_parallel: 50
  batch_size: 50

# Relay selection criteria
selection:
  min_age_since_check: 3600
```

### Monitor Options

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
| `selection.min_age_since_check` | int | 3600 | ≥0 | Re-check interval |

---

## Synchronizer

**File**: `yaml/services/synchronizer.yaml`

```yaml
# Cycle interval
interval: 900.0  # 15 minutes

# Tor proxy for .onion relays
tor:
  enabled: true
  host: "tor"
  port: 9050

# Event filter settings
filter:
  ids: null        # Event IDs (null = all)
  kinds: null      # Event kinds (null = all)
  authors: null    # Authors (null = all)
  tags: null       # Tag filters
  limit: 500       # Events per request

# Time range for sync
time_range:
  default_start: 0
  use_relay_state: true
  lookback_seconds: 86400

# Network-specific timeouts
timeouts:
  clearnet:
    request: 30.0
    relay: 1800.0
  tor:
    request: 60.0
    relay: 3600.0

# Concurrency settings
concurrency:
  max_parallel: 10
  max_processes: 10
  stagger_delay: [0, 60]

# Relay source settings
source:
  from_database: true
  max_metadata_age: 43200
  require_readable: true

# Per-relay overrides
overrides:
  - url: "wss://relay.damus.io"
    timeouts:
      request: 60.0
      relay: 7200.0
```

### Synchronizer Options

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `interval` | float | 900.0 | ≥60.0 | Seconds between cycles |
| `tor.enabled` | bool | true | - | Enable Tor proxy |
| `filter.kinds` | list | null | - | Event kinds to sync |
| `filter.limit` | int | 500 | 1-5000 | Events per request |
| `time_range.use_relay_state` | bool | true | - | Use incremental sync |
| `time_range.lookback_seconds` | int | 86400 | 3600-604800 | Lookback window |
| `timeouts.clearnet.request` | float | 30.0 | 5.0-120.0 | WebSocket timeout |
| `timeouts.clearnet.relay` | float | 1800.0 | 60.0-14400.0 | Per-relay timeout |
| `concurrency.max_parallel` | int | 10 | 1-100 | Connections per process |
| `concurrency.max_processes` | int | 10 | 1-32 | Worker processes |
| `source.max_metadata_age` | int | 43200 | ≥0 | Max metadata age |
| `source.require_readable` | bool | true | - | Only sync readable relays |

---

## Common Configuration Patterns

### Disable Tor

For clearnet-only deployments:

```yaml
# All service configs
tor:
  enabled: false
```

### Resource-Constrained Environment

```yaml
# monitor.yaml
concurrency:
  max_parallel: 10
  batch_size: 25

# synchronizer.yaml
concurrency:
  max_parallel: 3
  max_processes: 2
```

### High-Performance Archiving

```yaml
# synchronizer.yaml
concurrency:
  max_parallel: 50
  max_processes: 16

timeouts:
  clearnet:
    relay: 3600.0  # 1 hour per relay
```

### Filter Specific Event Kinds

```yaml
# synchronizer.yaml
filter:
  kinds: [0, 1, 3, 6, 7, 10002]  # Profiles, notes, contacts, reposts, reactions, relay lists
```

### Per-Relay Overrides

For high-traffic or slow relays:

```yaml
# synchronizer.yaml
overrides:
  - url: "wss://relay.damus.io"
    timeouts:
      request: 60.0
      relay: 7200.0  # 2 hours

  - url: "wss://relay.snort.social"
    timeouts:
      request: 45.0
      relay: 5400.0  # 1.5 hours

  - url: "wss://slow-relay.example.com"
    timeouts:
      request: 120.0
      relay: 10800.0  # 3 hours
```

### Custom API Sources

```yaml
# finder.yaml
api:
  sources:
    - url: https://api.nostr.watch/v1/online
      enabled: true
    - url: https://api.nostr.watch/v1/offline
      enabled: true
    - url: https://my-relay-list.example.com/api/relays
      enabled: true
      timeout: 60.0
```

---

## LilBrotr Overrides

LilBrotr uses minimal configuration overrides:

```yaml
# implementations/lilbrotr/yaml/services/synchronizer.yaml
tor:
  enabled: false

concurrency:
  max_parallel: 5
  max_processes: 4
```

All other values inherit from Pydantic defaults.

---

## Next Steps

- Explore the [Database Schema](/database/schema/)
- Check the [FAQ](/resources/faq/)
- Learn about [Contributing](/resources/contributing/)
