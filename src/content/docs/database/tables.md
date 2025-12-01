---
title: Tables
description: Detailed documentation of BigBrotr database tables
---

This page documents all tables in the BigBrotr database schema.

## relays

Registry of known Nostr relay URLs.

```sql
CREATE TABLE relays (
    url TEXT PRIMARY KEY,
    network TEXT NOT NULL,
    inserted_at BIGINT NOT NULL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `url` | TEXT | WebSocket URL (primary key) |
| `network` | TEXT | 'clearnet' or 'tor' |
| `inserted_at` | BIGINT | Unix timestamp when discovered |

### Example Queries

```sql
-- Count by network type
SELECT network, COUNT(*) FROM relays GROUP BY network;

-- Recently discovered relays
SELECT url, TO_TIMESTAMP(inserted_at) as discovered
FROM relays
ORDER BY inserted_at DESC
LIMIT 20;

-- Tor relays
SELECT url FROM relays WHERE network = 'tor';
```

## events

Nostr events with efficient BYTEA storage.

### BigBrotr Schema (Full)

```sql
CREATE TABLE events (
    id BYTEA PRIMARY KEY,
    pubkey BYTEA NOT NULL,
    created_at BIGINT NOT NULL,
    kind INTEGER NOT NULL,
    tags JSONB NOT NULL,
    tagvalues TEXT[] GENERATED ALWAYS AS (tags_to_tagvalues(tags)) STORED,
    content TEXT NOT NULL,
    sig BYTEA NOT NULL
);
```

### LilBrotr Schema (Essential Metadata)

```sql
CREATE TABLE events (
    id BYTEA PRIMARY KEY,
    pubkey BYTEA NOT NULL,
    created_at BIGINT NOT NULL,
    kind INTEGER NOT NULL,
    sig BYTEA NOT NULL
);
```

| Column | Type | Description | LilBrotr |
|--------|------|-------------|----------|
| `id` | BYTEA | Event ID (32 bytes) | ✓ |
| `pubkey` | BYTEA | Author's public key (32 bytes) | ✓ |
| `created_at` | BIGINT | Unix timestamp | ✓ |
| `kind` | INTEGER | Event kind (NIP-01) | ✓ |
| `tags` | JSONB | Event tags array | ✗ (omitted) |
| `tagvalues` | TEXT[] | Generated searchable values | ✗ (omitted) |
| `content` | TEXT | Event content | ✗ (omitted) |
| `sig` | BYTEA | Schnorr signature (64 bytes) | ✓ |

LilBrotr indexes all events but omits the heavy `tags` and `content` fields. Queries by author, kind, timestamp, and relay distribution work identically in both implementations.

### Example Queries

```sql
-- Recent events
SELECT
    encode(id, 'hex') as event_id,
    kind,
    TO_TIMESTAMP(created_at) as created
FROM events
ORDER BY created_at DESC
LIMIT 20;

-- Events by kind
SELECT kind, COUNT(*) as count
FROM events
GROUP BY kind
ORDER BY count DESC;

-- Events by author
SELECT
    encode(pubkey, 'hex') as author,
    COUNT(*) as event_count
FROM events
GROUP BY pubkey
ORDER BY event_count DESC
LIMIT 20;

-- Search by tag (BigBrotr only)
SELECT encode(id, 'hex') as event_id
FROM events
WHERE tagvalues @> ARRAY['p:79be667ef9dcbbac...'];
```

### tagvalues Column

The `tagvalues` column is auto-generated for efficient tag searching:

```sql
-- Tags: [["p", "abc123"], ["e", "def456"]]
-- Generates: ["p:abc123", "e:def456"]

-- Search events mentioning a pubkey
SELECT * FROM events
WHERE tagvalues @> ARRAY['p:79be667ef9dcbbac...'];

