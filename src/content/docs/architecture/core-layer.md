---
title: Core Layer
description: Reusable infrastructure components powering BigBrotr
---

The core layer (`src/core/`) provides reusable infrastructure components with zero business logic. These components form the foundation upon which all services are built.

## Components Overview

| Component | File | Purpose |
|-----------|------|---------|
| **Pool** | `pool.py` | PostgreSQL connection pooling |
| **Brotr** | `brotr.py` | Database interface with stored procedures |
| **BaseService** | `base_service.py` | Abstract service base class |
| **Logger** | `logger.py` | Structured logging |

## Pool

The Pool component manages PostgreSQL connections using asyncpg with PGBouncer compatibility.

### Key Features

- Async connection pool management
- Configurable pool size limits (1-100 connections)
- Retry logic with exponential backoff
- Connection health checking
- Environment variable password loading (`DB_PASSWORD`)
- Async context manager support

### Configuration Model

```python
class PoolConfig(BaseModel):
    database: DatabaseConfig      # host, port, database, user
    limits: PoolLimitsConfig      # min_size, max_size, max_queries
    timeouts: PoolTimeoutsConfig  # acquisition, health_check
    retry: RetryConfig            # max_attempts, delays, backoff
    server_settings: dict         # application_name, timezone
```

### Usage

```python
from core import Pool

# From YAML configuration
pool = Pool.from_yaml("yaml/core/brotr.yaml")

# Using context manager (recommended)
async with pool:
    result = await pool.fetch("SELECT * FROM relays LIMIT 10")
    count = await pool.fetchval("SELECT COUNT(*) FROM events")

# Manual lifecycle
await pool.connect()
try:
    result = await pool.fetch("SELECT 1")
finally:
    await pool.close()
```

### Connection Retry

Pool automatically retries failed connections with exponential backoff:

```yaml
retry:
  max_attempts: 3
  initial_delay: 1.0    # seconds
  max_delay: 10.0       # seconds
  exponential_backoff: true
```

## Brotr

Brotr is the high-level database interface that wraps Pool and provides stored procedure access.

### Key Features

- Composition pattern: HAS-A Pool (publicly accessible)
- Stored procedure wrappers for all database operations
- Batch operations with configurable size limits
- Automatic hex-to-BYTEA conversion for event IDs
- Timeout configuration per operation type

### Stored Procedures

Brotr exposes these hardcoded procedure names for security:

```python
PROC_INSERT_EVENT = "insert_event"
PROC_INSERT_RELAY = "insert_relay"
PROC_INSERT_RELAY_METADATA = "insert_relay_metadata"
PROC_DELETE_ORPHAN_EVENTS = "delete_orphan_events"
PROC_DELETE_ORPHAN_NIP11 = "delete_orphan_nip11"
PROC_DELETE_ORPHAN_NIP66 = "delete_orphan_nip66"
```

### Usage

```python
from core import Brotr

brotr = Brotr.from_yaml("yaml/core/brotr.yaml")

async with brotr:
    # Insert events (batch operation)
    count = await brotr.insert_events(events_list)

    # Insert relays
    count = await brotr.insert_relays(relays_list)

    # Insert metadata with deduplication
    count = await brotr.insert_relay_metadata(metadata_list)

    # Cleanup orphaned records
    result = await brotr.cleanup_orphans()

    # Access underlying pool for custom queries
    rows = await brotr.pool.fetch("SELECT * FROM relays WHERE network = $1", "tor")
```

### Batch Operations

Large datasets are automatically split into batches:

```yaml
batch:
  max_batch_size: 1000  # Maximum items per batch
```

## BaseService

BaseService is the abstract base class for all services, providing common functionality.

### Key Features

- Generic type parameter for configuration class
- `SERVICE_NAME` and `CONFIG_CLASS` class attributes
- State persistence via `_load_state()` / `_save_state()`
- Continuous operation via `run_forever(interval)`
- Factory methods: `from_yaml()`, `from_dict()`
- Graceful shutdown via `request_shutdown()`

