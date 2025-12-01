---
title: Quick Start
description: Deploy BigBrotr in minutes with Docker Compose
---

This guide walks you through deploying BigBrotr using Docker Compose. You'll have a fully functional Nostr archiving system running in minutes.

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Git** for cloning the repository
- At least **4GB RAM** recommended
- **10GB+ disk space** for initial data

## Step 1: Clone the Repository

```bash
git clone https://github.com/bigbrotr/bigbrotr.git
cd bigbrotr
```

## Step 2: Configure Environment

Navigate to the BigBrotr implementation and create your environment file:

```bash
cd implementations/bigbrotr
cp .env.example .env
```

Edit the `.env` file to set your database password:

```bash
# Required: Set a secure password
DB_PASSWORD=your_secure_password_here

# Optional: For NIP-66 write tests
MONITOR_PRIVATE_KEY=your_hex_private_key
```

:::caution
Always use a strong, unique password for `DB_PASSWORD` in production environments.
:::

## Step 3: Start Services

Launch all services with Docker Compose:

```bash
docker-compose up -d
```

This starts the following services:

| Service | Description | Port |
|---------|-------------|------|
| **postgres** | PostgreSQL 16 database | 5432 |
| **pgbouncer** | Connection pooling | 6432 |
| **tor** | SOCKS5 proxy for .onion relays | 9050 |
| **initializer** | Database bootstrap (one-shot) | - |
| **finder** | Relay discovery | - |
| **monitor** | Health monitoring | - |
| **synchronizer** | Event collection | - |

## Step 4: Verify Deployment

Watch the initializer complete:

```bash
docker-compose logs -f initializer
```

You should see output indicating successful schema verification and relay seeding:

```
INFO initializer: schema_verified extensions=2 tables=7 procedures=6 views=1
INFO initializer: relays_seeded count=8865
INFO initializer: initialization_complete
```

Check all services are running:

```bash
docker-compose ps
```

## Step 5: Access the Database

Connect to PostgreSQL to verify data:

```bash
docker-compose exec postgres psql -U admin -d bigbrotr
```

Check relay count:

```sql
SELECT COUNT(*) FROM relays;
-- Expected: ~8865 initially

SELECT network, COUNT(*) FROM relays GROUP BY network;
-- Shows clearnet vs tor distribution
```

Check latest relay metadata:

```sql
SELECT relay_url, nip66_openable, nip66_readable
FROM relay_metadata_latest
WHERE nip66_openable = true
LIMIT 10;
```

## What Happens Next?

After initialization, the services operate continuously:

1. **Finder** discovers new relays every hour from nostr.watch APIs
2. **Monitor** checks relay health every hour (NIP-11/NIP-66)
3. **Synchronizer** collects events every 15 minutes from readable relays

## Common Operations

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f synchronizer
```

### Stop Services

```bash
docker-compose down
```

### Reset Everything

:::danger
This permanently deletes all data!
:::

```bash
docker-compose down
rm -rf data/postgres
docker-compose up -d
```

### Restart a Service

```bash
docker-compose restart monitor
```

## Using LilBrotr (Lightweight)

For a lightweight deployment that indexes events without storing tags and content (~60% disk savings):

```bash
cd implementations/lilbrotr
cp .env.example .env
nano .env  # Set DB_PASSWORD
docker-compose up -d
```

LilBrotr uses different ports to avoid conflicts:
- PostgreSQL: 5433
- PGBouncer: 6433
- Tor: 9051

See [Implementations](/getting-started/implementations/) for detailed comparison.

## Manual Deployment (Without Docker)

For development or custom deployments:

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment
export DB_PASSWORD=your_secure_password

# Run services (from implementations/bigbrotr/)
cd implementations/bigbrotr
python -m services initializer
python -m services finder &
python -m services monitor &
python -m services synchronizer &
```

## Next Steps

- Learn about the [Architecture](/architecture/overview/)
- Explore individual [Services](/services/initializer/)
- Understand the [Database Schema](/database/schema/)
- Customize [Configuration](/configuration/overview/)
