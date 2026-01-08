"""Pytest configuration and shared fixtures.

This module provides pytest configuration and shared fixtures that are
available to all test modules in the tests directory.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

import pytest

from ambrosia.http_client import AmbrosiaHttpClient
from ambrosia.auth_utils import login_user, create_test_user, create_test_role, grant_permissions

# Import fixtures from test_server to make them available to tests
# These are pytest fixtures that will be used by tests and other fixtures
from ambrosia.test_server import (  # noqa: F401
    manage_server_lifecycle,
    server_url,
    test_server,
)

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Configure logging for tests
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# Pytest hooks for custom CLI options
def pytest_addoption(parser):
    """Add custom command-line options."""
    parser.addoption(
        "--run-slow",
        action="store_true",
        default=False,
        help="Include slow tests in the test run (default: skip slow tests)",
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection based on command-line options."""
    run_slow = config.getoption("--run-slow")

    if not run_slow:
        # Mark slow tests to be skipped
        skip_slow = pytest.mark.skipif(
            True, reason="Slow test skipped (use --run-slow to include)"
        )
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)


# Set up test environment variables
os.environ.setdefault("TESTING", "true")
os.environ.setdefault("LOG_LEVEL", "INFO")


@pytest.fixture(scope="session", autouse=True)
def initialize_database(manage_server_lifecycle, server_url: str):  # noqa: F811
    """Ensure the database is initialized with the default user before any tests run.

    This fixture runs once per test session after the server starts but before any tests.
    It checks if the database is initialized and creates the default user if needed.

    Args:
        manage_server_lifecycle: Ensures server is started before this runs
        server_url: The URL of the running server
    """

    async def setup():
        async with AmbrosiaHttpClient(server_url) as client:
            # Check if database is initialized
            setup_check = await client.get("/initial-setup")

            if setup_check.status_code == 200:
                setup_status = setup_check.json()

                if setup_status.get("initialized", False):
                    logger.info("✓ Database already initialized")
                    return

            # Database not initialized - try to create default user
            logger.info(
                "Attempting to initialize database with default user for tests..."
            )
            setup_data = {
                "businessType": "store",
                "userName": "cooluser1",
                "userPassword": "password123",
                "userPin": "0000",
                "businessName": "Test Store",
                "businessAddress": "123 Test St",
                "businessPhone": "1234567890",
                "businessEmail": "test@example.com",
                "businessCurrency": "USD",
            }

            setup_response = await client.post("/initial-setup", json=setup_data)

            if setup_response.status_code == 201:
                logger.info("✓ Database initialized successfully with default user")
                # Give database a moment to commit
                await asyncio.sleep(1.0)
            elif setup_response.status_code == 409:
                logger.info("✓ Database already initialized (409 Conflict)")
            elif setup_response.status_code == 500:
                # Check if it's a UNIQUE constraint error (user already exists)
                try:
                    error_data = setup_response.json()
                    error_message = error_data.get("message", "")
                    if "UNIQUE constraint failed: users.name" in error_message:
                        logger.info(
                            "✓ User already exists in database, continuing with tests"
                        )
                        return
                    else:
                        error_msg = (
                            f"Initial setup failed with status 500: {error_message}"
                        )
                        logger.error(error_msg)
                        raise RuntimeError(error_msg)
                except (KeyError, ValueError) as e:
                    # If we can't parse the JSON, re-raise with context
                    error_msg = f"Initial setup failed with status 500, could not parse error: {e}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg) from e
            else:
                error_msg = (
                    f"Initial setup failed with status {setup_response.status_code}"
                )
                try:
                    error_msg += f": {setup_response.text[:200]}"
                except Exception:
                    pass
                logger.error(error_msg)
                raise RuntimeError(error_msg)

    # Run the async setup function
    asyncio.run(setup())

    # Yield control to tests
    yield

    # Teardown (if needed) would go here


@pytest.fixture
async def admin_client(server_url: str):
    """Fixture that provides an authenticated admin client.

    This fixture creates a new AmbrosiaHttpClient, performs login with
    default admin credentials, and yields the authenticated client.
    The client is automatically closed after the test.
    """
    async with AmbrosiaHttpClient(server_url) as client:
        await login_user(client)
        yield client


@pytest.fixture
async def public_client(server_url: str):
    """Fixture that provides an unauthenticated client.
    
    The client is automatically closed after the test.
    """
    async with AmbrosiaHttpClient(server_url) as client:
        yield client
