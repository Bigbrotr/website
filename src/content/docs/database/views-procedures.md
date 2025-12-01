---
title: Views & Procedures
description: Analytics views and stored procedures
---

BigBrotr includes pre-built views for analytics and stored procedures for data integrity.

## Views

### relay_metadata_latest

Latest metadata snapshot per relay with NIP-11/NIP-66 joins.

```sql
CREATE VIEW relay_metadata_latest AS
SELECT DISTINCT ON (rm.relay_url)
    rm.relay_url,
    r.network,
    rm.generated_at,
    n66.openable as nip66_openable,
    n66.readable as nip66_readable,
    n66.writable as nip66_writable,
    n66.rtt_open as nip66_rtt_open,
    n66.rtt_read as nip66_rtt_read,
    n66.rtt_write as nip66_rtt_write,
    n11.name as nip11_name,
    n11.description as nip11_description,
    n11.pubkey as nip11_pubkey,
    n11.contact as nip11_contact,
    n11.supported_nips as nip11_supported_nips,
    n11.software as nip11_software,
    n11.version as nip11_version,
    n11.limitation as nip11_limitation,
    rm.nip11_id,
    rm.nip66_id
FROM relay_metadata rm
JOIN relays r ON rm.relay_url = r.url
LEFT JOIN nip11 n11 ON rm.nip11_id = n11.id
LEFT JOIN nip66 n66 ON rm.nip66_id = n66.id
ORDER BY rm.relay_url, rm.generated_at DESC;
```

#### Usage Examples

```sql
-- All online relays
SELECT relay_url, nip11_name, nip11_software
FROM relay_metadata_latest
WHERE nip66_openable = true;

-- Fastest relays by RTT
SELECT relay_url, nip66_rtt_open, nip11_name
FROM relay_metadata_latest
WHERE nip66_openable = true
ORDER BY nip66_rtt_open ASC
LIMIT 20;

-- Relays by software
SELECT nip11_software, COUNT(*) as count
FROM relay_metadata_latest
WHERE nip11_software IS NOT NULL
GROUP BY nip11_software
ORDER BY count DESC;

-- Writable relays
SELECT relay_url, nip11_name
FROM relay_metadata_latest
WHERE nip66_writable = true;
```

### events_statistics

Global event statistics with NIP-01 category breakdown.

```sql
SELECT * FROM events_statistics;
```

Returns:
| Column | Description |
|--------|-------------|
| `total_events` | Total event count |
| `unique_pubkeys` | Unique authors |
| `unique_kinds` | Unique event kinds |
| `regular_events` | Kind 1-9999 (excluding replaceable) |
| `replaceable_events` | Kind 10000-19999 |
| `ephemeral_events` | Kind 20000-29999 |
| `addressable_events` | Kind 30000-39999 |
| `events_last_hour` | Events in last hour |
| `events_last_24h` | Events in last 24 hours |
| `events_last_7d` | Events in last 7 days |
| `events_last_30d` | Events in last 30 days |

### relays_statistics

Per-relay statistics including event counts and RTT metrics.

```sql
SELECT * FROM relays_statistics ORDER BY event_count DESC LIMIT 20;
```

Returns:
| Column | Description |
|--------|-------------|
| `relay_url` | Relay URL |
| `network` | clearnet or tor |
| `event_count` | Events seen on this relay |
| `unique_pubkeys` | Unique authors on this relay |
| `avg_rtt_open` | Average connection latency |

### kind_counts_total

Event counts aggregated by kind.

```sql
SELECT * FROM kind_counts_total ORDER BY count DESC LIMIT 20;
```

Returns:
| Column | Description |
|--------|-------------|
| `kind` | Event kind number |
| `count` | Number of events |

### kind_counts_by_relay

Event counts by kind per relay.

```sql
SELECT * FROM kind_counts_by_relay
WHERE relay_url = 'wss://relay.damus.io'
ORDER BY count DESC;
```

### pubkey_counts_total

Event counts by public key.

```sql
SELECT * FROM pubkey_counts_total ORDER BY count DESC LIMIT 20;
```

### pubkey_counts_by_relay

Event counts by pubkey per relay.

```sql
SELECT * FROM pubkey_counts_by_relay
WHERE relay_url = 'wss://relay.damus.io'
ORDER BY count DESC
LIMIT 20;
```

## Stored Procedures

### insert_event

Atomically inserts an event with relay association.

```sql
CALL insert_event(
    p_id := decode('abc123...', 'hex'),
    p_pubkey := decode('def456...', 'hex'),
    p_created_at := 1704067200,
    p_kind := 1,
    p_tags := '[["p", "abc123"]]'::jsonb,
    p_content := 'Hello, Nostr!',
    p_sig := decode('sig789...', 'hex'),
    p_relay_url := 'wss://relay.damus.io',
    p_relay_network := 'clearnet',
    p_relay_inserted_at := 1704067200,
    p_seen_at := 1704067200
);
```

