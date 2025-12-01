---
title: FAQ
description: Frequently asked questions about BigBrotr
---

## General Questions

### What is BigBrotr?

BigBrotr is an enterprise-grade, modular system for archiving and monitoring the Nostr protocol ecosystem. It provides relay discovery, health monitoring (NIP-11/NIP-66), and event synchronization across both clearnet and Tor networks.

### What is Nostr?

[Nostr](https://nostr.com) (Notes and Other Stuff Transmitted by Relays) is a decentralized protocol for censorship-resistant global communication. It uses cryptographic keys for identity and relays for message distribution.

### Is BigBrotr free to use?

Yes! BigBrotr is open source under the MIT license. You can use, modify, and distribute it freely.

### What are the system requirements?

- **Python**: 3.9 or higher
- **PostgreSQL**: 16 or higher
- **Docker**: Latest version (for Docker deployment)
- **RAM**: 4GB minimum recommended
- **Disk**: 10GB+ for initial data, more for full archiving

---

## Deployment

### How do I deploy BigBrotr?

The easiest way is with Docker Compose:

```bash
git clone https://github.com/bigbrotr/bigbrotr.git
cd bigbrotr/implementations/bigbrotr
cp .env.example .env
nano .env  # Set DB_PASSWORD
docker-compose up -d
```

See the [Quick Start guide](/getting-started/quick-start/) for detailed instructions.

### What's the difference between BigBrotr and LilBrotr?

| Feature | BigBrotr | LilBrotr |
|---------|----------|----------|
| Event storage | Full (id, pubkey, created_at, kind, tags, content, sig) | Essential (id, pubkey, created_at, kind, sig) |
| Disk usage | ~100% | ~40% |
| Tor support | Enabled | Disabled |
| Use case | Complete archiving | Lightweight indexing |

Both index all events - LilBrotr simply omits the storage-heavy `tags` and `content` fields. See [Implementations](/getting-started/implementations/) for details.

### Can I run both implementations on the same machine?

Yes! They use different ports:
- BigBrotr: PostgreSQL 5432, PGBouncer 6432, Tor 9050
- LilBrotr: PostgreSQL 5433, PGBouncer 6433, Tor 9051

### How much disk space do I need?

It depends on your use case:
- **Lightweight indexing** (LilBrotr): 10-50GB
- **Full archiving** (BigBrotr): 100GB+ and growing

The Nostr network generates millions of events daily.

---

## Configuration

### Where is the database password stored?

The `DB_PASSWORD` is loaded from an environment variable for security. Never commit passwords to version control.

```bash
# .env file
DB_PASSWORD=your_secure_password
```

### How do I disable Tor support?

Set `tor.enabled: false` in the service configuration:

```yaml
# yaml/services/monitor.yaml
tor:
  enabled: false

# yaml/services/synchronizer.yaml
tor:
  enabled: false
```

### How do I sync only specific event kinds?

Configure the filter in `yaml/services/synchronizer.yaml`:

```yaml
filter:
  kinds: [0, 1, 3, 6, 7]  # Profile, notes, contacts, reposts, reactions
```

### How do I add custom relay sources to Finder?

Edit `yaml/services/finder.yaml`:

```yaml
api:
  sources:
    - url: https://api.nostr.watch/v1/online
      enabled: true
    - url: https://my-relay-list.example.com/api/relays
      enabled: true
      timeout: 60.0
```

The API must return a JSON array of WebSocket URLs.

---

## Troubleshooting

### "Connection refused" error

**Cause**: Database not reachable or wrong host configuration.

**Solutions**:
1. Check if PostgreSQL/PGBouncer is running: `docker-compose ps`
2. Verify `host` in `yaml/core/brotr.yaml`:
   - Docker: use service name (`pgbouncer`)
   - Local: use `localhost`

### "Pool exhausted" error

**Cause**: All database connections are busy.

**Solutions**:
1. Increase pool size in `yaml/core/brotr.yaml`:
   ```yaml
   pool:
     limits:
       max_size: 50
   ```
2. Reduce concurrent operations

### Services not starting

**Cause**: Initializer hasn't completed yet.

**Solution**: Check initializer logs and wait for completion:
```bash
docker-compose logs -f initializer
```

### Tor relays not being monitored

**Cause**: Tor proxy not running or misconfigured.

**Solutions**:
1. Check Tor is running: `docker-compose ps tor`
2. Verify Tor configuration in service YAML
3. Check Tor logs: `docker-compose logs tor`

### High CPU/memory usage

**Cause**: Too many concurrent operations.

**Solutions**:
1. Reduce Synchronizer concurrency:
   ```yaml
   concurrency:
     max_parallel: 5
     max_processes: 2
   ```
2. Reduce Monitor concurrency:
   ```yaml
   concurrency:
     max_parallel: 20
   ```

### Database growing too fast

**Solutions**:
1. Use LilBrotr (doesn't store tags/content)
2. Filter event kinds:
   ```yaml
   filter:
     kinds: [0, 3, 10002]  # Only metadata
   ```
3. Run cleanup procedures periodically:
   ```sql
   CALL delete_orphan_events();
   ```

---

## Database

### How do I access the database?

```bash
# Docker
docker-compose exec postgres psql -U admin -d bigbrotr

# Local (via PGBouncer)
psql -h localhost -p 6432 -U admin -d bigbrotr
```

### How do I backup the database?

```bash
docker-compose exec postgres pg_dump -U admin bigbrotr > backup.sql
```

### How do I restore a backup?

```bash
docker-compose exec -T postgres psql -U admin -d bigbrotr < backup.sql
```

### Why are event IDs stored as BYTEA?

BYTEA (binary) storage uses 32 bytes instead of 64 bytes for hex strings, providing **50% space savings** for event IDs and signatures.

### What's the `tagvalues` column?

It's a generated column that extracts searchable values from the `tags` JSONB:

```sql
-- Tags: [["p", "abc123"], ["e", "def456"]]
-- tagvalues: ["p:abc123", "e:def456"]

-- Search by tag
SELECT * FROM events WHERE tagvalues @> ARRAY['p:abc123...'];
```

---

## Services

### What does each service do?

| Service | Purpose | Runs |
|---------|---------|------|
| **Initializer** | Database bootstrap | Once |
| **Finder** | Discover new relays | Continuously |
| **Monitor** | Check relay health | Continuously |
| **Synchronizer** | Collect events | Continuously |

### How often do services run?

Default intervals:
- **Finder**: Every 1 hour
- **Monitor**: Every 1 hour
- **Synchronizer**: Every 15 minutes

Configurable via `interval` in each service's YAML.

### Can I run services manually?

Yes:

```bash
cd implementations/bigbrotr
python -m services initializer
python -m services finder --log-level DEBUG
```

### What is the time-window stack algorithm?

The Synchronizer's algorithm for handling large event volumes:
1. Request events in a time window
2. If response hits limit, split window in half
3. Process each half recursively
4. Ensures all events are collected

---

## Development

### How do I run tests?

```bash
pytest tests/unit/ -v
pytest tests/unit/ --cov=src --cov-report=html
```

### How do I run code quality checks?

```bash
ruff check src/ tests/          # Lint
ruff format src/ tests/         # Format
mypy src/                       # Type check
pre-commit run --all-files      # All hooks
```

### How do I add a new service?

1. Create `src/services/myservice.py` with config and service classes
2. Add YAML config in `yaml/services/myservice.yaml`
3. Register in `src/services/__main__.py`
4. Export from `src/services/__init__.py`
5. Write tests in `tests/unit/test_myservice.py`

See [Architecture - Service Layer](/architecture/service-layer/) for details.

### How do I create a custom implementation?

```bash
cp -r implementations/bigbrotr implementations/myimpl
# Edit yaml/, postgres/init/, docker-compose.yaml
```

See [Implementations](/getting-started/implementations/) for details.

---

## More Help

- **GitHub Issues**: [Report bugs](https://github.com/bigbrotr/bigbrotr/issues)
- **Documentation**: Browse this site
- **Source Code**: [GitHub Repository](https://github.com/bigbrotr/bigbrotr)
