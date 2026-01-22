"""HTTP client utilities for API testing.

This module provides HTTP client functionality that replicates the behavior
of the Ktor HttpClient used in the Kotlin tests.
"""

import logging

import httpx

logger = logging.getLogger(__name__)


class AmbrosiaHttpClient:
    """HTTP client for testing API endpoints.

    This class provides a simple interface for making HTTP requests
    that matches the behavior of the Ktor HttpClient used in Kotlin tests.
    """

    def __init__(self, base_url: str = "http://127.0.0.1:9154", timeout: float = 30.0):
        """Initialize the HTTP client.

        Args:
            base_url: Base URL of the server
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        """Async context manager entry."""
        # Configure client with cookie jar and redirect following
        self._client = httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
            cookies=httpx.Cookies(),  # Explicit cookie jar
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get(self, url: str, **kwargs) -> httpx.Response:
        """Make a GET request.

        Args:
            url: URL to request (can be relative to base_url)
            **kwargs: Additional arguments for httpx

        Returns:
            httpx.Response object
        """
        full_url = self._build_url(url)

        logger.debug(f"GET {full_url}")
        response = await self._client.get(full_url, **kwargs)
        logger.debug(f"Response: {response.status_code}")

        return response

    async def post(self, url: str, **kwargs) -> httpx.Response:
        """Make a POST request.

        Args:
            url: URL to request (can be relative to base_url)
            **kwargs: Additional arguments for httpx

        Returns:
            httpx.Response object
        """
        full_url = self._build_url(url)

        logger.debug(f"POST {full_url}")
        response = await self._client.post(full_url, **kwargs)
        logger.debug(f"Response: {response.status_code}")

        return response

    async def put(self, url: str, **kwargs) -> httpx.Response:
        """Make a PUT request.

        Args:
            url: URL to request (can be relative to base_url)
            **kwargs: Additional arguments for httpx

        Returns:
            httpx.Response object
        """
        full_url = self._build_url(url)

        logger.debug(f"PUT {full_url}")
        response = await self._client.put(full_url, **kwargs)
        logger.debug(f"Response: {response.status_code}")

        return response

    async def delete(self, url: str, **kwargs) -> httpx.Response:
        """Make a DELETE request.

        Args:
            url: URL to request (can be relative to base_url)
            **kwargs: Additional arguments for httpx

        Returns:
            httpx.Response object
        """
        full_url = self._build_url(url)

        logger.debug(f"DELETE {full_url}")
        response = await self._client.delete(full_url, **kwargs)
        logger.debug(f"Response: {response.status_code}")

        return response

    def _build_url(self, url: str) -> str:
        """Build full URL from relative URL."""
        if url.startswith("http"):
            return url
        return f"{self.base_url}/{url.lstrip('/')}"
