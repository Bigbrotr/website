---
title: Schema Overview
description: BigBrotr's PostgreSQL database schema
---

BigBrotr uses PostgreSQL 16+ with PGBouncer for connection pooling. The schema is designed for efficient storage, fast queries, and data integrity.

## Design Principles

### BYTEA Storage

Event IDs and signatures are stored as BYTEA (binary) instead of hex strings:

| Storage | Size (32 bytes) | Savings |
|---------|-----------------|---------|
| CHAR(64) hex | 64 bytes | - |
| BYTEA binary | 32 bytes | **50%** |

### Content Deduplication

NIP-11 and NIP-66 documents use content-addressed storage:
- Documents are hashed (SHA-256)
- Identical documents share one record
- `relay_metadata` links relays to documents by hash

### Normalized Schema

```
relays ──────────────┬──────────────── relay_metadata
                     │                      │
                     │                 ┌────┴────┐
                     │                 │         │
events ─── events_relays             nip11    nip66
```

## Schema Overview

### Core Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `relays` | Registry of known relay URLs | `url` |
| `events` | Nostr events | `id` (BYTEA) |
| `events_relays` | Event-relay associations | `(event_id, relay_url)` |

### Metadata Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `nip11` | Deduplicated NIP-11 documents | `id` (hash) |
| `nip66` | Deduplicated NIP-66 test results | `id` (hash) |
| `relay_metadata` | Time-series metadata snapshots | `(relay_url, generated_at)` |

### System Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `service_state` | Service state persistence | `service_name` |

## Extensions

BigBrotr requires these PostgreSQL extensions:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- Hash functions
CREATE EXTENSION IF NOT EXISTS btree_gin;   -- GIN index support
```

## Indexes

### Events Table

```sql
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_pubkey ON events(pubkey);
CREATE INDEX idx_events_kind ON events(kind);
CREATE INDEX idx_events_pubkey_created_at ON events(pubkey, created_at DESC);
CREATE INDEX idx_events_tagvalues ON events USING gin(tagvalues);  -- BigBrotr only
```

### Events-Relays Table

```sql
CREATE INDEX idx_events_relays_relay_url ON events_relays(relay_url);
CREATE INDEX idx_events_relays_seen_at ON events_relays(seen_at DESC);
```

### Relay Metadata Table

```sql
CREATE INDEX idx_relay_metadata_generated_at ON relay_metadata(generated_at DESC);
```

## BigBrotr vs LilBrotr Schema

The key difference is in the `events` table:

### BigBrotr (Full Storage)

```sql
CREATE TABLE events (
    id BYTEA PRIMARY KEY,
    pubkey BYTEA NOT NULL,
    created_at BIGINT NOT NULL,
    kind INTEGER NOT NULL,
    tags JSONB NOT NULL,                              -- Stored
    tagvalues TEXT[] GENERATED ALWAYS AS
        (tags_to_tagvalues(tags)) STORED,             -- Indexed
    content TEXT NOT NULL,                             -- Stored
    sig BYTEA NOT NULL
);
```

### LilBrotr (Essential Metadata)

```sql
CREATE TABLE events (
    id BYTEA PRIMARY KEY,
    pubkey BYTEA NOT NULL,
    created_at BIGINT NOT NULL,
    kind INTEGER NOT NULL,
    -- tags NOT stored (saves ~40%)
    -- tagvalues NOT generated
    -- content NOT stored (saves ~20%)
    sig BYTEA NOT NULL
);
```

**Disk savings**: ~60% compared to BigBrotr

LilBrotr still indexes all events with their essential metadata (id, pubkey, created_at, kind, sig). You can query by author, event kind, timestamp, and track which relays have which events. Only the heavy `tags` and `content` fields are omitted.

## Entity Relationship

```
                              ┌─────────────────────────────┐
                              │           relays            │
                              │  url (PK)                   │
                              │  network                    │
                              │  inserted_at                │
                              └──────────────┬──────────────┘
                                     │       │
                      ┌──────────────┘       └──────────────┐
                      │                                     │
                      ▼                                     ▼
         ┌──────────────────────┐              ┌──────────────────────┐
         │    events_relays     │              │    relay_metadata    │
         │  event_id (FK)       │              │  relay_url (FK, PK)  │
         │  relay_url (FK)      │              │  generated_at (PK)   │
         │  seen_at             │              │  nip11_id (FK)       │
         └──────────┬───────────┘              │  nip66_id (FK)       │
                    │                          └───────────┬──────────┘
                    │                                ┌─────┴─────┐
                    ▼                                │           │
         ┌──────────────────────┐                    ▼           ▼
         │        events        │           ┌───────────┐ ┌───────────┐
         │  id (PK)             │           │   nip11   │ │   nip66   │
         │  pubkey              │           │  id (PK)  │ │  id (PK)  │
         │  created_at          │           │  name     │ │  openable │
         │  kind                │           │  desc     │ │  readable │
         │  tags                │           │  nips     │ │  writable │
         │  content             │           │  ...      │ │  rtt_*    │
         │  sig                 │           └───────────┘ └───────────┘
         └──────────────────────┘

                              ┌─────────────────────────────┐
                              │       service_state         │
                              │  service_name (PK)          │
                              │  state (JSONB)              │
                              │  updated_at                 │
                              └─────────────────────────────┘
```

## SQL Schema Files

Schema is defined in numbered SQL files in `postgres/init/`:

| File | Purpose |
|------|---------|
| `01_extensions.sql` | PostgreSQL extensions |
| `02_tables.sql` | Table definitions |
| `03_indexes.sql` | Index creation |
| `04_functions.sql` | Stored procedures |
| `05_views.sql` | Analytics views |

Files are executed in order by PostgreSQL on initialization.

## Connecting to the Database

### Via Docker

```bash
# Direct PostgreSQL
docker-compose exec postgres psql -U admin -d bigbrotr

# Via PGBouncer
psql -h localhost -p 6432 -U admin -d bigbrotr
```

### Connection String

```
postgresql://admin:password@localhost:6432/bigbrotr
```

### PGBouncer Configuration

```ini
[databases]
bigbrotr = host=postgres port=5432 dbname=bigbrotr

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
```

## Next Steps

- Explore [Tables](/database/tables/) in detail
- Learn about [Views & Procedures](/database/views-procedures/)
- Understand [Configuration](/configuration/core/)
