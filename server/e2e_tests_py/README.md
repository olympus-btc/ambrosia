# End-to-End (E2E) Tests

This directory contains Python-based end-to-end tests for the Ambrosia POS server.

## Overview

The E2E tests validate the entire server stack by:
- Starting the Kotlin server using Gradle
- Making HTTP requests to the running server
- Validating API responses and behavior
- Testing authentication, routing, and endpoints

## Installation

### Prerequisites

- Python 3.12+
- uv (recommended - includes its own pip) or pip
- Kotlin/Gradle (for building the server)
- Phoenix configuration (optional - only needed if testing wallet/lightning features)

### Setup

1. **Install uv** (if not already installed):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Set up virtual environment and install dependencies**:
```bash
cd server/e2e_tests_py
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
```

> **Note**: `uv pip` uses its own pip implementation and doesn't require the system `pip` to be installed

**Alternative using system pip**:
```bash
cd server/e2e_tests_py
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

This installs the test dependencies defined in `pyproject.toml`.

## Running Tests

### Run all tests

```bash
pytest

# Or using make
make test
```

### Run specific test file

```bash
pytest tests/test_routing_e2e.py
```

### Run specific test

```bash
pytest tests/test_routing_e2e.py::TestAuthEndpoints::test_login_with_default_credentials
```

### Run with verbose output

```bash
pytest -v
```

### Run and show print statements

```bash
pytest -s
```

### Test Filtering

#### Default Behavior (Fast Tests Only)

By default, `pytest` skips slow tests for faster feedback during development:

```bash
pytest  # Skips tests marked with @pytest.mark.slow
```

#### Run All Tests (Including Slow)

To run all tests including slow ones (useful before committing or in CI):

```bash
pytest --run-slow
```

**Slow tests:** Currently none.

Previously slow:
- `test_access_token_expiration_and_refresh` - Now fast (8s) with configurable token expiration

**Note**: CI automatically runs all tests with `--run-slow`.

## Test Structure

### Test Files

- **`tests/test_routing_e2e.py`** - Core E2E tests covering:
  - Root endpoint validation
  - Base currency endpoint
  - 404 error handling
  - Performance testing
  - CORS headers
  - Authentication (login with correct/wrong credentials)

### Test Utilities

- **`ambrosia/http_client.py`** - HTTP client for making async requests
- **`ambrosia/test_server.py`** - Server lifecycle management (start/stop)
- **`ambrosia/api_utils.py`** - HTTP response assertion helper functions

## Test Workflow

1. **Server startup**: Tests automatically start the Kotlin server using Gradle
2. **Test execution**: Each test makes HTTP requests to the running server
3. **Validation**: Tests verify response status codes, headers, and content
4. **Cleanup**: Server is automatically stopped after tests complete

## Configuration

Tests use the following default configuration:

- **Server URL**: `http://127.0.0.1:9154`
- **Server Host**: `127.0.0.1`
- **Server Port**: `9154`
- **Startup Timeout**: 60 seconds
- **Health Check Interval**: 1 second

## CI/CD Integration

Tests are automatically run in GitHub Actions (`.github/workflows/e2e.yml`) on:
- Pull requests
- Push to main branch

The CI workflow:
1. Sets up Python environment
2. Installs dependencies (including dev dependencies for `ruff`)
3. Builds the server
4. **Runs ruff checks (format & lint)** - Fails if code is not properly formatted or has linting errors
5. Runs the E2E test suite

> **⚠️ Important**: The CI will fail if your code doesn't conform to ruff's formatting and linting rules. Make sure to run `ruff format .` and `ruff check .` locally before pushing, or use the pre-commit hook for automatic checking.

## Requirements

The tests require:
- Development database with default user (`cooluser1` / `0000`)
- No additional configuration needed - tests automatically provide Phoenix credentials via command-line arguments

## Troubleshooting

### Server won't start

- Check that port 9154 is available
- Ensure Gradle can build the Kotlin server
- Check server logs in test output for errors

### Tests timing out or "Server did not start within 30 seconds"

- **Rebuild the server first**: If the server code has been updated, you need to rebuild before running tests
  ```bash
  cd server
  ./gradlew build
  # Or if you have build issues:
  ./gradlew clean build
  ```
