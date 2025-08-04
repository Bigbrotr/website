---
title: Database Schema
description: A concise schema for storing, indexing, and analyzing Nostr events and relay metadata.
---

This schema defines a relational database model for archiving, monitoring, and analyzing the Nostr network. It captures raw events, relay metadata, and their interrelationships to provide a complete and queryable snapshot of Nostr activity over time. Designed for high-performance ingestion and auditing, the schema supports data integrity, deduplication, and extensibility.

---

## 📚 Tables

This section describes the structure and purpose of each table in the schema, including key constraints and indexes for optimal query performance.

### 🧾 `events`

Stores metadata of all Nostr events collected.

| Column       | Type        | Description                                 |
|--------------|-------------|---------------------------------------------|
| `id`         | `CHAR(64)`  | Unique event identifier                     |
| `pubkey`     | `CHAR(64)`  | Author's public key                         |
| `created_at` | `BIGINT`    | Unix timestamp of event creation            |
| `kind`       | `INT`       | Nostr event kind                            |
| `content`    | `BYTEA`     | Event content in compressed byte format     |
| `tags`       | `JSONB`     | Tags array in JSONB format                  |
| `sig`        | `CHAR(128)` | Event signature                             |

**Indexes**: `pubkey`, `kind`, `tags (GIN)`

### 🌐 `relays`

Catalog of known relays including network and insertion time.

| Column        | Type     | Description                                   |
|---------------|----------|-----------------------------------------------|
| `url`         | `TEXT`   | Unique relay WebSocket URL (PK)               |
| `network`     | `TEXT`   | Relay network type (`clearnet` / `tor`)       |
| `inserted_at` | `BIGINT` | When the relay was first discovered           |

### 🔄 `events_relays`

Links events to the relays where they were seen.

| Column      | Type       | Description                                   |
|-------------|------------|-----------------------------------------------|
| `event_id`  | `CHAR(64)` | Event ID (FK)                                 |
| `relay_url` | `TEXT`     | Relay URL (FK)                                |
| `seen_at`   | `BIGINT`   | Timestamp the event was observed on the relay |

**Indexes**: `event_id`, `relay_url` (Composite PK)

### 📈 `relay_metadata`

Captures per-relay monitoring and NIP-11 metadata over time.

| Column            | Type     | Description                                 |
|-------------------|----------|---------------------------------------------|
| `relay_url`       | `TEXT`   | FK to `relays.url`                          |
| `generated_at`    | `BIGINT` | When the metadata snapshot was generated    |
| `connection_success` | `BOOLEAN` | Successful connection (ping)          |
| `nip11_success`   | `BOOLEAN` | Successful NIP-11 fetch                     |
| `openable`, `readable`, `writable` | `BOOLEAN` | Access capabilities     |
| `rtt_*`           | `INT`    | Round-trip times for various actions        |
| `name`, `description`, `banner`, `icon` | `TEXT` | NIP-11 descriptive fields |
| `pubkey`, `contact` | `TEXT` | Admin metadata                              |
| `supported_nips`  | `JSONB`  | Supported NIP numbers                       |
| `software`, `version` | `TEXT` | Relay implementation info              |
| `privacy_policy`, `terms_of_service` | `TEXT` | Legal info         |
| `limitation`, `extra_fields` | `JSONB` | Optional metadata            |

**Composite Primary Key**: (`relay_url`, `generated_at`)  
**Indexes**: `relay_url`, `supported_nips (GIN)`, `limitation (GIN)`

---

## 🔧 Functions

These functions are designed for automation and performance, allowing Bigbrotr modules to efficiently insert and maintain a complete and up-to-date network archive.

### 🧹 `delete_orphan_events()`

Deletes any events that are not referenced by `events_relays`, ensuring referential integrity and reducing unused storage.

```sql
-- Deletes from `events` any entry not present in `events_relays`
DELETE FROM events e
WHERE NOT EXISTS (
    SELECT 1
    FROM events_relays er
    WHERE er.event_id = e.id
);
```

### ➕ `insert_event(...)`

Inserts a new event, its content, associated relay, and seen timestamp.

**Parameters:**

- `p_id`, `p_pubkey`, `p_created_at`, `p_kind`, `p_tags`, `p_sig`: Standard event metadata
- `p_content`: Compressed event payload
- `p_relay_url`, `p_relay_network`, `p_relay_inserted_at`: Relay details
- `p_seen_at`: Time the event was seen

**Behavior:**

- Avoids duplicate inserts via `ON CONFLICT DO NOTHING`
- Populates all relevant tables in a single transaction

```sql
-- Inserts metadata into `events` table if not already present
INSERT INTO events (id, pubkey, created_at, kind, tags, content, sig)
VALUES (p_id, p_pubkey, p_created_at, p_kind, p_tags, p_content, p_sig)
ON CONFLICT (id) DO NOTHING;

-- Registers relay if not already in `relays`
INSERT INTO relays (url, network, inserted_at)
VALUES (p_relay_url, p_relay_network, p_relay_inserted_at)
ON CONFLICT (url) DO NOTHING;

-- Creates link between event and relay
INSERT INTO events_relays (event_id, relay_url, seen_at)
VALUES (p_id, p_relay_url, p_seen_at)
ON CONFLICT (event_id, relay_url) DO NOTHING;
```

### 🌍 `insert_relay(...)`

Adds a relay to the registry.

**Parameters:**

- `p_url`: Relay WebSocket URL  
- `p_network`: Relay type (e.g., `clearnet`, `tor`)  
- `p_inserted_at`: Unix timestamp of discovery  

```sql
-- Inserts a relay entry unless already present
INSERT INTO relays (url, network, inserted_at)
VALUES (p_url, p_network, p_inserted_at)
ON CONFLICT (url) DO NOTHING;
```

### 📡 `insert_relay_metadata(...)`

Records a metadata snapshot for a relay.

**Parameters:**

Includes all fields required by the `relay_metadata` schema, including:

- Connection tests: `connection_success`, `nip11_success`, `rtt_*`, `openable`, `readable`, `writable`
- NIP-11 fields: `name`, `pubkey`, `supported_nips`, `software`, `version`
- Legal fields: `privacy_policy`, `terms_of_service`
- Optional: `limitation`, `extra_fields`

**Behavior:**

- Inserts into both `relays` and `relay_metadata`  
- Uses composite key to avoid overwriting previous snapshots

```sql
-- Ensure the relay is known
INSERT INTO relays(url, network, inserted_at)
VALUES (p_relay_url, p_relay_network, p_relay_inserted_at)
ON CONFLICT (url) DO NOTHING;

-- Insert relay metadata snapshot
INSERT INTO relay_metadata (
    relay_url,
    generated_at,
    connection_success,
    nip11_success,
    openable,
    readable,
    writable,
    rtt_open,
    rtt_read,
    rtt_write,
    name,
    description,
    banner,
    icon,
    pubkey,
    contact,
    supported_nips,
    software,
    version,
    privacy_policy,
    terms_of_service,
    limitation,
    extra_fields
)
VALUES (
    p_relay_url,
    p_generated_at,
    p_connection_success,
    p_nip11_success,
    p_openable,
    p_readable,
    p_writable,
    p_rtt_open,
    p_rtt_read,
    p_rtt_write,
    p_name,
    p_description,
    p_banner,
    p_icon,
    p_pubkey,
    p_contact,
    p_supported_nips,
    p_software,
    p_version,
    p_privacy_policy,
    p_terms_of_service,
    p_limitation,
    p_extra_fields
)
ON CONFLICT (relay_url, generated_at) DO NOTHING;
```
