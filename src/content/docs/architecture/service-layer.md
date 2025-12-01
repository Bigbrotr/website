---
title: Service Layer
description: Business logic and service orchestration in BigBrotr
---

The service layer (`src/services/`) contains all business logic implementations. Each service inherits from `BaseService` and follows consistent patterns for configuration, lifecycle management, and database interaction.

## Services Overview

| Service | Status | Lifecycle | Purpose |
|---------|--------|-----------|---------|
| **Initializer** | Complete | One-shot | Database bootstrap and schema verification |
| **Finder** | Complete | Continuous | Relay URL discovery from APIs |
| **Monitor** | Complete | Continuous | NIP-11/NIP-66 health monitoring |
| **Synchronizer** | Complete | Continuous | Multicore event collection |
| **API** | Planned | Continuous | REST endpoints with OpenAPI |
| **DVM** | Planned | Continuous | NIP-90 Data Vending Machine |

## Service Architecture Pattern

All services follow the same structure:

```python
SERVICE_NAME = "myservice"

class MyServiceConfig(BaseModel):
    """Pydantic configuration model with validation."""
    interval: float = Field(default=300.0, ge=60.0)
    # ... other config fields

class MyService(BaseService[MyServiceConfig]):
    """Service implementation."""
    SERVICE_NAME = SERVICE_NAME
    CONFIG_CLASS = MyServiceConfig

    def __init__(self, brotr: Brotr, config: MyServiceConfig | None = None):
        super().__init__(brotr=brotr, config=config or MyServiceConfig())

    async def run(self) -> None:
        """Single cycle implementation (abstract method)."""
        pass
```

## Initializer Service

**Purpose**: Database bootstrap and schema verification
**Lifecycle**: One-shot (runs once, then exits)

### Operations

1. Verify PostgreSQL extensions (pgcrypto, btree_gin)
2. Verify all expected tables exist
3. Verify all stored procedures exist
4. Verify all views exist
5. Seed relay URLs from configured file

### Configuration

```yaml
verify:
  extensions: true
  tables: true
  procedures: true
  views: true

schema:
  extensions: [pgcrypto, btree_gin]
  tables: [relays, events, events_relays, nip11, nip66, relay_metadata, service_state]
  procedures: [insert_event, insert_relay, insert_relay_metadata, ...]
  views: [relay_metadata_latest]

seed:
  enabled: true
  file_path: data/seed_relays.txt
```

### Usage

```bash
python -m services initializer
```

## Finder Service

**Purpose**: Continuous relay URL discovery
**Lifecycle**: Continuous (`run_forever`)

### Operations

1. Fetch relay lists from configured API sources
2. Validate URLs using nostr-tools
3. Detect network type (clearnet/tor) from URL
4. Batch insert discovered relays into database

### Configuration

```yaml
interval: 3600.0  # 1 hour between cycles

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
```

### Usage

```bash
python -m services finder
python -m services finder --log-level DEBUG
```

## Monitor Service

**Purpose**: Relay health and capability assessment
**Lifecycle**: Continuous (`run_forever`)

### Operations

1. Fetch list of relays needing health check
2. For each relay (concurrently):
   - Establish WebSocket connection
   - Fetch NIP-11 information document
   - Test NIP-66 capabilities (open, read, write)
   - Measure round-trip times
3. Deduplicate NIP-11/NIP-66 by content hash
4. Batch insert results into database

### Configuration

```yaml
interval: 3600.0  # 1 hour between cycles

tor:
  enabled: true
  host: "tor"
  port: 9050

keys:
  public_key: "79be667ef9dcbbac..."  # For NIP-66 write tests

timeouts:
  clearnet: 30.0  # seconds
  tor: 60.0       # higher for Tor

concurrency:
  max_parallel: 50  # concurrent relay checks
  batch_size: 50    # relays per database batch

selection:
  min_age_since_check: 3600  # re-check interval
```

### Tor Support

Monitor automatically detects `.onion` URLs and routes them through the Tor SOCKS5 proxy:

```python
# Automatic network detection
if ".onion" in relay_url:
    connector = ProxyConnector.from_url(f"socks5://{tor_host}:{tor_port}")
    timeout = config.timeouts.tor
else:
    connector = None
    timeout = config.timeouts.clearnet
```

