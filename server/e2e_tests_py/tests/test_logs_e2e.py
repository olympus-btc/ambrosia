"""End-to-end tests for the logs API used by Settings -> System -> Logs.

Covers reading server logs, the admin-only guard, client error reports,
the runtime log level switch and the ZIP download.
"""

import asyncio
import io
import uuid
import zipfile
from pathlib import Path

import pytest

CLIENT_LOG_REPORTS_PER_MINUTE = 30
BASELINE_PERMISSIONS = ["wallet_read"]


def read_ambrosia_conf_values(ambrosia_data_directory: str) -> dict[str, str]:
    conf_lines = Path(ambrosia_data_directory, "ambrosia.conf").read_text().splitlines()
    return dict(conf_line.split("=", 1) for conf_line in conf_lines if "=" in conf_line)


async def wait_for_log_entry(admin_client, log_source: str, search_text: str) -> list:
    for _ in range(20):
        logs_response = await admin_client.get(
            "/logs", params={"source": log_source, "search": search_text}
        )
        assert logs_response.status_code == 200
        matching_entries = logs_response.json()["entries"]
        if matching_entries:
            return matching_entries
        await asyncio.sleep(0.25)
    return []


class TestLogsAccess:
    @pytest.mark.asyncio
    async def test_admin_reads_server_log_entries(self, admin_client):
        logs_response = await admin_client.get(
            "/logs", params={"source": "server", "lines": 50}
        )

        assert logs_response.status_code == 200
        log_entries = logs_response.json()["entries"]
        assert len(log_entries) > 0
        assert {"timestamp", "level", "source", "logger", "message"} <= set(
            log_entries[0]
        )
        assert all(log_entry["source"] == "server" for log_entry in log_entries)

    @pytest.mark.asyncio
    async def test_admin_lists_log_sources(self, admin_client):
        sources_response = await admin_client.get("/logs/sources")

        assert sources_response.status_code == 200
        sources_by_id = {
            log_source["id"]: log_source
            for log_source in sources_response.json()["sources"]
        }
        assert set(sources_by_id) == {"server", "phoenixd", "client"}
        assert sources_by_id["server"]["available"] is True

    @pytest.mark.asyncio
    async def test_unknown_source_and_level_are_rejected(self, admin_client):
        unknown_source_response = await admin_client.get(
            "/logs", params={"source": "kernel"}
        )
        unknown_level_response = await admin_client.get(
            "/logs", params={"level": "LOUD"}
        )

        assert unknown_source_response.status_code == 400
        assert unknown_level_response.status_code == 400

    @pytest.mark.asyncio
    async def test_non_admin_cannot_read_logs(self, client_factory):
        non_admin_client = await client_factory(BASELINE_PERMISSIONS)

        logs_response = await non_admin_client.get("/logs")
        download_response = await non_admin_client.get("/logs/download")

        assert logs_response.status_code == 403
        assert download_response.status_code == 403

    @pytest.mark.asyncio
    async def test_anonymous_cannot_read_logs(self, public_client):
        logs_response = await public_client.get("/logs")

        assert logs_response.status_code == 401


