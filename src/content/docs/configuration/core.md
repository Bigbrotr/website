---
title: Core Configuration
description: Database pool and connection settings
---

Core configuration (`yaml/core/brotr.yaml`) controls database connections, pooling, and timeouts used by all services.

## Full Configuration

```yaml
# yaml/core/brotr.yaml

# Connection pool configuration
pool:
  # Database connection parameters
  database:
    host: pgbouncer              # Database host (Docker service name)
    port: 5432                   # Database port
    database: bigbrotr           # Database name
    user: admin                  # Database user
    # password: loaded from DB_PASSWORD environment variable

  # Connection pool size limits
  limits:
    min_size: 5                  # Minimum connections in pool
    max_size: 20                 # Maximum connections in pool
    max_queries: 50000           # Queries per connection before recycling
    max_inactive_connection_lifetime: 300.0  # Idle timeout (seconds)

  # Pool-level timeouts
  timeouts:
    acquisition: 10.0            # Timeout for getting connection (seconds)
    health_check: 5.0            # Timeout for health check (seconds)

  # Connection retry logic
  retry:
    max_attempts: 3              # Maximum retry attempts
    initial_delay: 1.0           # Initial delay between retries (seconds)
    max_delay: 10.0              # Maximum delay between retries (seconds)
    exponential_backoff: true    # Use exponential backoff

  # PostgreSQL server settings
  server_settings:
    application_name: bigbrotr   # Application name in pg_stat_activity
    timezone: UTC                # Session timezone

# Batch operation settings
batch:
  max_batch_size: 1000           # Maximum items per batch operation

# Query timeouts
timeouts:
  query: 60.0                    # Standard query timeout (seconds)
  procedure: 90.0                # Stored procedure timeout (seconds)
  batch: 120.0                   # Batch operation timeout (seconds)
```

## Database Configuration

### Connection Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `host` | string | `localhost` | Database hostname or Docker service name |
| `port` | int | `5432` | Database port (1-65535) |
| `database` | string | `database` | Database name |
| `user` | string | `admin` | Database username |

**Password**: Always loaded from `DB_PASSWORD` environment variable for security.

### Docker vs Local

**Docker Compose** (use service names):
```yaml
database:
  host: pgbouncer  # Docker service name
  port: 5432
```

**Local Development** (use localhost):
```yaml
database:
  host: localhost
  port: 6432  # PGBouncer port
```

## Pool Limits

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `min_size` | int | 5 | 1-100 | Minimum connections maintained |
| `max_size` | int | 20 | 1-100 | Maximum connections allowed |
| `max_queries` | int | 50000 | 1-1000000 | Queries before connection recycle |
| `max_inactive_connection_lifetime` | float | 300.0 | 0-3600 | Idle connection timeout |

### Tuning Guidelines

**Low Traffic / Development**:
```yaml
limits:
  min_size: 2
  max_size: 5
```

**High Traffic / Production**:
```yaml
limits:
  min_size: 10
  max_size: 50
```

### Cross-Validation

`max_size` must be ≥ `min_size`:
```yaml
# Valid
limits:
  min_size: 5
  max_size: 20

# Invalid - will fail validation
limits:
  min_size: 20
  max_size: 5
```

## Pool Timeouts

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `acquisition` | float | 10.0 | Time to wait for available connection |
| `health_check` | float | 5.0 | Timeout for connection health check |

### Pool Exhaustion

If all connections are busy and `acquisition` timeout is exceeded:
```
asyncpg.exceptions.PoolAcquisitionTimeoutError: timeout acquiring connection
```

**Solutions**:
1. Increase `max_size`
2. Increase `acquisition` timeout
3. Reduce concurrent operations

## Retry Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_attempts` | int | 3 | Maximum connection retry attempts |
| `initial_delay` | float | 1.0 | First retry delay (seconds) |
| `max_delay` | float | 10.0 | Maximum retry delay (seconds) |
| `exponential_backoff` | bool | true | Use exponential backoff |

### Backoff Calculation

With exponential backoff enabled:
- Attempt 1: immediate
- Attempt 2: 1.0s delay
- Attempt 3: 2.0s delay
- Attempt 4: 4.0s delay (capped at max_delay)

### Disable Retries

For development or debugging:
```yaml
retry:
  max_attempts: 1
  exponential_backoff: false
```

## Server Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `application_name` | string | `bigbrotr` | Name shown in `pg_stat_activity` |
| `timezone` | string | `UTC` | Session timezone |

### Monitoring Connections

```sql
SELECT application_name, state, query
FROM pg_stat_activity
WHERE application_name = 'bigbrotr';
```

## Batch Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_batch_size` | int | 1000 | Maximum items per batch insert |

Large datasets are automatically split:
```python
# 5000 events with max_batch_size=1000
# Results in 5 batch inserts of 1000 each
await brotr.insert_events(events)  # 5000 events
```

## Query Timeouts

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | float | 60.0 | Standard SELECT/INSERT timeout |
| `procedure` | float | 90.0 | Stored procedure timeout |
| `batch` | float | 120.0 | Batch operation timeout |

### Timeout Errors

```
asyncpg.exceptions.QueryCancelledError: canceling statement due to statement timeout
```

**Solutions**:
1. Increase relevant timeout
2. Optimize query
3. Add indexes

## Example Configurations

### Development

```yaml
pool:
  database:
    host: localhost
    port: 5432
  limits:
    min_size: 2
    max_size: 5
  retry:
    max_attempts: 1

timeouts:
  query: 30.0
```

### Production

```yaml
pool:
  database:
    host: pgbouncer
    port: 5432
  limits:
    min_size: 10
    max_size: 50
  retry:
    max_attempts: 5
    exponential_backoff: true

timeouts:
  query: 60.0
  procedure: 120.0
  batch: 180.0
```

### High-Volume Archiving

```yaml
pool:
  limits:
    min_size: 20
    max_size: 100
    max_queries: 100000

batch:
  max_batch_size: 5000

timeouts:
  batch: 300.0
```

## Troubleshooting

### "Connection refused"

Check `host` matches your environment:
- Docker: use service name (`postgres`, `pgbouncer`)
- Local: use `localhost`

### "Pool exhausted"

```yaml
pool:
  limits:
    max_size: 50  # Increase
  timeouts:
    acquisition: 30.0  # Increase wait time
```

### "Statement timeout"

```yaml
timeouts:
  query: 120.0  # Increase
  procedure: 180.0
```

## Next Steps

- Learn about [Service Configuration](/configuration/services/)
- Explore the [Database Schema](/database/schema/)
- Check the [FAQ](/resources/faq/)
