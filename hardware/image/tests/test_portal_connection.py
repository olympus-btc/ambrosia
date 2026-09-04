"""Test Flask requests and radio recovery with all device commands mocked."""

import importlib.machinery
import importlib.util
import io
import subprocess
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import Mock, patch

PORTAL_PATH = Path(__file__).resolve().parents[1] / "common/portal/ambrosia-wifi-portal"


class PortalConnectionTests(unittest.TestCase):
    def setUp(self):
        module_loader = importlib.machinery.SourceFileLoader(
            "wifi_portal", str(PORTAL_PATH)
        )
        module_specification = importlib.util.spec_from_loader(
            module_loader.name, module_loader
        )
        self.portal = importlib.util.module_from_spec(module_specification)
        module_loader.exec_module(self.portal)
        self.test_client = self.portal.app.test_client()

    def test_duplicate_requests_do_not_start_two_radio_switches(self):
        with patch.object(self.portal.threading, "Thread") as worker_thread_class:
            accepted_response = self.test_client.post(
                "/commit", data={"ssid": "Cafe", "password": "secret"}
            )
            conflict_response = self.test_client.post(
                "/commit", data={"ssid": "Other", "password": "other"}
            )
        self.assertEqual(accepted_response.status_code, 200)
        self.assertEqual(conflict_response.status_code, 409)
        worker_thread_class.assert_called_once_with(
            target=self.portal._connect_to_wifi,
            args=("Cafe", "secret"),
            daemon=True,
        )
        self.assertEqual(accepted_response.headers["Cache-Control"], "no-store")

    def test_empty_ssid_is_rejected_without_switching_radio(self):
        with patch.object(self.portal.threading, "Thread") as worker_thread_class:
            empty_ssid_response = self.test_client.post("/commit", data={"ssid": " "})
        self.assertEqual(empty_ssid_response.status_code, 400)
        worker_thread_class.assert_not_called()

    def test_worker_start_failure_allows_retry(self):
        with patch.object(self.portal.threading, "Thread") as worker_thread_class:
            worker_thread_class.return_value.start.side_effect = RuntimeError(
                "no threads"
            )
            start_failure_response = self.test_client.post(
                "/commit", data={"ssid": "Cafe"}
            )
        self.assertEqual(start_failure_response.status_code, 503)
        self.assertFalse(self.portal.connection_lock.locked())

    def test_confirmation_escapes_credentials_and_is_not_cached(self):
        with patch.object(self.portal, "get_hostname", return_value="ambrosia-test"):
            confirmation_response = self.test_client.post(
                "/", data={"ssid": "<script>alert(1)</script>", "password": '"<secret>'}
            )
        self.assertEqual(confirmation_response.status_code, 200)
        self.assertNotIn(b"<script>alert(1)</script>", confirmation_response.data)
        self.assertEqual(confirmation_response.headers["Cache-Control"], "no-store")
        self.assertEqual(
            confirmation_response.headers["Referrer-Policy"], "no-referrer"
        )

    def test_failed_or_timed_out_connection_restores_hotspot_and_releases_lock(self):
        for connection_failure in (
            None,
            subprocess.TimeoutExpired(["nmcli", "password", "private-secret"], 60),
            OSError("private-secret"),
        ):
            with self.subTest(failure=type(connection_failure).__name__):
                self.portal.connection_lock.acquire()
                captured_output = io.StringIO()
                with (
                    patch.object(self.portal.time, "sleep"),
                    patch.object(self.portal, "stop_ap") as stop_hotspot,
                    patch.object(
                        self.portal, "start_ap", return_value=True
                    ) as start_hotspot,
                    patch.object(
                        self.portal,
                        "run_command",
                        return_value=Mock(returncode=1),
                        side_effect=connection_failure,
                    ),
                    redirect_stdout(captured_output),
                ):
                    self.portal._connect_to_wifi("Cafe", "private-secret")
                stop_hotspot.assert_called_once()
                start_hotspot.assert_called_once()
                self.assertFalse(self.portal.connection_lock.locked())
                self.assertNotIn("private-secret", captured_output.getvalue())

    def test_success_exits_without_restarting_hotspot(self):
        self.portal.connection_lock.acquire()
        with (
            patch.object(self.portal.time, "sleep"),
            patch.object(self.portal, "stop_ap"),
            patch.object(self.portal, "start_ap") as start_hotspot,
            patch.object(self.portal, "run_command", return_value=Mock(returncode=0)),
            patch.object(
                self.portal.os, "_exit", side_effect=SystemExit
            ) as exit_process,
            self.assertRaises(SystemExit),
        ):
            self.portal._connect_to_wifi("Cafe", "secret")
        exit_process.assert_called_once_with(0)
        start_hotspot.assert_not_called()

    def test_monitor_does_not_touch_radio_during_connection(self):
        self.portal.connection_lock.acquire()
        with (
            patch.object(self.portal.time, "sleep", side_effect=[None, SystemExit]),
            patch.object(self.portal, "wifi_is_real") as wifi_status_check,
            patch.object(self.portal, "stop_ap") as stop_hotspot,
            self.assertRaises(SystemExit),
        ):
            self.portal._monitor_connection()
        wifi_status_check.assert_not_called()
        stop_hotspot.assert_not_called()

    def test_hotspot_recovery_failure_requests_service_restart(self):
        self.portal.connection_lock.acquire()
        with (
            patch.object(self.portal.time, "sleep"),
            patch.object(self.portal, "stop_ap"),
            patch.object(self.portal, "run_command", return_value=Mock(returncode=1)),
            patch.object(self.portal, "start_ap", side_effect=OSError),
            patch.object(
                self.portal.os, "_exit", side_effect=SystemExit
            ) as exit_process,
            self.assertRaises(SystemExit),
        ):
            self.portal._connect_to_wifi("Cafe", "secret")
        exit_process.assert_called_once_with(1)
        self.assertFalse(self.portal.connection_lock.locked())