-- Search events referencing another event
SELECT * FROM events
WHERE tagvalues @> ARRAY['e:abc123def456...'];
```

## events_relays

Junction table tracking which relays have each event.

```sql
CREATE TABLE events_relays (
    event_id BYTEA NOT NULL REFERENCES events(id),
    relay_url TEXT NOT NULL REFERENCES relays(url),
    seen_at BIGINT NOT NULL,
    PRIMARY KEY (event_id, relay_url)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | BYTEA | Foreign key to events |
| `relay_url` | TEXT | Foreign key to relays |
| `seen_at` | BIGINT | When event was seen on this relay |

### Example Queries

```sql
-- Relays hosting an event
SELECT relay_url, TO_TIMESTAMP(seen_at) as seen
FROM events_relays
WHERE event_id = decode('abc123...', 'hex');

-- Event count per relay
SELECT relay_url, COUNT(*) as events
FROM events_relays
GROUP BY relay_url
ORDER BY events DESC;

-- Event redundancy (how many relays have each event)
SELECT
    COUNT(relay_url) as relay_count,
    COUNT(*) as event_count
FROM events_relays
GROUP BY event_id
ORDER BY relay_count DESC;
```

## nip11

Deduplicated NIP-11 relay information documents.

```sql
CREATE TABLE nip11 (
    id BYTEA PRIMARY KEY,
    name TEXT,
    description TEXT,
    pubkey TEXT,
    contact TEXT,
    supported_nips JSONB,
    software TEXT,
    version TEXT,
    limitation JSONB,
    privacy_policy TEXT,
    terms_of_service TEXT,
    banner TEXT,
    icon TEXT,
    extra_fields JSONB
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BYTEA | SHA-256 hash of document |
| `name` | TEXT | Relay name |
| `description` | TEXT | Relay description |
| `pubkey` | TEXT | Operator's public key |
| `contact` | TEXT | Contact information |
| `supported_nips` | JSONB | Array of supported NIPs |
| `software` | TEXT | Software name/URL |
| `version` | TEXT | Software version |
| `limitation` | JSONB | Relay limitations |
| `privacy_policy` | TEXT | Privacy policy URL |
| `terms_of_service` | TEXT | Terms of service URL |
| `banner` | TEXT | Banner image URL |
| `icon` | TEXT | Icon URL |
| `extra_fields` | JSONB | Additional fields |

### Example Queries

```sql
-- Software distribution
SELECT software, COUNT(*) as count
FROM nip11
WHERE software IS NOT NULL
GROUP BY software
ORDER BY count DESC;

-- Relays supporting specific NIP
SELECT n.name, n.software
FROM nip11 n
WHERE n.supported_nips @> '[11]';

-- Search by name
SELECT name, description, software
FROM nip11
WHERE name ILIKE '%damus%';
```

## nip66

Deduplicated NIP-66 relay test results.

```sql
CREATE TABLE nip66 (
    id BYTEA PRIMARY KEY,
    openable BOOLEAN,
    readable BOOLEAN,
    writable BOOLEAN,
    rtt_open INTEGER,
    rtt_read INTEGER,
    rtt_write INTEGER
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BYTEA | SHA-256 hash of test results |
| `openable` | BOOLEAN | Can establish connection |
| `readable` | BOOLEAN | Responds to REQ |
| `writable` | BOOLEAN | Accepts EVENT |
| `rtt_open` | INTEGER | Connection latency (ms) |
| `rtt_read` | INTEGER | Read latency (ms) |
| `rtt_write` | INTEGER | Write latency (ms) |

### Example Queries

```sql
-- Capability statistics
SELECT
    COUNT(*) FILTER (WHERE openable) as openable,
    COUNT(*) FILTER (WHERE readable) as readable,
    COUNT(*) FILTER (WHERE writable) as writable
FROM nip66;

-- Average RTT
SELECT
    AVG(rtt_open) as avg_open,
    AVG(rtt_read) as avg_read,
    AVG(rtt_write) as avg_write
FROM nip66
WHERE openable = true;
```

## relay_metadata

Time-series snapshots of relay health and metadata.

```sql
CREATE TABLE relay_metadata (
    relay_url TEXT NOT NULL REFERENCES relays(url),
    generated_at BIGINT NOT NULL,
    nip11_id BYTEA REFERENCES nip11(id),
    nip66_id BYTEA REFERENCES nip66(id),
    PRIMARY KEY (relay_url, generated_at)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `relay_url` | TEXT | Foreign key to relays |
| `generated_at` | BIGINT | Snapshot timestamp |
| `nip11_id` | BYTEA | Foreign key to nip11 |
| `nip66_id` | BYTEA | Foreign key to nip66 |

### Example Queries

```sql
-- Latest metadata for a relay
SELECT
    rm.relay_url,
    TO_TIMESTAMP(rm.generated_at) as checked,
    n11.name,
    n66.openable,
    n66.readable
FROM relay_metadata rm
LEFT JOIN nip11 n11 ON rm.nip11_id = n11.id
LEFT JOIN nip66 n66 ON rm.nip66_id = n66.id
WHERE rm.relay_url = 'wss://relay.damus.io'
ORDER BY rm.generated_at DESC
LIMIT 1;

-- Health history for a relay
SELECT
    TO_TIMESTAMP(rm.generated_at) as checked,
    n66.openable,
    n66.rtt_open
FROM relay_metadata rm
JOIN nip66 n66 ON rm.nip66_id = n66.id
WHERE rm.relay_url = 'wss://relay.damus.io'
ORDER BY rm.generated_at DESC
LIMIT 100;
```

## service_state

Service state persistence for incremental processing.

```sql
CREATE TABLE service_state (
    service_name TEXT PRIMARY KEY,
    state JSONB NOT NULL DEFAULT '{}',
    updated_at BIGINT NOT NULL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `service_name` | TEXT | Service identifier |
| `state` | JSONB | Arbitrary state data |
| `updated_at` | BIGINT | Last update timestamp |

### Example Queries

```sql
-- View all service states
SELECT
    service_name,
    TO_TIMESTAMP(updated_at) as updated,
    state
FROM service_state;

-- Synchronizer state (per-relay timestamps)
SELECT
    service_name,
    jsonb_object_keys(state->'relay_timestamps') as relay,
    state->'relay_timestamps'->jsonb_object_keys(state->'relay_timestamps') as last_sync
FROM service_state
WHERE service_name = 'synchronizer';
```

## Next Steps

- Learn about [Views & Procedures](/database/views-procedures/)
- Explore [Configuration](/configuration/overview/)
- Check the [FAQ](/resources/faq/)
