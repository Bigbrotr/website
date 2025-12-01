---
title: Configuration Overview
description: Understanding BigBrotr's YAML-driven configuration system
---

BigBrotr uses a YAML-driven configuration system with Pydantic validation. This approach provides type safety, clear documentation, and flexibility for different deployment scenarios.

## Configuration Philosophy

1. **YAML for Structure**: All non-sensitive configuration in YAML files
2. **Environment for Secrets**: Only passwords and keys from environment variables
3. **Defaults are Safe**: Sensible defaults for all optional settings
4. **Validation at Startup**: Configuration errors fail fast with clear messages

## File Structure

```
implementations/bigbrotr/yaml/
├── core/
│   └── brotr.yaml              # Database pool and connection settings
└── services/
    ├── initializer.yaml        # Schema verification, seed file path
    ├── finder.yaml             # API sources, discovery intervals
    ├── monitor.yaml            # Health check settings, Tor config
    └── synchronizer.yaml       # Sync filters, timeouts, concurrency
```

## Environment Variables

Only sensitive data comes from environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | **Yes** | PostgreSQL database password |
| `MONITOR_PRIVATE_KEY` | No | Nostr private key for NIP-66 write tests (hex) |

### Setting Environment Variables

**Docker Compose** (recommended):
```bash
cp .env.example .env
nano .env  # Edit DB_PASSWORD
```

`.env` file:
```bash
DB_PASSWORD=your_secure_password
MONITOR_PRIVATE_KEY=your_hex_private_key  # Optional
```

**Shell Export**:
```bash
export DB_PASSWORD=your_secure_password
```

**Systemd Service**:
```ini
[Service]
Environment="DB_PASSWORD=your_secure_password"
```

## Loading Configuration

Services load configuration via factory methods:

```python
# From YAML file (recommended)
service = MyService.from_yaml("yaml/services/myservice.yaml", brotr=brotr)

# From dictionary
config_dict = {"interval": 1800.0, "tor": {"enabled": False}}
service = MyService.from_dict(config_dict, brotr=brotr)

# Direct construction
service = MyService(brotr=brotr, config=MyServiceConfig(interval=1800.0))
```

## Pydantic Validation

All configuration uses Pydantic models with built-in validation:

```python
from pydantic import BaseModel, Field

class TimeoutsConfig(BaseModel):
    clearnet: float = Field(default=30.0, ge=5.0, le=120.0)
    tor: float = Field(default=60.0, ge=10.0, le=180.0)
```

### Validation Ranges

| Config Type | Field | Default | Range |
|-------------|-------|---------|-------|
| Pool | `min_size` | 5 | 1-100 |
| Pool | `max_size` | 20 | 1-100 |
| Timeouts | `clearnet` | 30.0 | 5.0-120.0 |
| Timeouts | `tor` | 60.0 | 10.0-180.0 |
| Concurrency | `max_parallel` | 10-50 | 1-500 |
| Concurrency | `max_processes` | 10 | 1-32 |
| Intervals | `interval` | varies | ≥60.0 |

### Validation Errors

Invalid configuration fails at startup with clear messages:

```
pydantic_core._pydantic_core.ValidationError: 1 validation error for TimeoutsConfig
clearnet
  Input should be greater than or equal to 5 [type=greater_than_equal, input_value=2.0, input_type=float]
```

## Configuration Hierarchy

Configuration is loaded in this order:

1. **Pydantic Defaults**: Built-in defaults in model definition
2. **YAML File**: Values from configuration file
3. **Environment Variables**: Override for secrets only

## Cross-Field Validation

Some configurations have cross-field validation:

```python
class PoolLimitsConfig(BaseModel):
    min_size: int = Field(default=5, ge=1, le=100)
    max_size: int = Field(default=20, ge=1, le=100)

    @model_validator(mode='after')
    def validate_sizes(self) -> Self:
        if self.max_size < self.min_size:
            raise ValueError("max_size must be >= min_size")
        return self
```

## Testing Configuration

Validate configuration before deployment:

```python
from services.synchronizer import SynchronizerConfig
import yaml

with open("yaml/services/synchronizer.yaml") as f:
    config_dict = yaml.safe_load(f)

# Raises ValidationError if invalid
config = SynchronizerConfig(**config_dict)
print(f"Config valid: {config}")
```

## Common Customizations

### Disable Tor

```yaml
# yaml/services/monitor.yaml
tor:
  enabled: false

# yaml/services/synchronizer.yaml
tor:
  enabled: false
```

### Lower Resource Usage

```yaml
# yaml/core/brotr.yaml
pool:
  limits:
    min_size: 2
    max_size: 5

# yaml/services/synchronizer.yaml
concurrency:
  max_parallel: 3
  max_processes: 2
```

### Increase Timeouts

```yaml
timeouts:
  clearnet: 60.0
  tor: 120.0
```

### Filter Event Kinds

```yaml
# yaml/services/synchronizer.yaml
filter:
  kinds: [0, 1, 3, 6, 7]  # Only specific kinds
```

## Best Practices

1. **Start with Defaults**: Only override what you need
2. **Use Per-Relay Overrides**: For problematic relays, not global changes
3. **Secure Secrets**: Never commit `.env` files to version control
4. **Test Changes**: Validate YAML before deployment
5. **Monitor Resources**: Adjust pool sizes based on actual usage

## Next Steps

- Learn about [Core Configuration](/configuration/core/)
- Explore [Service Configuration](/configuration/services/)
- Check the [FAQ](/resources/faq/)
