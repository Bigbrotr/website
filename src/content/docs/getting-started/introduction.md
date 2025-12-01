---
title: Introduction
description: Learn what BigBrotr is and why it exists
---

BigBrotr is an enterprise-grade, modular system for archiving and monitoring the Nostr protocol ecosystem. It provides comprehensive tools for relay discovery, health monitoring, and event synchronization across both clearnet and Tor networks.

## Why BigBrotr?

Nostr's decentralized nature eliminates any central authority, granting unprecedented freedom but also creating challenges around network visibility, coordination, and data integrity. BigBrotr addresses these challenges by serving as a comprehensive, transparent archive of the entire Nostr ecosystem.

### Use Cases

- **Relay Operators**: Monitor relay health, track performance metrics, and understand network behavior
- **Researchers**: Analyze Nostr adoption patterns, study relay distribution, and measure network growth
- **Developers**: Build applications on top of comprehensive Nostr data with ready-to-query analytics
- **Archive Operators**: Preserve historical Nostr events before they disappear from relays

## Core Capabilities

### Relay Discovery
BigBrotr automatically discovers Nostr relays from:
- Public APIs like nostr.watch
- Seed lists containing 8,865+ known relay URLs
- Network detection for both clearnet and `.onion` addresses

### Health Monitoring
Continuous monitoring of relay capabilities:
- **NIP-11**: Relay information documents with metadata
- **NIP-66**: Capability testing (openable, readable, writable)
- **RTT Measurement**: Round-trip time tracking for performance analysis

### Event Synchronization
High-performance event collection:
- **Multicore Processing**: Parallel relay synchronization with up to 32 worker processes
- **Incremental Sync**: Per-relay timestamp tracking for efficient updates
- **Time-Window Stack Algorithm**: Handles large event volumes efficiently

### Data Storage
Efficient PostgreSQL-based storage:
- **BYTEA Storage**: 50% space savings for event IDs compared to hex strings
- **Content Deduplication**: Hash-based NIP-11/NIP-66 storage
- **Pre-built Views**: Ready-to-query statistics and analytics

## Design Philosophy

BigBrotr follows key design principles that make it production-ready:

| Principle | Implementation |
|-----------|----------------|
| **Three-Layer Architecture** | Core (reusable) → Services (modular) → Implementation (config-driven) |
| **Dependency Injection** | Services receive database interface via constructor for testability |
| **Configuration-Driven** | YAML configuration with Pydantic validation, minimal hardcoding |
| **Type Safety** | Full type hints with strict mypy checking throughout codebase |
| **Async-First** | Built on asyncio, asyncpg, and aiohttp for maximum concurrency |

## Version 2.0.0

The current release (v2.0.0) represents a complete rewrite with:

- Three-layer modular architecture
- Full async database operations with asyncpg
- PGBouncer integration for connection pooling
- State persistence for fault tolerance
- 174 unit tests with comprehensive coverage
- Docker Compose deployment ready

## Next Steps

Ready to get started? Follow the [Quick Start guide](/getting-started/quick-start/) to deploy your own BigBrotr instance in minutes.

Want to understand the architecture first? Check out the [Architecture Overview](/architecture/overview/).
