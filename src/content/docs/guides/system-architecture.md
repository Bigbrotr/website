---
title: System Architecture
description: An in-depth look into Bigbrotr’s modular infrastructure and its core components
---

Bigbrotr is a modular and scalable infrastructure designed to efficiently and resiliently archive and monitor the entire [Nostr](https://nostr.com/) network. Each component runs in a dedicated Docker container, communicating and coordinating through a centralized PostgreSQL database.

This architecture ensures transparency, reliability, and extensibility — essential to support a decentralized ecosystem that is constantly evolving.

---

## 🔧 Main Components

Bigbrotr is composed of several containerized modules, each responsible for a specific task. They are interconnected through a PostgreSQL database and designed for independent deployment and horizontal scaling.

### 1. `database`
The core of the infrastructure: a PostgreSQL instance optimized to handle complex and high-volume data workloads.

- **Image**: `postgres:latest`
- **Exposed Ports**: `${DB_PORT}:5432`
- **Volumes**:
  - `${POSTGRES_DB_DATA_PATH}` → persistent data storage
  - `${POSTGRES_DB_INIT_PATH}` → initialization SQL scripts
- **Environment Variables**:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **Primary Tables**:
  - `events`, `events_relays`, `relays`, `relay_metadata`
- **Network**: `network`
- **Restart Policy**: `unless-stopped`

### 2. `pgadmin`
Web-based GUI for managing and visualizing the PostgreSQL database.

- **Image**: `dpage/pgadmin4`
- **Exposed Ports**: `${PGADMIN_PORT}:80`
- **Depends On**: `database`
- **Environment Variables**:
  - `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`
- **Network**: `network`
- **Restart Policy**: `unless-stopped`

### 3. `torproxy`
SOCKS5 proxy service that enables access to `.onion` relays over the Tor network.

- **Image**: [`dperson/torproxy`](https://hub.docker.com/r/dperson/torproxy/)
- **Internal Ports**: 9050 (SOCKS5)
- **Network**: `network`
- **Restart Policy**: `unless-stopped`

### 4. `initializer`
One-time initialization component responsible for seeding the database with a predefined list of relays at startup.

- **Dockerfile**: `dockerfiles/initializer`
- **Execution**: Runs once on container start (non-restarting)
- **Volume**:
  - `${RELAYS_SEED_PATH}:/app/relays_seed.txt`
- **Environment Variables**:
  - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
  - `RELAYS_SEED_PATH`
- **Depends On**: `database`
- **Network**: `network`
- **Restart Policy**: `no`

### 5. `finder`
Module responsible for dynamic and continuous discovery of new relays.

- **Dockerfile**: `dockerfiles/finder`
- **Functionality**:
  - Parses events and external sources (e.g. Nostr.Watch) for `wss://` URLs
  - Automatically updates the relay index
  - Helps expand network awareness and reduce centralization
- **Environment Variables** (planned):
  - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- **Depends On**: `database`
- **Network**: `network`
- **Restart Policy**: `unless-stopped`

### 6. `monitor`
Active monitoring system that evaluates the health and performance of each relay on a daily basis.

- **Dockerfile**: `dockerfiles/monitor`
- **Functionality**:
  - Pings and performs open/read/write tests
  - Collects NIP-11 metadata including RTT, NIP-66 support, privacy policies
- **Environment Variables**:
  - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
  - `TORPROXY_HOST`, `TORPROXY_PORT`
  - `MONITOR_FREQUENCY_HOUR`, `MONITOR_NUM_CORES`, `MONITOR_CHUNK_SIZE`
  - `MONITOR_REQUESTS_PER_CORE`, `MONITOR_REQUEST_TIMEOUT`
  - `SECRET_KEY`, `PUBLIC_KEY`
- **Depends On**: `database`, `torproxy`
- **Network**: `network`
- **Restart Policy**: `unless-stopped`

### 7. `synchronizer`
Synchronization component that ensures the event archive is complete and up to date.

- **Dockerfile**: `dockerfiles/syncronizer`
- **Functionality**:
  - Downloads and indexes new events from all active relays
  - Uses a divide-and-conquer strategy to manage fragmentation and delay
  - Balances request load to maintain performance and ordering
- **Environment Variables**:
  - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
  - `TORPROXY_HOST`, `TORPROXY_PORT`
  - `SYNCRONIZER_NUM_CORES`, `SYNCRONIZER_CHUNK_SIZE`
  - `SYNCRONIZER_REQUESTS_PER_CORE`, `SYNCRONIZER_REQUEST_TIMEOUT`
- **Depends On**: `database`, `torproxy`
- **Network**: `network`
- **Restart Policy**: `unless-stopped`

---

## 🧠 Design Principles

- **Resilience**: Incremental sync and recovery mechanisms ensure data completeness even in case of outages or unreachable relays.
- **Scalability**: The containerized architecture supports horizontal scaling and independent updates.
- **Extensibility**: Built to integrate public APIs, bots, dashboards, and alerting services.
- **Research-Oriented**: Structured data enables studies on network behavior, spam detection, social graphs, and Nostr protocol evolution.

By adhering to these principles, Bigbrotr offers a transparent and robust infrastructure for Nostr ecosystem monitoring, archival integrity, and decentralized research.