**Behavior**:
- Inserts event if not exists (idempotent)
- Inserts relay if not exists
- Creates event-relay association
- All in single transaction

### insert_relay

Idempotent relay insertion.

```sql
CALL insert_relay(
    p_url := 'wss://new-relay.example.com',
    p_network := 'clearnet',
    p_inserted_at := 1704067200
);
```

**Behavior**:
- Inserts relay if URL doesn't exist
- Does nothing if URL already exists

### insert_relay_metadata

Inserts metadata with automatic NIP-11/NIP-66 deduplication.

```sql
CALL insert_relay_metadata(
    p_relay_url := 'wss://relay.damus.io',
    p_relay_network := 'clearnet',
    p_relay_inserted_at := 1704067200,
    p_generated_at := 1704070800,
    -- NIP-66 fields
    p_openable := true,
    p_readable := true,
    p_writable := true,
    p_rtt_open := 142,
    p_rtt_read := 89,
    p_rtt_write := 234,
    -- NIP-11 fields
    p_name := 'Damus Relay',
    p_description := 'A relay for the Damus app',
    p_pubkey := 'abc123...',
    p_contact := 'admin@damus.io',
    p_supported_nips := '[1, 11, 66]'::jsonb,
    p_software := 'strfry',
    p_version := '0.9.0',
    p_limitation := '{}'::jsonb,
    p_privacy_policy := NULL,
    p_terms_of_service := NULL,
    p_banner := NULL,
    p_icon := NULL,
    p_extra_fields := '{}'::jsonb
);
```

**Behavior**:
1. Computes SHA-256 hash of NIP-11 content
2. Inserts to `nip11` if hash doesn't exist, else reuses ID
3. Computes SHA-256 hash of NIP-66 content
4. Inserts to `nip66` if hash doesn't exist, else reuses ID
5. Ensures relay exists
6. Inserts `relay_metadata` linking relay to NIP-11/NIP-66 by hash

### delete_orphan_events

Removes events without relay associations.

```sql
CALL delete_orphan_events();
```

**Behavior**:
- Deletes events not referenced in `events_relays`
- Returns count of deleted rows

### delete_orphan_nip11

Removes unreferenced NIP-11 records.

```sql
CALL delete_orphan_nip11();
```

**Behavior**:
- Deletes NIP-11 records not referenced in `relay_metadata`
- Returns count of deleted rows

### delete_orphan_nip66

Removes unreferenced NIP-66 records.

```sql
CALL delete_orphan_nip66();
```

**Behavior**:
- Deletes NIP-66 records not referenced in `relay_metadata`
- Returns count of deleted rows

## Helper Functions

### tags_to_tagvalues

Converts JSONB tags array to searchable text array.

```sql
CREATE FUNCTION tags_to_tagvalues(tags JSONB)
RETURNS TEXT[] AS $$
    SELECT ARRAY(
        SELECT tag->>0 || ':' || tag->>1
        FROM jsonb_array_elements(tags) AS tag
        WHERE jsonb_array_length(tag) >= 2
    );
$$ LANGUAGE SQL IMMUTABLE;
```

**Usage**:
```sql
-- Input: [["p", "abc123"], ["e", "def456"]]
-- Output: ["p:abc123", "e:def456"]

SELECT tags_to_tagvalues('[["p", "abc123"], ["e", "def456"]]'::jsonb);
```

This function powers the `tagvalues` generated column in the `events` table (BigBrotr only).

## Maintenance Queries

### Database Size

```sql
SELECT
    pg_size_pretty(pg_database_size('bigbrotr')) as total,
    pg_size_pretty(pg_total_relation_size('events')) as events,
    pg_size_pretty(pg_total_relation_size('events_relays')) as events_relays,
    pg_size_pretty(pg_total_relation_size('relays')) as relays;
```

### Table Row Counts

```sql
SELECT
    (SELECT COUNT(*) FROM events) as events,
    (SELECT COUNT(*) FROM events_relays) as events_relays,
    (SELECT COUNT(*) FROM relays) as relays,
    (SELECT COUNT(*) FROM relay_metadata) as relay_metadata,
    (SELECT COUNT(*) FROM nip11) as nip11,
    (SELECT COUNT(*) FROM nip66) as nip66;
```

### Index Usage

```sql
SELECT
    indexrelname as index,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Cleanup Orphans

```sql
-- Run periodically for maintenance
CALL delete_orphan_events();
CALL delete_orphan_nip11();
CALL delete_orphan_nip66();
```

## Next Steps

- Learn about [Configuration](/configuration/overview/)
- Check the [FAQ](/resources/faq/)
- Explore [Services](/services/initializer/)
