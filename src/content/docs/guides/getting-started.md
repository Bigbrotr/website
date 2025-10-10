---
title: Getting Started
description: A step-by-step guide to set up your Bigbrotr instance.
---

This guide helps you quickly set up the **Bigbrotr** instance using Docker Compose, including PostgreSQL, pgAdmin, and additional services.

## 1. Clone the Repository

Download the BigBrotr repository to your local machine:

```bash
git clone https://github.com/VincenzoImp/bigbrotr.git
cd bigbrotr
```

---

## 2. Create the `.env` File

Copy the example environment file:

```bash
cp env.example .env
```

🔧 *You can edit `.env` to customize credentials, ports, file paths, and service parameters as needed.*

### Explanation of `.env` File

The `.env` file contains environment variables to configure your Docker containers and Bigbrotr services. Here’s a breakdown:

```bash
# PostgreSQL and pgAdmin ports
DB_PORT=5432          # Exposes PostgreSQL database on this port
PGADMIN_PORT=8080     # Exposes pgAdmin web UI on this port

# Nostr keypair
SECRET_KEY=           # Your private key for signed requests
PUBLIC_KEY=           # Your public identity on Nostr

# PostgreSQL configuration
POSTGRES_USER=admin                 # Username for the database
POSTGRES_PASSWORD=admin             # Password for the database
POSTGRES_DB=bigbrotr                # Name of the database
POSTGRES_DB_DATA_PATH=./data        # Path to persist database data
POSTGRES_DB_INIT_PATH=./init.sql    # Path to initial SQL setup (optional)
POSTGRES_DB_DUMP_PATH=./dump        # Path for backup/exported dumps

# pgAdmin configuration
PGADMIN_DEFAULT_EMAIL=admin@admin.com      # Login email for pgAdmin
PGADMIN_DEFAULT_PASSWORD=admin             # Login password for pgAdmin

# Initializer
RELAYS_SEED_PATH=./seed/relays_seed.txt    # File containing the initial list of relays to monitor

# Finder service
FINDER_FREQUENCY_HOUR=8         # How often (in hours) to run the finder service
FINDER_REQUEST_TIMEOUT=20       # Timeout for requests made when discovering new relays

# Monitor service
MONITOR_FREQUENCY_HOUR=8        # How often to run the monitoring routine
MONITOR_NUM_CORES=8             # Number of CPU cores to use
MONITOR_CHUNK_SIZE=50           # Number of relays monitored per core
MONITOR_REQUESTS_PER_CORE=10    # Relay monitors made in parallel per core
MONITOR_REQUEST_TIMEOUT=20      # Timeout for each relay monitor

# Syncronizer service
SYNCRONIZER_NUM_CORES=8             # Number of CPU cores to use
SYNCRONIZER_CHUNK_SIZE=50           # Number of relays syncronized per core
SYNCRONIZER_REQUESTS_PER_CORE=10    # Relay syncronizations made in parallel per core
SYNCRONIZER_REQUEST_TIMEOUT=20      # Timeout for each relay syncronization
SYNCTONIZER_START_TIMESTAMP=0       # Start time for sync (0 = genesis)
SYNCRONIZER_STOP_TIMESTAMP=-1       # End time (-1 = now)
SYNCRONIZER_EVENT_FILTER={}         # Optional event filtering as JSON
```

---

## 3. Start the Containers

Launch the full stack using Docker Compose with your `.env` file:

```bash
docker compose up -d --build
```

✅ This will start:
- `database`: the PostgreSQL backend storing all Nostr events and metadata
- `pgadmin`: a GUI to inspect and manage the database
- `torproxy`: enables communication with .onion relays via Tor
- `initializer`: seeds the database with your initial relay list (runs once)
- `finder`: scans for new relays from events and external sources
- `monitor`: tests relay responsiveness and metadata compliance
- `syncronizer`: fetches events from known relays and archives them


👤 *Log into pgAdmin using the email and password from your `.env`.*

---

## 4. Stop the Containers

To stop all running containers:

```bash
docker compose down
```

---