class TestClientLogReports:
    @pytest.mark.asyncio
    async def test_client_report_is_visible_in_client_source(
        self, admin_client, client_factory
    ):
        reporting_client = await client_factory(BASELINE_PERMISSIONS)
        unique_marker = f"e2e-client-error-{uuid.uuid4().hex[:8]}"

        report_response = await reporting_client.post(
            "/logs/client",
            json={
                "level": "ERROR",
                "message": f"{unique_marker} token=supersecret",
                "stack": "TypeError: boom\n    at Cart (cart.js:1:1)",
                "url": "/store/cart",
                "origin": "browser",
                "context": {"type": "window.error"},
            },
        )

        assert report_response.status_code == 204
        client_entries = await wait_for_log_entry(admin_client, "client", unique_marker)
        assert len(client_entries) == 1
        assert client_entries[0]["level"] == "ERROR"
        assert "token=***" in client_entries[0]["message"]
        assert "supersecret" not in client_entries[0]["message"]
        assert "TypeError: boom" in client_entries[0]["details"]

        server_entries_with_marker = (
            await admin_client.get(
                "/logs", params={"source": "server", "search": unique_marker}
            )
        ).json()["entries"]
        assert server_entries_with_marker == []

    @pytest.mark.asyncio
    async def test_anonymous_client_report_is_rejected(self, public_client):
        report_response = await public_client.post(
            "/logs/client", json={"message": "anonymous error"}
        )

        assert report_response.status_code == 401

    @pytest.mark.asyncio
    async def test_oversized_client_report_is_rejected(self, client_factory):
        reporting_client = await client_factory(BASELINE_PERMISSIONS)

        report_response = await reporting_client.post(
            "/logs/client", json={"message": "x" * (32 * 1024)}
        )

        assert report_response.status_code == 413

    @pytest.mark.asyncio
    async def test_client_reports_are_rate_limited_per_user(self, client_factory):
        reporting_client = await client_factory(BASELINE_PERMISSIONS)

        report_status_codes = [
            (
                await reporting_client.post(
                    "/logs/client", json={"message": f"rate limit probe {attempt}"}
                )
            ).status_code
            for attempt in range(CLIENT_LOG_REPORTS_PER_MINUTE + 1)
        ]

        assert report_status_codes[:CLIENT_LOG_REPORTS_PER_MINUTE] == [204] * (
            CLIENT_LOG_REPORTS_PER_MINUTE
        )
        assert report_status_codes[-1] == 429


class TestLogLevel:
    @pytest.mark.asyncio
    async def test_admin_changes_and_persists_server_log_level(
        self, admin_client, test_server
    ):
        initial_level_response = await admin_client.get("/logs/level")
        assert initial_level_response.status_code == 200
        initial_level = initial_level_response.json()["level"]

        try:
            update_response = await admin_client.put(
                "/logs/level", json={"level": "debug"}
            )

            assert update_response.status_code == 200
            assert update_response.json()["level"] == "DEBUG"
            assert (await admin_client.get("/logs/level")).json()["level"] == "DEBUG"
            assert (
                read_ambrosia_conf_values(test_server.datadir)["log-level"] == "DEBUG"
            )
        finally:
            await admin_client.put("/logs/level", json={"level": initial_level})

    @pytest.mark.asyncio
    async def test_debug_level_logs_each_request_without_query_string(
        self, admin_client
    ):
        initial_level = (await admin_client.get("/logs/level")).json()["level"]
        unique_search_marker = f"query-marker-{uuid.uuid4().hex[:8]}"

        try:
            await admin_client.put("/logs/level", json={"level": "DEBUG"})
            await admin_client.get("/users/me", params={"probe": unique_search_marker})

            request_entries = await wait_for_log_entry(
                admin_client, "server", "GET /users/me 200"
            )

            assert request_entries
            assert request_entries[-1]["logger"] == "HttpRequests"
            assert request_entries[-1]["level"] == "DEBUG"
            assert all(
                unique_search_marker not in request_entry["message"]
                for request_entry in request_entries
            )
        finally:
            await admin_client.put("/logs/level", json={"level": initial_level})

    @pytest.mark.asyncio
    async def test_unsupported_log_level_is_rejected(self, admin_client):
        update_response = await admin_client.put("/logs/level", json={"level": "TRACE"})

        assert update_response.status_code == 400


class TestLogsDownload:
    @pytest.mark.asyncio
    async def test_admin_downloads_logs_archive(self, admin_client):
        download_response = await admin_client.get("/logs/download")

        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "application/zip"
        assert "ambrosia-logs-" in download_response.headers["content-disposition"]
        with zipfile.ZipFile(io.BytesIO(download_response.content)) as logs_archive:
            archived_file_names = logs_archive.namelist()
            assert "diagnostics.txt" in archived_file_names
            assert "server/server.log" in archived_file_names
            diagnostics_text = logs_archive.read("diagnostics.txt").decode()
        assert "Ambrosia version:" in diagnostics_text
        assert "Server log level:" in diagnostics_text
