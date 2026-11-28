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
ENABLE_AUTOCONNECT_COMMAND = ["nmcli", "device", "set", "wlan0", "autoconnect", "yes"]


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

    def test_success_on_orange_pi_cycles_wlan0_before_exiting(self):
        self.portal.connection_lock.acquire()
        with (
            patch.object(self.portal.time, "sleep"),
            patch.object(self.portal, "stop_ap"),
            patch.object(self.portal, "is_orange_pi", return_value=True),
            patch.object(
                self.portal, "cycle_wlan0_for_unisoc_stall"
            ) as cycle_wlan0_for_unisoc_stall,
            patch.object(self.portal, "run_command", return_value=Mock(returncode=0)),
            patch.object(
                self.portal.os, "_exit", side_effect=SystemExit
            ) as exit_process,
            self.assertRaises(SystemExit),
        ):
            self.portal._connect_to_wifi("Cafe", "secret")
        cycle_wlan0_for_unisoc_stall.assert_called_once()
        exit_process.assert_called_once_with(0)

    def test_success_on_other_boards_does_not_cycle_wlan0(self):
        self.portal.connection_lock.acquire()
        with (
            patch.object(self.portal.time, "sleep"),
            patch.object(self.portal, "stop_ap"),
            patch.object(self.portal, "is_orange_pi", return_value=False),
            patch.object(
                self.portal, "cycle_wlan0_for_unisoc_stall"
            ) as cycle_wlan0_for_unisoc_stall,
            patch.object(self.portal, "run_command", return_value=Mock(returncode=0)),
            patch.object(
                self.portal.os, "_exit", side_effect=SystemExit
            ) as exit_process,
            self.assertRaises(SystemExit),
        ):
            self.portal._connect_to_wifi("Cafe", "secret")
        cycle_wlan0_for_unisoc_stall.assert_not_called()
        exit_process.assert_called_once_with(0)

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

    def cycle_wlan0_with_command_results(self, command_results):
        with (
            patch.object(self.portal.time, "sleep"),
            patch.object(
                self.portal, "run_command", side_effect=command_results
            ) as run_command,
            redirect_stdout(io.StringIO()),
        ):
            self.portal.cycle_wlan0_for_unisoc_stall()
        return [command_call.args[0] for command_call in run_command.call_args_list]

    def test_successful_wlan0_cycle_leaves_autoconnect_alone(self):
        executed_commands = self.cycle_wlan0_with_command_results(
            [Mock(returncode=0), Mock(returncode=0)]
        )
        self.assertNotIn(ENABLE_AUTOCONNECT_COMMAND, executed_commands)

    def test_failed_activation_prints_the_nmcli_error_without_notices(self):
        nmcli_error_output = (
            "Error: Connection activation failed: The Wi-Fi network could not be "
            "found\nHint: use 'journalctl -xe NM_CONNECTION=a1aae163 + "
            "NM_DEVICE=wlan0' to get more details.\n"
        )
        captured_output = io.StringIO()
        with (
            patch.object(
                self.portal,
                "run_command",
                return_value=Mock(returncode=4, stderr=nmcli_error_output),
            ),
            redirect_stdout(captured_output),
        ):
            self.assertFalse(self.portal.activate_saved_wifi_connections(["uuid"]))
        self.assertIn(
            "Activating saved Wi-Fi uuid failed: Error: Connection activation "
            "failed: The Wi-Fi network could not be found\n",
            captured_output.getvalue(),
        )
        self.assertNotIn("Hint:", captured_output.getvalue())

    def test_nmcli_error_made_only_of_notices_is_kept(self):
        self.assertEqual(
            self.portal.summarize_nmcli_error("Warning: something odd\n"),
            "Warning: something odd",
        )

    def test_failed_wlan0_cycle_reenables_autoconnect(self):
        executed_commands = self.cycle_wlan0_with_command_results(
            [Mock(returncode=0), Mock(returncode=4, stderr="Error"), Mock(returncode=0)]
        )
        self.assertEqual(executed_commands[-1], ENABLE_AUTOCONNECT_COMMAND)

    def test_timed_out_wlan0_cycle_reenables_autoconnect(self):
        executed_commands = self.cycle_wlan0_with_command_results(
            [
                Mock(returncode=0),
                subprocess.TimeoutExpired(["nmcli"], 45),
                Mock(returncode=0),
            ]
        )
        self.assertEqual(executed_commands[-1], ENABLE_AUTOCONNECT_COMMAND)

    def test_saved_wifi_connections_are_ordered_by_last_activation(self):
        connection_list = (
            "eth-uuid:802-3-ethernet:yes:1800000300\n"
            "manual-uuid:802-11-wireless:no:1800000200\n"
            "older-uuid:802-11-wireless:yes:1800000100\n"
            "recent-uuid:802-11-wireless:yes:1800000200\n"
        )
        with patch.object(
            self.portal, "run_command", return_value=Mock(stdout=connection_list)
        ):
            self.assertEqual(
                self.portal.find_saved_wifi_connection_uuids(),
                ["recent-uuid", "older-uuid"],
            )

    def test_boot_wait_is_longer_when_a_wifi_is_saved(self):
        for saved_wifi_lookup, expected_boot_wait_seconds in (
            ({"return_value": ["saved-uuid"]}, 180),
            ({"return_value": []}, 30),
            ({"side_effect": subprocess.TimeoutExpired(["nmcli"], 20)}, 180),
        ):
            with (
                self.subTest(saved_wifi_lookup=saved_wifi_lookup),
                patch.object(
                    self.portal, "find_saved_wifi_connection_uuids", **saved_wifi_lookup
                ),
            ):
                self.assertEqual(
                    self.portal.choose_boot_wait_seconds(), expected_boot_wait_seconds
                )

    def retry_saved_wifi(
        self,
        saved_wifi_connection_uuids=("saved-uuid",),
        clients_connected=False,
        activation_succeeds=False,
        hotspot_restored=True,
    ):
        patched_functions = {
            "find_saved_wifi_connection_uuids": Mock(
                return_value=list(saved_wifi_connection_uuids)
            ),
            "setup_portal_has_connected_clients": Mock(return_value=clients_connected),
            "activate_saved_wifi_connections": Mock(return_value=activation_succeeds),
            "is_orange_pi": Mock(return_value=False),
            "stop_ap": Mock(),
            "start_ap": Mock(return_value=hotspot_restored),
            "scan_ssids": Mock(return_value=["ADENTRO", "Vecino"]),
        }
        exit_process = Mock(side_effect=SystemExit)
        with (
            patch.multiple(self.portal, **patched_functions),
            patch.object(self.portal.os, "_exit", exit_process),
            redirect_stdout(io.StringIO()),
        ):
            try:
                self.portal.retry_saved_wifi_from_setup_portal()
            except SystemExit:
                pass
        return patched_functions, exit_process

    def test_retry_is_skipped_without_a_saved_wifi(self):
        patched_functions, exit_process = self.retry_saved_wifi(
            saved_wifi_connection_uuids=()
        )
        patched_functions["stop_ap"].assert_not_called()
        exit_process.assert_not_called()

    def test_retry_does_not_touch_the_radio_while_someone_is_connected(self):
        patched_functions, exit_process = self.retry_saved_wifi(clients_connected=True)
        patched_functions["stop_ap"].assert_not_called()
        patched_functions["activate_saved_wifi_connections"].assert_not_called()
        exit_process.assert_not_called()

    def test_retry_exits_when_the_saved_wifi_connects(self):
        patched_functions, exit_process = self.retry_saved_wifi(
            activation_succeeds=True
        )
        patched_functions["stop_ap"].assert_called_once()
        patched_functions["activate_saved_wifi_connections"].assert_called_once_with(
            ["saved-uuid"]
        )
        patched_functions["start_ap"].assert_not_called()
        exit_process.assert_called_once_with(0)

    def test_failed_retry_rescans_and_restores_the_setup_portal(self):
        patched_functions, exit_process = self.retry_saved_wifi()
        patched_functions["scan_ssids"].assert_called_once()
        patched_functions["start_ap"].assert_called_once()
        self.assertEqual(self.portal.scanned_ssids, ["ADENTRO", "Vecino"])
        exit_process.assert_not_called()

    def test_failed_retry_restarts_the_service_when_the_portal_cannot_return(self):
        _patched_functions, exit_process = self.retry_saved_wifi(hotspot_restored=False)
        exit_process.assert_called_once_with(1)

    def run_monitor_once(self, monotonic_times):
        with (
            patch.object(self.portal.time, "sleep", side_effect=[None, SystemExit]),
            patch.object(self.portal.time, "monotonic", side_effect=monotonic_times),
            patch.object(self.portal, "wifi_is_real", return_value=False),
            patch.object(self.portal, "uplink_is_real", return_value=False),
            patch.object(
                self.portal, "retry_saved_wifi_from_setup_portal"
            ) as retry_saved_wifi,
            self.assertRaises(SystemExit),
        ):
            self.portal._monitor_connection()
        return retry_saved_wifi

    def test_monitor_retries_the_saved_wifi_once_the_interval_passes(self):
        retry_interval = self.portal.SAVED_NETWORK_RETRY_INTERVAL_SECONDS
        retry_saved_wifi = self.run_monitor_once([0, retry_interval, retry_interval])
        retry_saved_wifi.assert_called_once_with()
        self.assertFalse(self.portal.connection_lock.locked())

    def test_monitor_does_not_retry_before_the_interval(self):
        retry_saved_wifi = self.run_monitor_once([0, 15])
        retry_saved_wifi.assert_not_called()