### Docker Compose Overview

Here is the relevant `docker-compose.yml` snippet used:

```yaml
services:

  database:
    image: postgres:latest
    container_name: bigbrotr_database
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    ports:
      - ${DB_PORT}:5432
    volumes:
      - ${POSTGRES_DB_DATA_PATH}:/var/lib/postgresql/data
      - ${POSTGRES_DB_INIT_PATH}:/docker-entrypoint-initdb.d/init.sql
    networks:
      - network
    restart: unless-stopped

  pgadmin:
    image: dpage/pgadmin4
    container_name: bigbrotr_pgadmin
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}
    ports:
      - ${PGADMIN_PORT}:80
    networks:
      - network
    depends_on:
      - database
    restart: unless-stopped

  torproxy:
    image: dperson/torproxy
    container_name: bigbrotr_torproxy
    restart: unless-stopped
    networks:
      - network

  initializer:
    build:
      context: .
      dockerfile: dockerfiles/initializer
    container_name: bigbrotr_initializer
    environment:
      - POSTGRES_HOST=database
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_PORT=5432
      - RELAYS_SEED_PATH=relays_seed.txt
    volumes:
      - ${RELAYS_SEED_PATH}:/app/relays_seed.txt
    depends_on:
      - database
    networks:
      - network
    restart: no

  finder:
    build:
      context: .
      dockerfile: dockerfiles/finder
    container_name: bigbrotr_finder
    environment:
      - POSTGRES_HOST=database
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_PORT=5432
      - FINDER_FREQUENCY_HOUR=${FINDER_FREQUENCY_HOUR}
      - FINDER_REQUEST_TIMEOUT=${FINDER_REQUEST_TIMEOUT}
    depends_on:
      - database
    networks:
      - network
    restart: unless-stopped

  monitor:
    build:
      context: .
      dockerfile: dockerfiles/monitor
    container_name: bigbrotr_monitor
    environment:
      - POSTGRES_HOST=database
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_PORT=5432
      - TORPROXY_HOST=torproxy
      - TORPROXY_PORT=9050
      - MONITOR_FREQUENCY_HOUR=${MONITOR_FREQUENCY_HOUR}
      - MONITOR_NUM_CORES=${MONITOR_NUM_CORES}
      - MONITOR_CHUNK_SIZE=${MONITOR_CHUNK_SIZE}
      - MONITOR_REQUESTS_PER_CORE=${MONITOR_REQUESTS_PER_CORE}
      - MONITOR_REQUEST_TIMEOUT=${MONITOR_REQUEST_TIMEOUT}
      - SECRET_KEY=${SECRET_KEY}
      - PUBLIC_KEY=${PUBLIC_KEY}
    depends_on:
      - database
      - torproxy
    networks:
      - network
    restart: unless-stopped

  syncronizer:
    build:
      context: .
      dockerfile: dockerfiles/syncronizer
    container_name: bigbrotr_syncronizer
    environment:
      - POSTGRES_HOST=database
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_PORT=5432
      - TORPROXY_HOST=torproxy
      - TORPROXY_PORT=9050
      - SYNCRONIZER_NUM_CORES=${SYNCRONIZER_NUM_CORES}
      - SYNCRONIZER_CHUNK_SIZE=${SYNCRONIZER_CHUNK_SIZE}
      - SYNCRONIZER_REQUESTS_PER_CORE=${SYNCRONIZER_REQUESTS_PER_CORE}
      - SYNCRONIZER_REQUEST_TIMEOUT=${SYNCRONIZER_REQUEST_TIMEOUT}
      - SYNCTONIZER_START_TIMESTAMP=${SYNCTONIZER_START_TIMESTAMP}
      - SYNCRONIZER_STOP_TIMESTAMP=${SYNCRONIZER_STOP_TIMESTAMP}
      - SYNCRONIZER_EVENT_FILTER=${SYNCRONIZER_EVENT_FILTER}
    depends_on:
      - database
      - torproxy
    networks:
      - network
    restart: unless-stopped

networks:
  network:
    driver: bridge
```