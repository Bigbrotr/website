---
title: Architecture Overview
description: Understanding BigBrotr's three-layer modular architecture
---

BigBrotr follows a three-layer architecture that separates concerns and enables maximum flexibility. This design allows multiple deployments from the same codebase, easy testing through dependency injection, and configuration-driven behavior without code changes.

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      IMPLEMENTATION LAYER                            │
│                                                                      │
│   implementations/bigbrotr/    implementations/lilbrotr/             │
│   ├── yaml/                    ├── yaml/                             │
│   ├── postgres/init/           ├── postgres/init/                    │
│   ├── data/seed_relays.txt     ├── data/seed_relays.txt              │
│   └── docker-compose.yaml      └── docker-compose.yaml               │
│                                                                      │
│   Purpose: Define HOW this specific deployment behaves               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Uses
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER                                │
│                                                                      │
│   src/services/                                                      │
│   ├── initializer.py    Database bootstrap and verification         │
│   ├── finder.py         Relay URL discovery                         │
│   ├── monitor.py        Relay health monitoring (NIP-11/NIP-66)     │
│   ├── synchronizer.py   Event collection and sync                   │
│   ├── api.py            REST API (planned)                          │
│   └── dvm.py            Data Vending Machine (planned)              │
│                                                                      │
│   Purpose: Business logic, service coordination, data transformation │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Leverages
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CORE LAYER                                  │
│                                                                      │
│   src/core/                                                          │
│   ├── pool.py           PostgreSQL connection pooling                │
│   ├── brotr.py          Database interface + stored procedures       │
│   ├── base_service.py   Abstract service base class                  │
│   └── logger.py         Structured logging                           │
│                                                                      │
│   Purpose: Reusable foundation, zero business logic                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

| Layer | Responsibility | Changes When |
|-------|----------------|--------------|
| **Core** | Infrastructure, utilities, abstractions | Rarely - foundation is stable |
| **Service** | Business logic, orchestration | Feature additions, protocol updates |
| **Implementation** | Configuration, customization | Per-deployment or environment |

## Design Benefits

### 1. Multiple Deployments
The same codebase supports different deployment configurations:
- **BigBrotr**: Full event storage (tags, content) with Tor support
- **LilBrotr**: Lightweight indexing without tags/content (~60% disk savings)
- **Custom**: Your own implementation for specific needs

### 2. Testability
Dependency injection enables comprehensive unit testing:
```python
# Production code
service = MyService(brotr=real_brotr)

# Test code
mock_brotr = MagicMock(spec=Brotr)
service = MyService(brotr=mock_brotr)
```

### 3. Configuration-Driven
All behavior is configurable through YAML files:
```yaml
# yaml/services/synchronizer.yaml
concurrency:
  max_parallel: 10
  max_processes: 10
tor:
  enabled: true
```

### 4. Clear Separation
Each layer has a single responsibility:
- Core: "How do we connect to the database?"
- Service: "What do we do with the data?"
- Implementation: "How is this deployment configured?"

## Data Flow