### Interface

```python
class BaseService(ABC, Generic[ConfigT]):
    SERVICE_NAME: str              # Unique identifier for state persistence
    CONFIG_CLASS: type[ConfigT]    # For automatic config parsing

    _brotr: Brotr                  # Database interface
    _config: ConfigT               # Pydantic configuration
    _state: dict[str, Any]         # Persisted state (JSONB in database)

    @abstractmethod
    async def run(self) -> None:
        """Single cycle logic - must be implemented by subclasses."""
        pass

    async def run_forever(self, interval: float) -> None:
        """Continuous loop with configurable interval."""
        pass

    async def health_check(self) -> bool:
        """Database connectivity check."""
        pass

    def request_shutdown(self) -> None:
        """Sync-safe shutdown trigger for signal handlers."""
        pass

    async def wait(self, timeout: float) -> bool:
        """Interruptible sleep - returns True if shutdown requested."""
        pass
```

### State Persistence

Services can persist arbitrary state to the database:

```python
# State is automatically loaded on context enter
async with service:
    # Access state
    last_sync = self._state.get("last_sync_timestamp", 0)

    # Modify state
    self._state["last_sync_timestamp"] = current_time

# State is automatically saved on context exit
```

State is stored in the `service_state` table as JSONB:

```sql
CREATE TABLE service_state (
    service_name TEXT PRIMARY KEY,
    state JSONB NOT NULL DEFAULT '{}',
    updated_at BIGINT NOT NULL
);
```

### Creating a Service

```python
from pydantic import BaseModel, Field
from core import BaseService, Brotr, Logger

SERVICE_NAME = "myservice"

class MyServiceConfig(BaseModel):
    interval: float = Field(default=300.0, ge=60.0)
    some_setting: str = Field(default="value")

class MyService(BaseService[MyServiceConfig]):
    SERVICE_NAME = SERVICE_NAME
    CONFIG_CLASS = MyServiceConfig

    def __init__(self, brotr: Brotr, config: MyServiceConfig | None = None):
        super().__init__(brotr=brotr, config=config or MyServiceConfig())
        self._logger = Logger(SERVICE_NAME)

    async def run(self) -> None:
        """Single cycle implementation."""
        self._logger.info("cycle_started")

        # Your service logic here
        await self._do_work()

        self._logger.info("cycle_completed")

    async def _do_work(self) -> None:
        # Access config: self._config.some_setting
        # Access database: self._brotr.pool.fetch(...)
        # Access state: self._state["key"]
        pass
```

## Logger

Logger provides structured key=value logging for machine parsing.

### Usage

```python
from core import Logger

logger = Logger("synchronizer")

# Info level with key=value pairs
logger.info("sync_completed", events=1500, duration=45.2, relay="wss://relay.example.com")
# Output: 2025-01-01 12:00:00 INFO synchronizer: sync_completed events=1500 duration=45.2 relay=wss://relay.example.com

# Error level
logger.error("connection_failed", relay="wss://relay.example.com", error="timeout")

# Debug level
logger.debug("processing_event", event_id="abc123")

# Warning level
logger.warning("slow_relay", relay="wss://relay.example.com", rtt=5000)
```

### Log Levels

Configure log level via CLI:

```bash
python -m services finder --log-level DEBUG
```

## Module Exports

The core package exports all public components:

```python
# src/core/__init__.py
from core.pool import Pool, PoolConfig
from core.brotr import Brotr, BrotrConfig
from core.base_service import BaseService
from core.logger import Logger

__all__ = [
    "Pool",
    "PoolConfig",
    "Brotr",
    "BrotrConfig",
    "BaseService",
    "Logger",
]
```

## Next Steps

- Explore the [Service Layer](/architecture/service-layer/)
- Learn about [Configuration](/configuration/core/)
- Understand the [Database Schema](/database/schema/)
