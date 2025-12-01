---
title: Implementations
description: Choose between BigBrotr (full-featured) and LilBrotr (lightweight)
---

BigBrotr's three-layer architecture enables multiple deployment configurations from the same codebase. Two implementations are provided out of the box, each optimized for different use cases.

## Available Implementations

### BigBrotr (Full-Featured)

The default implementation with complete event storage and all features enabled.

| Feature | Value |
|---------|-------|
| **Event Storage** | Full (tags, content, signatures) |
| **Tor Support** | Enabled |
| **Concurrency** | 10 parallel connections, 10 worker processes |
| **PostgreSQL Port** | 5432 |
| **PGBouncer Port** | 6432 |
| **Tor Port** | 9050 |

**Best for:**
- Complete Nostr archiving
- Research and analytics requiring full event data
- Applications needing tag-based queries
- Long-term event preservation

```bash
cd implementations/bigbrotr
docker-compose up -d
```

### LilBrotr (Lightweight)

A lightweight implementation that indexes all events but omits storage-heavy fields (`tags`, `content`) to minimize disk usage.

| Feature | Value |
|---------|-------|
| **Event Storage** | Essential metadata (id, pubkey, created_at, kind, sig) |
| **Omitted Fields** | tags, tagvalues, content |
| **Disk Savings** | ~60% compared to BigBrotr |
| **Tor Support** | Disabled by default |
| **Concurrency** | 5 parallel connections |
| **PostgreSQL Port** | 5433 |
| **PGBouncer Port** | 6433 |
| **Tor Port** | 9051 |

**Best for:**
- Event indexing without content storage
- Analytics on event metadata (authors, kinds, timestamps)
- Resource-constrained environments
- When you don't need tag-based queries or event content
- Running alongside BigBrotr on the same machine

```bash
cd implementations/lilbrotr
docker-compose up -d
```

## Schema Differences

The key difference is in the `events` table:

### BigBrotr Schema (Full)

```sql
CREATE TABLE events (
    id BYTEA PRIMARY KEY,
    pubkey BYTEA NOT NULL,
    created_at BIGINT NOT NULL,
    kind INTEGER NOT NULL,
    tags JSONB NOT NULL,                    -- Stored
    tagvalues TEXT[] GENERATED ALWAYS AS
        (tags_to_tagvalues(tags)) STORED,   -- Indexed for queries
    content TEXT NOT NULL,                   -- Stored
    sig BYTEA NOT NULL
);
```

### LilBrotr Schema (Lightweight)

```sql
CREATE TABLE events (
    id BYTEA PRIMARY KEY,
    pubkey BYTEA NOT NULL,
    created_at BIGINT NOT NULL,
    kind INTEGER NOT NULL,
    -- tags NOT stored (saves ~40% disk space)
    -- tagvalues NOT generated (no tag-based queries)
    -- content NOT stored (saves ~20% disk space)
    sig BYTEA NOT NULL
);
```

LilBrotr still indexes **all events** from all relays - it simply stores less data per event. You can still query by author, kind, timestamp, and track event distribution across relays.

## Running Both Simultaneously

Both implementations can run on the same machine using different ports:

```bash
# Start BigBrotr
cd implementations/bigbrotr
docker-compose up -d

# Start LilBrotr (in another terminal)
cd implementations/lilbrotr
docker-compose up -d
```

Access databases:
```bash
# BigBrotr
psql -h localhost -p 5432 -U admin -d bigbrotr

# LilBrotr
psql -h localhost -p 5433 -U admin -d lilbrotr
```

## Creating Custom Implementations

You can create your own implementation for specific use cases:

### Step 1: Copy an Existing Implementation

```bash
cp -r implementations/bigbrotr implementations/myimpl
cd implementations/myimpl
```

### Step 2: Customize Configuration

Edit YAML files in `yaml/` directory:

```yaml
# yaml/services/synchronizer.yaml
tor:
  enabled: false           # Disable Tor

filter:
  kinds: [0, 1, 3, 6, 7]  # Only sync specific event kinds

concurrency:
  max_parallel: 3          # Lower concurrency
  max_processes: 2         # Fewer workers
```

### Step 3: Modify SQL Schema (Optional)

Edit `postgres/init/02_tables.sql` for custom storage:

```sql
-- Only store metadata events (kinds 0, 3, 10002)
ALTER TABLE events ADD CONSTRAINT events_kind_check
    CHECK (kind IN (0, 3, 10002));
```

### Step 4: Update Docker Compose Ports

Edit `docker-compose.yaml` to avoid port conflicts:

```yaml
services:
  postgres:
    ports:
      - "5434:5432"  # Different port
  pgbouncer:
    ports:
      - "6434:5432"
```

### Step 5: Deploy

```bash
cp .env.example .env
nano .env  # Set DB_PASSWORD
docker-compose up -d
```

## Common Customization Scenarios

### Archive-Only (Specific Event Kinds)

Store only specific event types like profiles and contact lists:

```yaml
# yaml/services/synchronizer.yaml
filter:
  kinds: [0, 3, 10002]  # Profile, contacts, relay list
```

### Single-Relay Monitor

Monitor and sync from a single relay:

```yaml
# yaml/services/synchronizer.yaml
source:
  from_database: false
  static_relays:
    - "wss://relay.damus.io"
```

### Metrics-Only (No Events)

Store only relay metadata, no events:

```sql
-- postgres/init/02_tables.sql
-- Remove or empty the events table
-- Keep only relays, relay_metadata, nip11, nip66
```

### Regional Deployment

Use region-specific seed relays:

```bash
# data/seed_relays.txt
wss://relay.example.eu
wss://relay.example.de
wss://relay.example.fr
```

## Implementation Structure

Each implementation contains:

```
implementations/myimpl/
├── yaml/
│   ├── core/
│   │   └── brotr.yaml          # Database connection settings
│   └── services/
│       ├── initializer.yaml    # Schema verification, seed file
│       ├── finder.yaml         # API sources, intervals
│       ├── monitor.yaml        # Health check settings
│       └── synchronizer.yaml   # Event sync configuration
├── postgres/
│   └── init/                   # SQL schema files (00-99)
│       ├── 01_extensions.sql
│       ├── 02_tables.sql
│       ├── 03_indexes.sql
│       ├── 04_functions.sql
│       └── 05_views.sql
├── pgbouncer/
│   └── pgbouncer.ini           # Connection pooler config
├── data/
│   └── seed_relays.txt         # Initial relay URLs
├── docker-compose.yaml
├── Dockerfile
└── .env.example
```

The core (`src/core/`) and service (`src/services/`) layers remain unchanged across all implementations. Only configuration differs.

## Next Steps

- Learn about the [Architecture](/architecture/overview/)
- Explore [Configuration options](/configuration/overview/)
- Understand [Service behavior](/services/initializer/)