### Usage

```bash
python -m services monitor

# With NIP-66 write tests
MONITOR_PRIVATE_KEY=<hex_private_key> python -m services monitor
```

## Synchronizer Service

**Purpose**: High-performance event collection from relays
**Lifecycle**: Continuous (`run_forever`)

### Key Features

- **Multicore Processing**: Uses `aiomultiprocess` for parallel relay processing
- **Time-Window Stack Algorithm**: Handles large event volumes efficiently
- **Incremental Sync**: Per-relay timestamp tracking for efficient updates
- **Per-Relay Overrides**: Custom timeouts for high-traffic relays
- **Graceful Shutdown**: Clean worker process termination

### Configuration

```yaml
interval: 900.0  # 15 minutes between cycles

tor:
  enabled: true
  host: "tor"
  port: 9050

filter:
  kinds: null     # null = all event kinds
  limit: 500      # events per request

time_range:
  default_start: 0
  use_relay_state: true    # incremental sync
  lookback_seconds: 86400  # 24-hour lookback

timeouts:
  clearnet:
    request: 30.0   # WebSocket timeout
    relay: 1800.0   # 30 min max per relay
  tor:
    request: 60.0
    relay: 3600.0   # 60 min for Tor relays

concurrency:
  max_parallel: 10  # connections per process
  max_processes: 10 # worker processes
  stagger_delay: [0, 60]  # random delay range

source:
  from_database: true
  max_metadata_age: 43200  # only sync recently checked relays
  require_readable: true

# Per-relay overrides
overrides:
  - url: "wss://relay.damus.io"
    timeouts:
      request: 60.0
      relay: 7200.0  # 2 hours for high-traffic relay
```

### Time-Window Stack Algorithm

For relays with large event volumes, Synchronizer uses a binary search approach:

```
Initial Request: events from timestamp 0 to NOW
                 │
                 ▼
         [Returns 500 events - limit reached]
                 │
                 ▼
    Split window: 0 → MID, MID → NOW
                 │
         ┌───────┴───────┐
         ▼               ▼
    [0 → MID]       [MID → NOW]
    (may split      (may split
     again)          again)
```

This ensures all events are collected even from relays with millions of events.

### Processing Flow

```
Main Process                    Worker Processes
     │                               │
     ├─── Fetch relays              │
     │                               │
     ├─── Distribute to workers ───▶│ ─── Connect to relay
     │                               │ ─── Request events
     │                               │ ─── Apply time-window stack
     │◀── Receive batches ─────────│ ─── Return raw events
     │                               │
     ├─── Insert to database        │
     │                               │
     └─── Update state              │
```

### Usage

```bash
python -m services synchronizer
```

## CLI Entry Point

All services are run through the CLI module (`src/services/__main__.py`):

```bash
# Service selection
python -m services <service_name>

# Available services
python -m services initializer
python -m services finder
python -m services monitor
python -m services synchronizer

# Options
python -m services finder --config yaml/services/finder.yaml
python -m services finder --log-level DEBUG
```

### Service Registry

```python
SERVICE_REGISTRY = {
    "initializer": (Initializer, InitializerConfig),
    "finder": (Finder, FinderConfig),
    "monitor": (Monitor, MonitorConfig),
    "synchronizer": (Synchronizer, SynchronizerConfig),
}
```

## Module Exports

```python
# src/services/__init__.py
from services.initializer import Initializer, InitializerConfig
from services.finder import Finder, FinderConfig
from services.monitor import Monitor, MonitorConfig
from services.synchronizer import Synchronizer, SynchronizerConfig

__all__ = [
    "Initializer", "InitializerConfig",
    "Finder", "FinderConfig",
    "Monitor", "MonitorConfig",
    "Synchronizer", "SynchronizerConfig",
]
```

## Next Steps

- Learn about individual services:
  - [Initializer](/services/initializer/)
  - [Finder](/services/finder/)
  - [Monitor](/services/monitor/)
  - [Synchronizer](/services/synchronizer/)
- Understand [Service Configuration](/configuration/services/)
- Explore the [Database Schema](/database/schema/)