- Check if port 9154 is already in use by a previous test run:
  ```bash
  lsof -i :9154
  # If something is running, kill it:
  kill <PID>
  ```
- Kill any hanging Gradle processes from previous test runs:
  ```bash
  pkill -f "gradle.*run"
  ```
- Increase `STARTUP_TIMEOUT` in `test_server.py` if your system is slow
- Check server logs in test output for errors
- Verify Phoenix connection

### Import errors

- Ensure virtual environment is activated
- Reinstall dependencies: `uv pip install -e .` or `pip install -e .`
- Check Python version: `python --version` (should be 3.12+)

## Code Quality

### Formatting and Linting

```bash
# Using make (requires dev dependencies)
make lint      # Run ruff linter
make format    # Format code with ruff
make clean     # Clean up test artifacts

# Or directly with ruff
ruff check .              # Check for issues
ruff format .             # Format code
ruff check --fix .        # Auto-fix issues
```

## For Developers

### Development Dependencies

To contribute to the tests and use code quality tools, install with dev dependencies:

```bash
uv pip install -e '.[dev]'  # Includes ruff for linting/formatting
# or
pip install -e '.[dev]'
```

This installs:
- ruff - code formatting and linting

### Upgrading Dependencies

To upgrade packages to their latest compatible versions:

```bash
# Update all dependencies including dev dependencies
uv sync --all-extras --upgrade

# Or update lock file first, review changes, then sync
uv lock --upgrade
git diff uv.lock      # Review what will be updated
uv sync --all-extras
```

### Writing Tests

Basic test structure:

```python
import pytest
from ambrosia.http_client import AmbrosiaHttpClient

class TestMyAPI:
    @pytest.mark.asyncio
    async def test_my_endpoint(self, server_url: str):
        async with AmbrosiaHttpClient(server_url) as client:
            response = await client.get("/my-endpoint")
            # Assert response status is 200
            assert response.status_code == 200
```

### Using Test Utilities

```python
from ambrosia.api_utils import assert_status_code, assert_response_contains
import time

# Assertions (module-level functions)
assert_status_code(response, 200)
assert_response_contains(response, "expected text")

# Performance testing (inline timing)
start_time = time.time()
response = await client.get("/endpoint")
request_time = (time.time() - start_time) * 1000  # Convert to milliseconds
assert request_time < 1000
```

### Pre-commit Hook

A Git pre-commit hook is available that runs `ruff format` and `ruff check` on staged Python files before each commit. This ensures code quality and consistency.

**Location**: `.git/hooks/pre-commit`

**Installation**:
```bash
# The hook is already in the repository
cp .git/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**What it does**:
- Automatically formats Python files with `ruff format`
- Runs `ruff check` to catch linting errors
- Blocks the commit if there are any errors
- Only processes files in `server/e2e_tests_py/`

**Example output**:
```bash
$ git commit -m "Update tests"
Running ruff on staged Python files...
Running ruff check...
✅ ruff check passed
[main abc1234] Update tests
```

**If errors are found**:
```bash
$ git commit -m "Buggy code"
Running ruff on staged Python files...
Running ruff check...
❌ ruff check failed. Please fix the errors above.
💡 Tip: Run 'ruff check --fix' to auto-fix some issues.
```

To manually test the hook:
```bash
# Stage some Python files
git add server/e2e_tests_py/tests/test_routing_e2e.py

# Try to commit (hook will run)
git commit -m "Test hook"

# The hook runs automatically!
```

### Architecture

- **Lifecycle Management**: The `manage_server_lifecycle` fixture automatically starts/stops the server
- **Session-Scoped**: Server is started once and reused across all tests for efficiency
- **Type Safety**: Full type hints throughout the codebase

### Comparison with Kotlin Tests

| Feature | Kotlin TestServer.kt | Python AmbrosiaTestServer |
|---------|---------------------|--------------------------|
| Server startup | `runGradleApp()` | `start_server()` |
| Health checking | `waitForServer()` | `_wait_for_server()` |
| Server shutdown | `stopServer()` | `stop_server()` |
| Process management | Basic | Enhanced |
| Async support | Coroutines | asyncio |
| HTTP client | Ktor HttpClient | httpx |
