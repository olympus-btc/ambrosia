"""End-to-end test for the global request body size limit (RequestBodyLimit
plugin installed in Api.kt).

The default limit is 2 MiB and applies to every route except /uploads and
/backup/import, which get their own higher limits. This test sends a 3 MiB
body to /auth/login and expects a 413 before any login logic (including the
pre-existing login lockout counter) ever runs.
"""

import pytest

from ambrosia.http_client import AmbrosiaHttpClient

OVERSIZED_BODY_BYTES = 3 * 1024 * 1024


class TestRequestBodyLimit:
    @pytest.mark.asyncio
    async def test_oversized_body_is_rejected_with_413(self, server_url: str):
        async with AmbrosiaHttpClient(server_url) as client:
            oversized_body_response = await client.post(
                "/auth/login",
                json={"name": "x" * OVERSIZED_BODY_BYTES, "pin": "0000"},
            )

        assert oversized_body_response.status_code == 413, (
            f"Expected 413 for an oversized body, got {oversized_body_response.status_code}"
        )
