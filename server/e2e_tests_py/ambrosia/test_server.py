"""TestServer class that replicates the functionality of TestServer.kt

This module provides a Python equivalent of the Kotlin TestServer.kt class,
handling server startup, shutdown, and health checking for API tests.
"""

import logging
import os
import signal
import subprocess
import time
from pathlib import Path

import httpx
import psutil
import pytest

logger = logging.getLogger(__name__)


class AmbrosiaTestServer:
    """Test server manager that replicates TestServer.kt functionality.

    This class manages the lifecycle of the Ambrosia POS server for testing,
    including starting the server via Gradle, waiting for it to be ready,
    and properly shutting it down after tests complete.
    """

    # Server configuration constants (matching TestServer.kt)
    SERVER_PORT = 9154
    SERVER_HOST = "127.0.0.1"
    HEALTH_CHECK_URL = f"http://{SERVER_HOST}:{SERVER_PORT}/"

    # Timeout settings
    STARTUP_TIMEOUT = 30  # seconds
    HEALTH_CHECK_INTERVAL = 1  # seconds

    def __init__(self):
        self.server_process: subprocess.Popen | None = None
        self.server_url = f"http://{self.SERVER_HOST}:{self.SERVER_PORT}"
        self._gradle_dir = Path(__file__).parent.parent.parent

    def start_server(self) -> None:
        """Start the server using Gradle, equivalent to runGradleApp() in TestServer.kt."""
        if self.server_process is not None:
            logger.warning("Server is already running")
            return

        logger.info(f"Starting server from directory: {self._gradle_dir}")

        # Change to the app directory and run gradlew with Phoenix configuration
        # Use shorter access token expiration (10 seconds) for faster E2E testing
        # Note: All application arguments must be in a single quoted string after --args
        args_string = "--phoenixd-url http://localhost:9740 --phoenixd-password test-password --jwt-access-token-expiration 5"
        cmd = [
            "./gradlew",
            "run",
            "--no-daemon",
            f"--args={args_string}",
        ]

        logger.info(f"Starting server with command: {' '.join(cmd)}")

        try:
            self.server_process = subprocess.Popen(
                cmd,
                cwd=self._gradle_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid if os.name != "nt" else None,
            )
            logger.info(f"Server process started with PID: {self.server_process.pid}")

            # Wait for server to be ready
            self._wait_for_server()

        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            self._cleanup_server()
            raise

    def stop_server(self) -> None:
        """Stop the server process, equivalent to stopServer() in TestServer.kt."""
        if self.server_process is None:
            logger.warning("No server process to stop")
            return

        logger.info(f"Stopping server process (PID: {self.server_process.pid})")

        try:
            # Try graceful shutdown first
            if os.name != "nt":
                # On Unix systems, send SIGTERM to the process group
                os.killpg(os.getpgid(self.server_process.pid), signal.SIGTERM)
            else:
                # On Windows, terminate the process
                self.server_process.terminate()

            # Wait for graceful shutdown
            try:
                self.server_process.wait(timeout=10)
                logger.info("Server stopped gracefully")
            except subprocess.TimeoutExpired:
                logger.warning("Graceful shutdown timeout, forcing termination")
                self._force_kill_server()

        except Exception as e:
            logger.error(f"Error stopping server: {e}")
            self._force_kill_server()
        finally:
            self._cleanup_server()

    def _wait_for_server(self) -> None:
        """Wait for server to be ready, equivalent to waitForServer() in TestServer.kt."""
        start_time = time.time()
        timeout = self.STARTUP_TIMEOUT

        logger.info(f"Waiting for server to be ready (timeout: {timeout}s)")

        while time.time() - start_time < timeout:
            try:
                # Check if server is responding
                response = httpx.get(self.HEALTH_CHECK_URL, timeout=5.0)
                if response.status_code == 200:
                    logger.info("Server is ready and responding")
                    return

            except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
                logger.debug(f"Server not ready yet: {e}")

            # Check if process is still running
            if self.server_process and self.server_process.poll() is not None:
                stdout, stderr = self.server_process.communicate()
                logger.error(
                    f"Server process died unexpectedly. stdout: {stdout}, stderr: {stderr}"
                )
                raise RuntimeError("Server process died during startup")

            time.sleep(self.HEALTH_CHECK_INTERVAL)

        # If we get here, server didn't start in time
        self._log_server_output()
        raise RuntimeError(f"Server did not start within {timeout} seconds")

    def _force_kill_server(self) -> None:
        """Force kill the server process and all its children."""
        if self.server_process is None:
            return

        try:
            # Kill the process group (includes child processes)
            if os.name != "nt":
                os.killpg(os.getpgid(self.server_process.pid), signal.SIGKILL)
            else:
                self.server_process.kill()

            # Also kill any remaining processes by name (fallback)
            self._kill_processes_by_name("java")

        except Exception as e:
            logger.error(f"Error force killing server: {e}")

    def _kill_processes_by_name(self, process_name: str) -> None:
        """Kill processes by name as a fallback cleanup method."""
        try:
            for proc in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    if proc.info["name"] and process_name in proc.info["name"].lower():
                        # Check if it's likely our server process
                        cmdline = proc.info.get("cmdline", [])
                        if any("ambrosia" in str(arg).lower() for arg in cmdline):
                            logger.info(
                                f"Killing process {proc.info['pid']}: {cmdline}"
                            )
                            proc.kill()
                except (
                    psutil.NoSuchProcess,
                    psutil.AccessDenied,
                    psutil.ZombieProcess,
                ):
                    pass
        except Exception as e:
            logger.error(f"Error killing processes by name: {e}")

    def _cleanup_server(self) -> None:
        """Clean up server process references."""
        if self.server_process:
            self.server_process = None

    def _log_server_output(self) -> None:
        """Log server output for debugging."""
        if self.server_process:
            try:
                stdout, stderr = self.server_process.communicate(timeout=1)
                if stdout:
                    logger.error(f"Server stdout: {stdout.decode()}")
                if stderr:
                    logger.error(f"Server stderr: {stderr.decode()}")
            except subprocess.TimeoutExpired:
                logger.error("Could not read server output (timeout)")
            except Exception as e:
                logger.error(f"Error reading server output: {e}")


# Pytest fixtures for easy integration
@pytest.fixture(scope="session")
def test_server() -> AmbrosiaTestServer:
    """Session-scoped fixture that provides a TestServer instance."""
    return AmbrosiaTestServer()


@pytest.fixture(scope="session")
def server_url(test_server: AmbrosiaTestServer) -> str:
    """Session-scoped fixture that provides the server URL."""
    return test_server.server_url


@pytest.fixture(scope="session", autouse=True)
def manage_server_lifecycle(test_server: AmbrosiaTestServer) -> None:
    """Session-scoped fixture that manages server startup and shutdown."""
    # Start server
    test_server.start_server()

    yield  # Run all tests

    # Stop server after all tests
    test_server.stop_server()
