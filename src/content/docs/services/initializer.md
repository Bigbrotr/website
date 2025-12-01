---
title: Initializer Service
description: Database bootstrap and schema verification
---

The Initializer service is responsible for preparing the database before other services can run. It verifies the schema, ensures all required components exist, and seeds the database with initial relay URLs.

## Overview

| Property | Value |
|----------|-------|
| **Service Name** | `initializer` |
| **Lifecycle** | One-shot (runs once, then exits) |
| **Dependencies** | PostgreSQL database |
| **Configuration** | `yaml/services/initializer.yaml` |

## Operations

The Initializer performs these operations in sequence:

### 1. Verify Extensions

Checks that required PostgreSQL extensions are installed:

- `pgcrypto` - For cryptographic hash functions
- `btree_gin` - For GIN index support

```sql
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
```

### 2. Verify Tables

Confirms all expected tables exist:

- `relays` - Registry of known relay URLs
- `events` - Nostr events
- `events_relays` - Event-relay junction table
- `nip11` - Deduplicated NIP-11 documents
- `nip66` - Deduplicated NIP-66 test results
- `relay_metadata` - Time-series metadata snapshots
- `service_state` - Service state persistence

### 3. Verify Procedures

Confirms all stored procedures exist:

- `insert_event` - Atomic event insertion
- `insert_relay` - Idempotent relay insertion
- `insert_relay_metadata` - Metadata with deduplication
- `delete_orphan_events` - Cleanup orphaned events
- `delete_orphan_nip11` - Cleanup orphaned NIP-11
- `delete_orphan_nip66` - Cleanup orphaned NIP-66

### 4. Verify Views

Confirms analytics views exist:

- `relay_metadata_latest` - Latest metadata per relay

### 5. Seed Relays

Loads initial relay URLs from the seed file:

```bash
# Default: data/seed_relays.txt
# Contains 8,865 relay URLs
wss://relay.damus.io
wss://relay.nostr.band
wss://nos.lol
...
```

## Configuration

```yaml
# yaml/services/initializer.yaml

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

## Usage

### Docker Compose

The Initializer runs automatically on deployment:

```yaml
# docker-compose.yaml
initializer:
  command: ["python", "-m", "services", "initializer"]
  restart: no  # One-shot, doesn't restart
  depends_on:
    pgbouncer:
      condition: service_healthy
```

### Manual Run

```bash
cd implementations/bigbrotr
python -m services initializer
```

### With Custom Config

```bash
python -m services initializer --config yaml/services/initializer.yaml
```

## Output

Successful initialization produces output like:

```
INFO initializer: verification_started
INFO initializer: extensions_verified count=2
INFO initializer: tables_verified count=7
INFO initializer: procedures_verified count=6
INFO initializer: views_verified count=1
INFO initializer: schema_verified extensions=2 tables=7 procedures=6 views=1
INFO initializer: seeding_started file=data/seed_relays.txt
INFO initializer: relays_seeded count=8865
INFO initializer: initialization_complete duration=2.34
```

## Error Handling

### Missing Extension

```
ERROR initializer: extension_missing name=pgcrypto
```

**Solution**: Install the extension in PostgreSQL:
```sql
CREATE EXTENSION pgcrypto;
```

### Missing Table

```
ERROR initializer: table_missing name=events
```

**Solution**: Run the SQL schema files in `postgres/init/` in order.

### Seed File Not Found

```
ERROR initializer: seed_file_not_found path=data/seed_relays.txt
```

**Solution**: Verify the seed file path in configuration and that the file exists.

## Seed File Format

The seed file is a plain text file with one relay URL per line:

```
wss://relay.damus.io
wss://relay.nostr.band
wss://nos.lol
wss://relay.snort.social
# Comments are supported
wss://nostr.wine
```

- One URL per line
- Lines starting with `#` are ignored
- Empty lines are ignored
- URLs must be valid WebSocket URLs (`wss://` or `ws://`)

## Customizing Seeds

To use custom seed relays:

1. Create your seed file:
```bash
cat > data/my_relays.txt << EOF
wss://my-relay.example.com
wss://another-relay.example.com
EOF
```

2. Update configuration:
```yaml
seed:
  enabled: true
  file_path: data/my_relays.txt
```

3. Run initializer:
```bash
python -m services initializer
```

## Integration with Docker

In Docker Compose, the Initializer typically:

1. Waits for PostgreSQL to be healthy
2. Runs schema verification
3. Seeds the database
4. Exits with code 0 (success)

Other services wait for Initializer to complete:

```yaml
finder:
  depends_on:
    initializer:
      condition: service_completed_successfully
```

## Next Steps

- Learn about [Finder Service](/services/finder/)
- Explore the [Database Schema](/database/schema/)
- Understand [Configuration](/configuration/services/)