### Event Synchronization Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Finder    │     │   Monitor   │     │ Synchronizer│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Discover          │ Check health      │ Collect events
       │ relay URLs        │ NIP-11/NIP-66     │ from relays
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                      PostgreSQL                      │
│  ┌─────────┐  ┌──────┐  ┌─────────────────┐         │
│  │ relays  │  │events│  │ relay_metadata  │         │
│  └─────────┘  └──────┘  └─────────────────┘         │
│       │           │              │                   │
│       └───────────┴──────────────┘                   │
│                events_relays                         │
└─────────────────────────────────────────────────────┘
```

### Metadata Deduplication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                       Monitor Service                         │
│                                                               │
│   ┌─────────────┐     ┌─────────────┐     ┌──────────────┐   │
│   │ Fetch NIP-11│────▶│Compute Hash │────▶│Check if exists│  │
│   └─────────────┘     └─────────────┘     └──────────────┘   │
│                                                  │            │
│                                    ┌─────────────┴──────────┐│
│                                    │                        ││
│                                    ▼                        ▼│
│                           ┌──────────────┐         ┌────────┐│
│                           │Insert new rec│         │Reuse ID││
│                           └──────────────┘         └────────┘│
│                                    │                        ││
│                                    └─────────────┬──────────┘│
│                                                  │            │
│                                                  ▼            │
│                                    ┌─────────────────────────┐│
│                                    │ Insert relay_metadata   ││
│                                    │ (links relay to nip11/  ││
│                                    │  nip66 by hash ID)      ││
│                                    └─────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## Concurrency Model

### Async I/O
All I/O operations are async using:
- `asyncpg` for database operations
- `aiohttp` for HTTP requests
- `aiohttp-socks` for SOCKS5 proxy (Tor)

### Connection Pooling

```
Application                PGBouncer              PostgreSQL
    │                          │                      │
    ├── asyncpg pool ─────────▶├── connection pool ──▶│
    │   (20 connections)       │   (25 pool size)     │ (100 max)
    │                          │                      │
    ├── Service 1 ────────────▶│                      │
    ├── Service 2 ────────────▶│                      │
    ├── Service 3 ────────────▶│                      │
    └── Service 4 ────────────▶│                      │
```

### Multicore Processing (Synchronizer)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │                   aiomultiprocess Pool                  │    │
│   │                                                         │    │
│   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │    │
│   │  │  Worker 1   │ │  Worker 2   │ │  Worker N   │       │    │
│   │  │             │ │             │ │             │       │    │
│   │  │ relay batch │ │ relay batch │ │ relay batch │       │    │
│   │  │     │       │ │     │       │ │     │       │       │    │
│   │  │     ▼       │ │     ▼       │ │     ▼       │       │    │
│   │  │  events     │ │  events     │ │  events     │       │    │
│   │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘       │    │
│   │         │               │               │               │    │
│   └─────────┴───────────────┴───────────────┴───────────────┘    │
│                             │                                     │
│                             ▼                                     │
│                    ┌────────────────┐                            │
│                    │ Aggregate and  │                            │
│                    │ insert to DB   │                            │
│                    └────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Design Patterns

### Dependency Injection
Services receive their dependencies via constructor:

```python
# Brotr is injected, not created internally
service = MyService(brotr=brotr, config=config)

# Enables testing with mocks
mock_brotr = MagicMock(spec=Brotr)
service = MyService(brotr=mock_brotr)
```

### Composition
`Brotr` HAS-A `Pool` (rather than IS-A):

```python
class Brotr:
    def __init__(self, pool: Pool | None = None, ...):
        self._pool = pool or Pool(...)

    @property
    def pool(self) -> Pool:
        return self._pool
```

### Template Method
`BaseService.run_forever()` calls abstract `run()`:

```python
class BaseService:
    async def run_forever(self, interval: float) -> None:
        while not self._shutdown_requested:
            await self.run()  # Template method
            if await self.wait(interval):
                break

    @abstractmethod
    async def run(self) -> None:
        """Implemented by subclasses."""
        pass
```

### Factory Method
Services provide multiple construction paths:

```python
# From YAML file
service = MyService.from_yaml("config.yaml", brotr=brotr)

# From dictionary
service = MyService.from_dict(config_dict, brotr=brotr)

# Direct construction
service = MyService(brotr=brotr, config=MyServiceConfig(...))
```

### Context Manager
Resources are automatically managed:

```python
async with brotr:           # Connect on enter, close on exit
    async with service:     # Load state on enter, save on exit
        await service.run_forever(interval=3600)
```

## Graceful Shutdown

```python
# Signal handler (sync context)
def handle_signal(signum, frame):
    service.request_shutdown()  # Sets flag, doesn't await

# Service main loop
async def run_forever(self, interval: float) -> None:
    while not self._shutdown_requested:
        await self.run()
        if await self.wait(interval):  # Returns early if shutdown
            break
    # Cleanup happens in context manager __aexit__
```

## Next Steps

- Learn about the [Core Layer](/architecture/core-layer/)
- Explore the [Service Layer](/architecture/service-layer/)
- Understand [Configuration](/configuration/overview/)
