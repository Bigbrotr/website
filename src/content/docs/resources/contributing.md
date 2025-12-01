---
title: Contributing
description: How to contribute to BigBrotr
---

Thank you for your interest in contributing to BigBrotr! This guide will help you get started.

## Ways to Contribute

- **Bug Reports**: Found a bug? Open an issue on GitHub
- **Feature Requests**: Have an idea? Start a discussion
- **Code Contributions**: Fix bugs or add features
- **Documentation**: Improve docs, fix typos, add examples
- **Testing**: Write tests or report test failures

## Development Setup

### Prerequisites

- Python 3.9 or higher
- Docker and Docker Compose
- Git

### Setup Steps

```bash
# Clone repository
git clone https://github.com/bigbrotr/bigbrotr.git
cd bigbrotr

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or: .venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install

# Verify installation
python -c "from core import Pool, Brotr, BaseService, Logger; print('OK')"
```

### Running Tests

```bash
# All unit tests
pytest tests/unit/ -v

# With coverage
pytest tests/unit/ --cov=src --cov-report=html

# Specific test file
pytest tests/unit/test_synchronizer.py -v

# Pattern matching
pytest -k "health_check" -v
```

### Code Quality

```bash
# Linting
ruff check src/ tests/

# Formatting
ruff format src/ tests/

# Type checking
mypy src/

# All pre-commit hooks
pre-commit run --all-files
```

## Git Workflow

### Branches

- **main**: Stable releases
- **develop**: Active development
- **feature/\***: New features
- **fix/\***: Bug fixes
- **docs/\***: Documentation updates

### Creating a Feature Branch

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-feature
```

### Commit Messages

We use conventional commits:

```
feat: add API service with REST endpoints
fix: handle connection timeout in pool
refactor: simplify retry logic in pool
docs: update architecture documentation
test: add monitor health check tests
chore: update dependencies
```

### Pull Request Process

1. **Fork** the repository (if external contributor)
2. **Create branch** from `develop`
3. **Make changes** and commit
4. **Run tests** and quality checks
5. **Push** to your fork/branch
6. **Create PR** to `develop` branch (or `main` for releases)

### PR Checklist

Before submitting:

- [ ] Tests pass: `pytest tests/unit/ -v`
- [ ] Code quality: `pre-commit run --all-files`
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] PR description explains changes

## Code Standards

### Type Hints

All public interfaces must have type hints:

```python
def insert_events(self, events: list[dict[str, Any]]) -> int:
    """Insert events to database."""
    ...
```

### Docstrings

Classes and public methods need docstrings:

```python
class MyService(BaseService[MyServiceConfig]):
    """
    My Service implementation.

    Provides X, Y, Z functionality.
    """

    async def run(self) -> None:
        """Execute single service cycle."""
        ...
```

### Async/Await

Use async/await for all I/O operations:

```python
# Good
async def fetch_data(self) -> list[dict]:
    return await self._brotr.pool.fetch("SELECT * FROM relays")

# Bad
def fetch_data(self) -> list[dict]:
    return self._brotr.pool.fetch("SELECT * FROM relays")  # Blocking!
```

### Pydantic Configuration

All configuration uses Pydantic models:

```python
from pydantic import BaseModel, Field

class MyServiceConfig(BaseModel):
    interval: float = Field(default=300.0, ge=60.0)
    some_option: str = Field(default="value")
```

## Project Structure

```
bigbrotr/
├── src/
│   ├── core/                 # Core layer (foundation)
│   │   ├── pool.py           # PostgreSQL connection pool
│   │   ├── brotr.py          # Database interface
│   │   ├── base_service.py   # Abstract service base
│   │   └── logger.py         # Structured logging
│   │
│   └── services/             # Service layer (business logic)
│       ├── __main__.py       # CLI entry point
│       ├── initializer.py
│       ├── finder.py
│       ├── monitor.py
│       └── synchronizer.py
│
├── implementations/          # Implementation layer
│   ├── bigbrotr/             # Full-featured
│   └── lilbrotr/             # Lightweight
│
├── tests/
│   └── unit/                 # Unit tests
│
└── docs/                     # Documentation
```

## Adding a New Service

1. **Create service file** (`src/services/myservice.py`):

```python
SERVICE_NAME = "myservice"

class MyServiceConfig(BaseModel):
    interval: float = Field(default=300.0, ge=60.0)

class MyService(BaseService[MyServiceConfig]):
    SERVICE_NAME = SERVICE_NAME
    CONFIG_CLASS = MyServiceConfig

    async def run(self) -> None:
        # Service logic
        pass
```

2. **Add configuration** (`yaml/services/myservice.yaml`)

3. **Register service** (`src/services/__main__.py`):

```python
SERVICE_REGISTRY = {
    "myservice": (MyService, MyServiceConfig),
}
```

4. **Export** (`src/services/__init__.py`):

```python
from services.myservice import MyService, MyServiceConfig
```

5. **Write tests** (`tests/unit/test_myservice.py`)

## Review Process

1. **CI Checks**: All automated checks must pass
2. **Code Review**: At least one approval required
3. **Comments**: Address all review feedback
4. **Squash**: Commits may be squashed if requested

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/bigbrotr/bigbrotr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bigbrotr/bigbrotr/discussions)

## Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Please be respectful and inclusive in all interactions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
