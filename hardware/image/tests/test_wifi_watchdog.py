"""Test the Wi-Fi stall watchdog with all device commands mocked."""

import importlib.machinery
import importlib.util
import io
import json
import re
import subprocess
import tempfile
import unittest
from contextlib import ExitStack, redirect_stdout
from pathlib import Path
from unittest.mock import Mock, call, patch

IMAGE_DIRECTORY = Path(__file__).resolve().parents[1]
WATCHDOG_PATH = IMAGE_DIRECTORY / "common/wifi/ambrosia-wifi-watchdog"
POWER_SAVE_CONFIG_PATH = IMAGE_DIRECTORY / "common/wifi/ambrosia-wifi-powersave.conf"
AUTH_RETRIES_CONFIG_PATH = (
    IMAGE_DIRECTORY / "common/wifi/ambrosia-wifi-auth-retries.conf"
)
ASSEMBLE_SCRIPT_PATH = IMAGE_DIRECTORY / "build/assemble-image.sh"
ENABLE_AUTOCONNECT_COMMAND = ["nmcli", "device", "set", "wlan0", "autoconnect", "yes"]
RESTART_NETWORK_MANAGER_COMMAND = ["systemctl", "restart", "NetworkManager"]
REBOOT_COMMAND = ["systemctl", "reboot"]
REJECTED_PASSWORD_NETWORK_MANAGER_EVENT = (
    "2026-11-27T22:43:52+0000 opi NetworkManager[928]: <info> device (wlan0): "
    "Activation: (wifi) disconnected during association, asking for new key"
)


def load_watchdog_module():
    module_loader = importlib.machinery.SourceFileLoader(
        "wifi_watchdog", str(WATCHDOG_PATH)
    )
    module_specification = importlib.util.spec_from_loader(
        module_loader.name, module_loader
    )
    watchdog_module = importlib.util.module_from_spec(module_specification)
    module_loader.exec_module(watchdog_module)
    return watchdog_module


def read_board_configuration(board_identifier):
    board_configuration = {}
    board_configuration_path = IMAGE_DIRECTORY / f"boards/{board_identifier}/board.conf"
    for configuration_line in board_configuration_path.read_text().splitlines():
        if "=" in configuration_line and not configuration_line.startswith("#"):
            configuration_key, configuration_value = configuration_line.split("=", 1)
            board_configuration[configuration_key.strip()] = configuration_value.strip(
                '"'
            )
    return board_configuration


def read_shell_function_body(shell_source, function_name):
    function_match = re.search(
        rf"^{function_name}\(\) \{{\n(.*?)^\}}\n",
        shell_source,
        re.MULTILINE | re.DOTALL,
    )
    return function_match.group(1) if function_match else ""


class WatchdogTestCase(unittest.TestCase):
    def setUp(self):
        self.watchdog_module = load_watchdog_module()
        temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(temporary_directory.cleanup)
        self.state_directory = Path(temporary_directory.name)
        self.watchdog_module.RECOVERY_LOG_PATH = (
            self.state_directory / "wifi-watchdog.log"
        )
        self.watchdog_module.WATCHDOG_STATE_PATH = (
            self.state_directory / "wifi-watchdog-state.json"
        )
        captured_output = redirect_stdout(io.StringIO())
        captured_output.__enter__()
        self.addCleanup(captured_output.__exit__, None, None, None)

    def read_recovery_log(self):
        try:
            return self.watchdog_module.RECOVERY_LOG_PATH.read_text()
        except FileNotFoundError:
            return ""


class WifiWatchdogCheckTests(WatchdogTestCase):
    def setUp(self):
        super().setUp()
        self.wifi_watchdog = self.watchdog_module.WifiWatchdog()

    def patch_link_state(
        self,
        exit_stack,
        portal_active=False,
        wifi_connected=True,
        gateway="192.168.1.1",
        other_uplink_connected=False,
        saved_wifi_connection_uuids=(),
    ):
        link_state_patches = {
            "wifi_portal_is_active": portal_active,
            "wifi_is_connected": wifi_connected,
            "find_wifi_gateway": gateway,
            "other_uplink_is_connected": other_uplink_connected,
            "find_saved_wifi_connection_uuids": list(saved_wifi_connection_uuids),
        }
        for function_name, function_result in link_state_patches.items():
            exit_stack.enter_context(
                patch.object(
                    self.watchdog_module, function_name, return_value=function_result
                )
            )

    def run_failed_checks(self, failed_check_count):
        with ExitStack() as exit_stack:
            self.patch_link_state(exit_stack)
            exit_stack.enter_context(
                patch.object(
                    self.watchdog_module, "wifi_tcp_is_healthy", return_value=False
                )
            )
            reconnect_wifi = exit_stack.enter_context(
                patch.object(self.watchdog_module, "reconnect_wifi")
            )
            for _ in range(failed_check_count):
                self.wifi_watchdog.check_once()
        return reconnect_wifi

    def test_stalled_link_reconnects_after_consecutive_failures(self):
        reconnect_wifi = self.run_failed_checks(
            self.watchdog_module.FAILED_CHECKS_BEFORE_RECONNECT
        )
        reconnect_wifi.assert_called_once_with()
        self.assertEqual(self.wifi_watchdog.consecutive_failed_checks, 0)

    def test_single_failed_check_does_not_reconnect(self):
        reconnect_wifi = self.run_failed_checks(1)
        reconnect_wifi.assert_not_called()
        self.assertEqual(self.wifi_watchdog.consecutive_failed_checks, 1)

    def test_healthy_check_resets_failure_count(self):
        self.wifi_watchdog.consecutive_failed_checks = 2
        with ExitStack() as exit_stack:
            self.patch_link_state(exit_stack)
            exit_stack.enter_context(
                patch.object(
                    self.watchdog_module, "wifi_tcp_is_healthy", return_value=True
                )
            )
            reconnect_wifi = exit_stack.enter_context(
                patch.object(self.watchdog_module, "reconnect_wifi")
            )
            self.wifi_watchdog.check_once()
        reconnect_wifi.assert_not_called()
        self.assertEqual(self.wifi_watchdog.consecutive_failed_checks, 0)

    def test_cooldown_prevents_back_to_back_reconnects(self):
        failed_checks_per_reconnect = (
            self.watchdog_module.FAILED_CHECKS_BEFORE_RECONNECT
        )
        reconnect_wifi = self.run_failed_checks(failed_checks_per_reconnect * 2)
        reconnect_wifi.assert_called_once_with()

    def test_reconnects_again_after_cooldown(self):
        self.wifi_watchdog.last_reconnect_monotonic_time = (
            self.watchdog_module.time.monotonic()
            - self.watchdog_module.RECONNECT_COOLDOWN_SECONDS
            - 1
        )
        reconnect_wifi = self.run_failed_checks(
            self.watchdog_module.FAILED_CHECKS_BEFORE_RECONNECT
        )
        reconnect_wifi.assert_called_once_with()

    def test_link_is_not_probed_or_recovered_when_it_should_be_left_alone(self):
        for link_state in (
            {"portal_active": True, "saved_wifi_connection_uuids": ["saved-uuid"]},
            {"wifi_connected": False},
            {"gateway": None},
            {
                "wifi_connected": False,
                "other_uplink_connected": True,
                "saved_wifi_connection_uuids": ["saved-uuid"],
            },
        ):
            with self.subTest(link_state=link_state):
                self.wifi_watchdog.consecutive_failed_checks = 2
                with ExitStack() as exit_stack:
                    self.patch_link_state(exit_stack, **link_state)
                    wifi_tcp_is_healthy = exit_stack.enter_context(
                        patch.object(self.watchdog_module, "wifi_tcp_is_healthy")
                    )
                    reconnect_wifi = exit_stack.enter_context(
                        patch.object(self.watchdog_module, "reconnect_wifi")
                    )
                    recover_missing_wifi = exit_stack.enter_context(
                        patch.object(self.wifi_watchdog, "recover_missing_wifi")
                    )
                    self.wifi_watchdog.check_once()
                wifi_tcp_is_healthy.assert_not_called()
                reconnect_wifi.assert_not_called()
                recover_missing_wifi.assert_not_called()
                self.assertEqual(self.wifi_watchdog.consecutive_failed_checks, 0)

    def test_missing_wifi_with_saved_network_starts_recovery(self):
        for link_state in ({"wifi_connected": False}, {"gateway": None}):
            with self.subTest(link_state=link_state):
                with ExitStack() as exit_stack:
                    self.patch_link_state(
                        exit_stack,
                        saved_wifi_connection_uuids=["saved-uuid"],
                        **link_state,
                    )
                    recover_missing_wifi = exit_stack.enter_context(
                        patch.object(self.wifi_watchdog, "recover_missing_wifi")
                    )
                    self.wifi_watchdog.check_once()
                recover_missing_wifi.assert_called_once_with(["saved-uuid"])

    def test_portal_transitions_are_recorded_once(self):
        for portal_active in (True, True, False, False):
            with ExitStack() as exit_stack:
                self.patch_link_state(
                    exit_stack, portal_active=portal_active, wifi_connected=False
                )
                self.wifi_watchdog.check_once()
        recovery_log = self.read_recovery_log()
        self.assertEqual(recovery_log.count("setup portal is active"), 1)
        self.assertEqual(recovery_log.count("setup portal is no longer active"), 1)


class WifiWatchdogRecoveryTests(WatchdogTestCase):
    SAVED_WIFI_CONNECTION_UUIDS = ["recent-uuid", "older-uuid"]

    def setUp(self):
        super().setUp()
        self.wifi_watchdog = self.watchdog_module.WifiWatchdog()
        self.current_monotonic_time = 1000.0
        self.current_unix_time = 1_800_000_000.0
        self.visible_wifi_ssids = {"ADENTRO", "Vecino"}
        self.wifi_connected = False
        exit_stack = ExitStack()
        self.addCleanup(exit_stack.close)
        patched_functions = {
            "wifi_portal_is_active": Mock(return_value=False),
            "wifi_is_connected": Mock(side_effect=lambda: self.wifi_connected),
            "find_wifi_gateway": Mock(return_value="192.168.68.1"),
            "wifi_tcp_is_healthy": Mock(return_value=True),
            "other_uplink_is_connected": Mock(return_value=False),
            "find_saved_wifi_connection_uuids": Mock(
                return_value=list(self.SAVED_WIFI_CONNECTION_UUIDS)
            ),
            "describe_wifi_device_state": Mock(
                return_value="wlan0=[30 (disconnected)]"
            ),
            "activate_saved_wifi_connections": Mock(return_value=False),
            "run_recovery_command": Mock(return_value=True),
            "scan_visible_wifi_ssids": Mock(
                side_effect=lambda: set(self.visible_wifi_ssids)
            ),
            "read_saved_wifi_ssid": Mock(return_value="ADENTRO"),
            "read_wifi_driver_kernel_messages": Mock(
                return_value=["sprdwl: cmd timeout"]
            ),
            "read_recent_network_manager_events": Mock(
                return_value=[REJECTED_PASSWORD_NETWORK_MANAGER_EVENT]
            ),
        }
        for function_name, function_mock in patched_functions.items():
            exit_stack.enter_context(
                patch.object(self.watchdog_module, function_name, function_mock)
            )
        self.activate_saved_wifi_connections = patched_functions[
            "activate_saved_wifi_connections"
        ]
        self.run_recovery_command = patched_functions["run_recovery_command"]
        self.scan_visible_wifi_ssids = patched_functions["scan_visible_wifi_ssids"]
        exit_stack.enter_context(
            patch.object(
                self.watchdog_module.time,
                "monotonic",
                side_effect=lambda: self.current_monotonic_time,
            )
        )
        exit_stack.enter_context(
            patch.object(
                self.watchdog_module.time,
                "time",
                side_effect=lambda: self.current_unix_time,
            )
        )
        self.episode_start_monotonic_time = self.current_monotonic_time
        self.episode_start_unix_time = self.current_unix_time

    def run_checks_until(self, seconds_without_network):
        for elapsed_seconds in range(
            0, seconds_without_network + 1, self.watchdog_module.CHECK_INTERVAL_SECONDS
        ):
            self.current_monotonic_time = (
                self.episode_start_monotonic_time + elapsed_seconds
            )
            self.current_unix_time = self.episode_start_unix_time + elapsed_seconds
            self.wifi_watchdog.check_once()

    def recovery_command_calls(self, command_arguments):
        return [
            recovery_call
            for recovery_call in self.run_recovery_command.call_args_list
            if recovery_call.args[1] == command_arguments
        ]

    def test_waits_through_the_grace_period_without_acting(self):
        self.run_checks_until(self.watchdog_module.NO_NETWORK_GRACE_SECONDS - 1)
        self.activate_saved_wifi_connections.assert_not_called()
        self.run_recovery_command.assert_not_called()

    def test_reactivates_saved_wifi_after_grace_period_and_then_periodically(self):
        self.run_checks_until(359)
        self.assertEqual(
            self.activate_saved_wifi_connections.call_args_list,
            [
                call(self.SAVED_WIFI_CONNECTION_UUIDS),
                call(self.SAVED_WIFI_CONNECTION_UUIDS),
            ],
        )
        self.run_recovery_command.assert_not_called()

    def test_restarts_network_manager_once_per_episode(self):
        self.run_checks_until(self.watchdog_module.REBOOT_AFTER_SECONDS - 1)
        self.assertEqual(
            len(self.recovery_command_calls(RESTART_NETWORK_MANAGER_COMMAND)), 1
        )
        self.assertEqual(self.recovery_command_calls(REBOOT_COMMAND), [])

    def test_reboots_when_saved_wifi_is_visible_and_records_why(self):
        self.run_checks_until(1020)
        self.assertEqual(len(self.recovery_command_calls(REBOOT_COMMAND)), 1)
        watchdog_state = json.loads(
            self.watchdog_module.WATCHDOG_STATE_PATH.read_text()
        )
        self.assertGreaterEqual(
            watchdog_state["last_reboot_unix_time"],
            self.episode_start_unix_time + self.watchdog_module.REBOOT_AFTER_SECONDS,
        )
        self.assertIs(watchdog_state["watchdog_reboot_pending"], True)
        recovery_log = self.read_recovery_log()
        self.assertIn("saved network visible: True", recovery_log)
        self.assertIn("Kernel: sprdwl: cmd timeout", recovery_log)

    def test_failed_reboot_command_clears_the_pending_reboot(self):
        self.run_recovery_command.side_effect = (
            lambda _action_description, command_arguments, timeout_seconds: (
                command_arguments != REBOOT_COMMAND
            )
        )
        self.run_checks_until(1020)
        watchdog_state = json.loads(
            self.watchdog_module.WATCHDOG_STATE_PATH.read_text()
        )
        self.assertIs(watchdog_state["watchdog_reboot_pending"], False)
        self.assertIn("last_reboot_unix_time", watchdog_state)

    def test_reboot_without_recent_driver_messages_says_so(self):
        self.watchdog_module.read_wifi_driver_kernel_messages.return_value = []
        self.run_checks_until(1020)
        self.assertIn(
            "Kernel: no Wi-Fi driver messages in the last 300s.",
            self.read_recovery_log(),
        )

    def test_reboots_when_the_scan_finds_no_networks(self):
        self.visible_wifi_ssids = set()
        self.run_checks_until(1020)
        self.assertEqual(len(self.recovery_command_calls(REBOOT_COMMAND)), 1)

    def test_does_not_reboot_when_only_other_networks_are_visible(self):
        self.visible_wifi_ssids = {"Vecino"}
        self.run_checks_until(1500)
        self.assertEqual(self.recovery_command_calls(REBOOT_COMMAND), [])
        self.assertGreater(self.activate_saved_wifi_connections.call_count, 5)
        self.assertEqual(self.read_recovery_log().count("Not rebooting"), 1)

    def test_does_not_reboot_within_an_hour_of_the_last_watchdog_reboot(self):
        self.watchdog_module.WATCHDOG_STATE_PATH.write_text(
            json.dumps({"last_reboot_unix_time": self.current_unix_time - 600})
        )
        self.run_checks_until(1500)
        self.assertEqual(self.recovery_command_calls(REBOOT_COMMAND), [])
        self.scan_visible_wifi_ssids.assert_not_called()
        self.assertIn("within the last hour", self.read_recovery_log())

    def test_reboots_again_after_an_hour_since_the_last_watchdog_reboot(self):
        self.watchdog_module.WATCHDOG_STATE_PATH.write_text(
            json.dumps({"last_reboot_unix_time": self.current_unix_time - 3600})
        )
        self.run_checks_until(1020)
        self.assertEqual(len(self.recovery_command_calls(REBOOT_COMMAND)), 1)

    def test_does_not_reboot_when_the_reboot_time_cannot_be_saved(self):
        with patch.object(
            self.watchdog_module,
            "record_watchdog_reboot_request",
            return_value=False,
        ):
            self.run_checks_until(1020)
        self.assertEqual(self.recovery_command_calls(REBOOT_COMMAND), [])

    def finish_episode_after(self, seconds_without_network):
        self.run_checks_until(seconds_without_network)
        self.wifi_connected = True
        self.current_monotonic_time += self.watchdog_module.CHECK_INTERVAL_SECONDS
        self.wifi_watchdog.check_once()
        return self.read_recovery_log()

    def test_episode_start_is_recorded_on_the_first_check_without_network(self):
        self.wifi_watchdog.check_once()
        recovery_log = self.read_recovery_log()
        self.assertIn(
            "Wi-Fi has no network; recovery episode started. wlan0=[30 (disconnected)]",
            recovery_log,
        )
        self.assertIn(
            f"NetworkManager: {REJECTED_PASSWORD_NETWORK_MANAGER_EVENT}", recovery_log
        )

    def test_network_manager_events_are_recorded_again_before_a_reboot(self):
        self.run_checks_until(1020)
        self.assertEqual(
            self.read_recovery_log().count(
                f"NetworkManager: {REJECTED_PASSWORD_NETWORK_MANAGER_EVENT}"
            ),
            2,
        )

    def test_short_episode_records_that_no_watchdog_action_was_needed(self):
        recovery_log = self.finish_episode_after(0)
        self.assertIn(
            "No-network episode ended after 30s: wlan0 is connected with a default "
            "route; NetworkManager reconnected without any watchdog action.",
            recovery_log,
        )
        self.assertIsNone(self.wifi_watchdog.no_network_started_monotonic_time)

    def test_episode_resolved_by_a_successful_reactivation_names_it(self):
        self.activate_saved_wifi_connections.return_value = True
        recovery_log = self.finish_episode_after(150)
        self.assertIn(
            "No-network episode ended after 180s: wlan0 is connected with a default "
            "route; resolved by the saved Wi-Fi reactivation 60s earlier.",
            recovery_log,
        )

    def test_episode_after_a_failed_reactivation_is_not_credited_to_it(self):
        recovery_log = self.finish_episode_after(150)
        self.assertIn(
            "came back 60s after a failed saved Wi-Fi reactivation, "
            "with no watchdog action confirmed as the fix.",
            recovery_log,
        )

    def test_episode_after_network_manager_restart_credits_the_restart(self):
        self.activate_saved_wifi_connections.return_value = False
        recovery_log = self.finish_episode_after(510)
        self.assertIn(
            "No-network episode ended after 540s: wlan0 is connected with a default "
            "route; resolved by the NetworkManager restart 60s earlier.",
            recovery_log,
        )

    def test_episode_taken_over_by_the_portal_has_no_resolution(self):
        self.run_checks_until(150)
        self.current_monotonic_time += self.watchdog_module.CHECK_INTERVAL_SECONDS
        with patch.object(
            self.watchdog_module, "wifi_portal_is_active", return_value=True
        ):
            self.wifi_watchdog.check_once()
        recovery_log = self.read_recovery_log()
        self.assertIn(
            "No-network episode ended after 180s: the Wi-Fi setup portal took over.",
            recovery_log,
        )
        self.assertNotIn("resolved by", recovery_log)


class WifiWatchdogStartTests(WatchdogTestCase):
    CURRENT_UNIX_TIME = 1_800_000_000.0

    def record_start(self, seconds_since_last_reboot, watchdog_reboot_pending):
        if seconds_since_last_reboot is not None:
            self.watchdog_module.WATCHDOG_STATE_PATH.write_text(
                json.dumps(
                    {
                        "last_reboot_unix_time": self.CURRENT_UNIX_TIME
                        - seconds_since_last_reboot,
                        "watchdog_reboot_pending": watchdog_reboot_pending,
                    }
                )
            )
        with patch.object(
            self.watchdog_module.time, "time", return_value=self.CURRENT_UNIX_TIME
        ):
            self.watchdog_module.record_watchdog_start()
        return self.read_recovery_log().rstrip()

    def read_watchdog_reboot_pending(self):
        return self.watchdog_module.read_watchdog_state().get("watchdog_reboot_pending")

    def test_start_after_a_watchdog_reboot_says_so_and_clears_the_mark(self):
        recovery_log = self.record_start(70, watchdog_reboot_pending=True)
        self.assertTrue(
            recovery_log.endswith("Wi-Fi watchdog started 70s after a watchdog reboot.")
        )
        self.assertIs(self.read_watchdog_reboot_pending(), False)
        self.assertEqual(
            self.watchdog_module.read_last_watchdog_reboot_unix_time(),
            self.CURRENT_UNIX_TIME - 70,
        )

    def test_start_after_a_power_cut_soon_after_a_watchdog_reboot_is_plain(self):
        recovery_log = self.record_start(853, watchdog_reboot_pending=False)
        self.assertTrue(recovery_log.endswith("Wi-Fi watchdog started."))
        self.assertNotIn("after a watchdog reboot", recovery_log)

    def test_start_without_any_watchdog_reboot_is_plain(self):
        recovery_log = self.record_start(None, watchdog_reboot_pending=None)
        self.assertTrue(recovery_log.endswith("Wi-Fi watchdog started."))

    def test_start_after_a_watchdog_reboot_with_an_unreliable_clock_omits_seconds(
        self,
    ):
        for seconds_since_last_reboot in (-300, 7200):
            with self.subTest(seconds_since_last_reboot=seconds_since_last_reboot):
                self.watchdog_module.RECOVERY_LOG_PATH.unlink(missing_ok=True)
                recovery_log = self.record_start(
                    seconds_since_last_reboot, watchdog_reboot_pending=True
                )
                self.assertTrue(
                    recovery_log.endswith(
                        "Wi-Fi watchdog started after a watchdog reboot."
                    )
                )


class WifiWatchdogNetworkQueryTests(WatchdogTestCase):
    def test_saved_wifi_connections_are_ordered_by_last_activation(self):
        connection_list = (
            "eth-uuid:802-3-ethernet:yes:1800000300\n"
            "manual-uuid:802-11-wireless:no:1800000200\n"
            "older-uuid:802-11-wireless:yes:1800000100\n"
            "never-uuid:802-11-wireless:yes:0\n"
            "recent-uuid:802-11-wireless:yes:1800000200\n"
            "malformed line\n"
        )
        with patch.object(
            self.watchdog_module,
            "run_command",
            return_value=Mock(stdout=connection_list),
        ):
            self.assertEqual(
                self.watchdog_module.find_saved_wifi_connection_uuids(),
                ["recent-uuid", "older-uuid", "never-uuid"],
            )

    def test_scan_returns_unescaped_ssids(self):
        with patch.object(
            self.watchdog_module,
            "run_command",
            return_value=Mock(returncode=0, stdout="ADENTRO\nCafe\\:Bar\n\n"),
        ):
            self.assertEqual(
                self.watchdog_module.scan_visible_wifi_ssids(), {"ADENTRO", "Cafe:Bar"}
            )

    def test_failed_scan_returns_no_networks(self):
        with patch.object(
            self.watchdog_module,
            "run_command",
            return_value=Mock(returncode=10, stdout=""),
        ):
            self.assertEqual(self.watchdog_module.scan_visible_wifi_ssids(), set())

    def test_reboot_can_help_only_when_saved_wifi_is_visible_or_nothing_is(self):
        scan_suggests_reboot_can_help = (
            self.watchdog_module.scan_suggests_reboot_can_help
        )
        self.assertTrue(scan_suggests_reboot_can_help({"ADENTRO"}, set()))
        self.assertTrue(scan_suggests_reboot_can_help({"ADENTRO"}, {"ADENTRO", "X"}))
        self.assertFalse(scan_suggests_reboot_can_help({"ADENTRO"}, {"Vecino"}))

    def test_other_uplink_ignores_wlan0(self):
        for device_list, other_uplink_expected in (
            ("wlan0:wifi:connected\neth0:ethernet:unavailable\n", False),
            ("wlan0:wifi:disconnected\neth0:ethernet:connected\n", True),
            ("wlan0:wifi:disconnected\nwlan1:wifi:connected\n", True),
        ):
            with (
                self.subTest(device_list=device_list),
                patch.object(
                    self.watchdog_module,
                    "run_command",
                    return_value=Mock(stdout=device_list),
                ),
            ):
                self.assertEqual(
                    self.watchdog_module.other_uplink_is_connected(),
                    other_uplink_expected,
                )

    def test_missing_or_corrupt_state_has_no_previous_reboot(self):
        self.assertIsNone(self.watchdog_module.read_last_watchdog_reboot_unix_time())
        self.watchdog_module.WATCHDOG_STATE_PATH.write_text("{not json")
        self.assertIsNone(self.watchdog_module.read_last_watchdog_reboot_unix_time())
        self.watchdog_module.WATCHDOG_STATE_PATH.write_text('{"other": 1}')
        self.assertIsNone(self.watchdog_module.read_last_watchdog_reboot_unix_time())

    def test_reboot_request_is_read_back_as_pending(self):
        self.assertTrue(
            self.watchdog_module.record_watchdog_reboot_request(1_800_000_000.0)
        )
        self.assertEqual(
            self.watchdog_module.read_last_watchdog_reboot_unix_time(), 1_800_000_000.0
        )
        self.assertIs(
            self.watchdog_module.read_watchdog_state()["watchdog_reboot_pending"], True
        )

    def test_non_object_state_is_treated_as_empty(self):
        self.watchdog_module.WATCHDOG_STATE_PATH.write_text("[1, 2]")
        self.assertEqual(self.watchdog_module.read_watchdog_state(), {})
        self.assertIsNone(self.watchdog_module.read_last_watchdog_reboot_unix_time())

    def test_only_recent_wifi_driver_kernel_messages_are_kept(self):
        kernel_log = "\n".join(
            [
                "[    9.105498] sprdwl:mac_addr:54:ae:bc:66:3f:16",
                "[  238.784693] IPv6: ADDRCONF(NETDEV_CHANGE): wlan0: link becomes ready",
                "[ 1530.063748] sprdwl:sprdwl_fc_add_share_credit, 533, mode:1 closed",
                "[ 2400.000000] usb 1-1: new high-speed USB device",
                "[ 2410.500000] WCN: marlin power state:4",
                "continuation line without a timestamp sprdwl",
            ]
        )
        with (
            patch.object(self.watchdog_module.time, "monotonic", return_value=2575.0),
            patch.object(
                self.watchdog_module,
                "run_command",
                return_value=Mock(stdout=kernel_log),
            ),
        ):
            self.assertEqual(
                self.watchdog_module.read_wifi_driver_kernel_messages(),
                ["[ 2410.500000] WCN: marlin power state:4"],
            )

    def test_unreadable_kernel_log_does_not_stop_the_reboot(self):
        with patch.object(
            self.watchdog_module,
            "run_command",
            side_effect=FileNotFoundError("dmesg"),
        ):
            self.watchdog_module.record_recent_wifi_driver_kernel_messages()
        self.assertIn(
            "Could not read the kernel log: FileNotFoundError", self.read_recovery_log()
        )

    def test_activation_tries_each_saved_wifi_until_one_connects(self):
        with patch.object(
            self.watchdog_module,
            "run_command",
            side_effect=[
                Mock(returncode=0, stdout="", stderr=""),
                Mock(returncode=4, stdout="", stderr="Error: secrets were required"),
                Mock(returncode=0, stdout="", stderr=""),
            ],
        ) as run_command:
            self.assertTrue(
                self.watchdog_module.activate_saved_wifi_connections(
                    ["recent-uuid", "older-uuid"]
                )
            )
        self.assertEqual(
            run_command.call_args_list[0].args[0], ENABLE_AUTOCONNECT_COMMAND
        )
        self.assertEqual(
            [
                activation_call.args[0][-4:-2]
                for activation_call in run_command.call_args_list[1:]
            ],
            [["uuid", "recent-uuid"], ["uuid", "older-uuid"]],
        )
        recovery_log = self.read_recovery_log()
        self.assertIn("Re-enabling wlan0 autoconnect succeeded.", recovery_log)
        self.assertIn("secrets were required", recovery_log)
        self.assertIn("Activating saved Wi-Fi older-uuid succeeded.", recovery_log)

    def test_activation_timeout_moves_on_to_the_next_saved_wifi(self):
        with patch.object(
            self.watchdog_module,
            "run_command",
            side_effect=[
                Mock(returncode=0, stdout="", stderr=""),
                subprocess.TimeoutExpired(["nmcli"], 60),
                subprocess.TimeoutExpired(["nmcli"], 60),
            ],
        ):
            self.assertFalse(
                self.watchdog_module.activate_saved_wifi_connections(
                    ["recent-uuid", "older-uuid"]
                )
            )

    def read_network_manager_events_at(self, current_monotonic_seconds, journal_lines):
        with (
            patch.object(
                self.watchdog_module.time,
                "monotonic",
                return_value=current_monotonic_seconds,
            ),
            patch.object(
                self.watchdog_module,
                "run_command",
                return_value=Mock(stdout="\n".join(journal_lines)),
            ) as run_command,
        ):
            network_manager_events = (
                self.watchdog_module.read_recent_network_manager_events()
            )
        return network_manager_events, run_command.call_args.args[0]

    def test_only_recent_wlan0_events_that_explain_the_outage_are_kept(self):
        journal_lines = [
            "[  117.600001] opi NetworkManager[1341]: <info>  [1795820517.6076] "
            "device (wlan0): state change: config -> need-auth (reason 'none')",
            "[ 1100.465500] opi NetworkManager[1341]: <info>  [1795821607.4655] "
            "device (wlan0): supplicant interface state: completed -> disconnected",
            "[ 1100.465700] opi NetworkManager[1341]: <info>  [1795821607.4657] "
            "device (p2p-dev-wlan0): supplicant management interface state: "
            "4way_handshake -> disconnected",
            "[ 1110.100000] opi NetworkManager[1341]: <info>  [1795821610.1000] "
            "dhcp4 (wlan0): state changed new lease",
            "[ 1113.332000] opi NetworkManager[1341]: <info>  [1795821620.3320] "
            "device (wlan0): supplicant interface state: 4way_handshake -> disconnected",
            "[ 1113.332400] opi NetworkManager[1341]: <info>  [1795821620.3324] "
            "device (wlan0): Activation: (wifi) disconnected during association, "
            "asking for new key",
            "[ 1113.431700] opi NetworkManager[1341]: <warn>  [1795821620.4317] "
            "device (wlan0): no secrets: No agents were available for this request.",
            "[ 1113.431900] opi NetworkManager[1341]: <info>  [1795821620.4319] "
            "device (wlan0): state change: need-auth -> failed (reason 'no-secrets')",
            "-- Boot 791e0dd041174bfea6f3bbb456cd70b2 --",
        ]
        network_manager_events, journal_command = self.read_network_manager_events_at(
            1120.0, journal_lines
        )
        self.assertEqual(
            [
                network_manager_event.split("device (wlan0): ", 1)[1]
                for network_manager_event in network_manager_events
            ],
            [
                "supplicant interface state: 4way_handshake -> disconnected",
                "Activation: (wifi) disconnected during association, asking for new key",
                "no secrets: No agents were available for this request.",
                "state change: need-auth -> failed (reason 'no-secrets')",
            ],
        )
        self.assertTrue(network_manager_events[0].startswith("[ 1113.332000] opi"))
        self.assertIn("--boot", journal_command)
        self.assertEqual(
            journal_command[journal_command.index("--output") + 1], "short-monotonic"
        )

    def test_only_the_latest_network_manager_events_are_kept(self):
        event_limit = self.watchdog_module.NETWORK_MANAGER_EVENT_LIMIT
        journal_lines = [
            f"[ {900 + line_number}.000000] opi NetworkManager[1341]: <warn> "
            f"device (wlan0): Activation: failed for connection {line_number}"
            for line_number in range(event_limit + 5)
        ]
        network_manager_events, _journal_command = self.read_network_manager_events_at(
            1000.0, journal_lines
        )
        self.assertEqual(len(network_manager_events), event_limit)
        self.assertTrue(
            network_manager_events[-1].endswith(f"connection {event_limit + 4}")
        )

    def test_nmcli_notices_are_left_out_of_the_recorded_error(self):
        nmcli_error_output = (
            "Warning: password for '802-11-wireless-security.psk' not given in "
            "'passwd-file' and nmcli cannot ask without '--ask' option.\n"
            "Error: Connection activation failed: Secrets were required, but not "
            "provided\n"
            "Hint: use 'journalctl -xe NM_CONNECTION=a1aae163 + NM_DEVICE=wlan0' "
            "to get more details.\n"
        )
        self.assertEqual(
            self.watchdog_module.summarize_command_error(
                Mock(stderr=nmcli_error_output, stdout="")
            ),
            "Error: Connection activation failed: Secrets were required, but not "
            "provided",
        )

    def test_error_made_only_of_notices_is_still_recorded(self):
        self.assertEqual(
            self.watchdog_module.summarize_command_error(
                Mock(stderr="Warning: something odd happened\n", stdout="")
            ),
            "Warning: something odd happened",
        )

    def test_unreadable_network_manager_journal_does_not_stop_recovery(self):
        with patch.object(
            self.watchdog_module,
            "run_command",
            side_effect=FileNotFoundError("journalctl"),
        ):
            self.watchdog_module.record_recent_network_manager_events()
        self.assertIn(
            "Could not read the NetworkManager journal: FileNotFoundError",
            self.read_recovery_log(),
        )


class WifiWatchdogRecoveryLogTests(WatchdogTestCase):
    def test_event_is_appended_and_synced_to_disk(self):
        with patch.object(
            self.watchdog_module.os, "fsync", wraps=self.watchdog_module.os.fsync
        ) as fsync:
            self.watchdog_module.record_recovery_event("first event")
            self.watchdog_module.record_recovery_event("second event")
        recovery_log_lines = self.read_recovery_log().splitlines()
        self.assertEqual(len(recovery_log_lines), 2)
        self.assertTrue(recovery_log_lines[0].endswith("first event"))
        self.assertRegex(
            recovery_log_lines[1], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ monotonic=\d+s "
        )
        self.assertEqual(fsync.call_count, 2)

    def test_full_log_is_rotated(self):
        recovery_log_path = self.watchdog_module.RECOVERY_LOG_PATH
        recovery_log_path.write_text("x" * self.watchdog_module.RECOVERY_LOG_MAX_BYTES)
        self.watchdog_module.record_recovery_event("after rotation")
        rotated_recovery_log_path = recovery_log_path.with_name("wifi-watchdog.log.1")
        self.assertEqual(
            rotated_recovery_log_path.stat().st_size,
            self.watchdog_module.RECOVERY_LOG_MAX_BYTES,
        )
        self.assertEqual(len(self.read_recovery_log().splitlines()), 1)
        self.assertIn("after rotation", self.read_recovery_log())

    def test_unwritable_log_does_not_stop_the_watchdog(self):
        blocking_file_path = self.state_directory / "not-a-directory"
        blocking_file_path.write_text("")
        self.watchdog_module.RECOVERY_LOG_PATH = blocking_file_path / "wifi.log"
        self.watchdog_module.record_recovery_event("still running")


class WifiWatchdogProbeTests(WatchdogTestCase):
    def probe_with_connect_result(self, connect_side_effect):
        probe_socket = Mock()
        probe_socket.connect.side_effect = connect_side_effect
        with patch.object(
            self.watchdog_module.socket, "socket", return_value=probe_socket
        ):
            probe_answered = self.watchdog_module.tcp_answers_over_wifi(
                "192.168.1.1", 80
            )
        probe_socket.setsockopt.assert_called_once_with(
            self.watchdog_module.socket.SOL_SOCKET,
            self.watchdog_module.SOCKET_BIND_TO_DEVICE_OPTION,
            b"wlan0",
        )
        probe_socket.close.assert_called_once_with()
        return probe_answered

    def test_accepted_connection_counts_as_tcp_answer(self):
        self.assertTrue(self.probe_with_connect_result(None))

    def test_refused_connection_counts_as_tcp_answer(self):
        self.assertTrue(self.probe_with_connect_result(ConnectionRefusedError()))

    def test_timed_out_connection_is_not_a_tcp_answer(self):
        self.assertFalse(self.probe_with_connect_result(TimeoutError()))

    def test_link_is_healthy_when_any_target_answers(self):
        with patch.object(
            self.watchdog_module,
            "tcp_answers_over_wifi",
            side_effect=lambda probe_address, _probe_port: probe_address == "9.9.9.9",
        ):
            self.assertTrue(self.watchdog_module.wifi_tcp_is_healthy("192.168.1.1"))

    def test_link_is_stalled_when_no_target_answers(self):
        with patch.object(
            self.watchdog_module, "tcp_answers_over_wifi", return_value=False
        ) as tcp_answers_over_wifi:
            self.assertFalse(self.watchdog_module.wifi_tcp_is_healthy("192.168.1.1"))
        probed_addresses = {
            probe_call.args[0] for probe_call in tcp_answers_over_wifi.call_args_list
        }
        self.assertIn("192.168.1.1", probed_addresses)

    def test_gateway_is_read_from_wifi_default_route(self):
        route_output = (
            "default via 192.168.100.1 proto dhcp src 192.168.100.64 metric 600\n"
        )
        with patch.object(
            self.watchdog_module,
            "run_command",
            return_value=Mock(stdout=route_output),
        ):
            self.assertEqual(self.watchdog_module.find_wifi_gateway(), "192.168.100.1")

    def test_missing_default_route_has_no_gateway(self):
        with patch.object(
            self.watchdog_module, "run_command", return_value=Mock(stdout="")
        ):
            self.assertIsNone(self.watchdog_module.find_wifi_gateway())

    def test_reconnect_cycles_wlan0_through_network_manager(self):
        with (
            patch.object(self.watchdog_module.time, "sleep"),
            patch.object(
                self.watchdog_module, "run_command", return_value=Mock(returncode=0)
            ) as run_command,
        ):
            self.watchdog_module.reconnect_wifi()
        self.assertEqual(
            run_command.call_args_list,
            [
                call(["nmcli", "device", "disconnect", "wlan0"], timeout_seconds=15),
                call(["nmcli", "device", "connect", "wlan0"], timeout_seconds=45),
            ],
        )
        self.assertIn("Wi-Fi reconnect succeeded.", self.read_recovery_log())

    def test_failed_reconnect_reenables_autoconnect(self):
        with (
            patch.object(self.watchdog_module.time, "sleep"),
            patch.object(
                self.watchdog_module,
                "run_command",
                return_value=Mock(returncode=4, stdout="", stderr="Error: timeout"),
            ) as run_command,
        ):
            self.watchdog_module.reconnect_wifi()
        self.assertEqual(
            run_command.call_args_list[-1],
            call(ENABLE_AUTOCONNECT_COMMAND, timeout_seconds=15),
        )
        self.assertIn(
            "Wi-Fi reconnect failed: Error: timeout", self.read_recovery_log()
        )

    def test_reconnect_timeout_does_not_stop_the_watchdog(self):
        with (
            patch.object(self.watchdog_module.time, "sleep"),
            patch.object(
                self.watchdog_module,
                "run_command",
                side_effect=subprocess.TimeoutExpired(["nmcli"], 15),
            ) as run_command,
        ):
            self.watchdog_module.reconnect_wifi()
        self.assertEqual(
            run_command.call_args_list[-1],
            call(ENABLE_AUTOCONNECT_COMMAND, timeout_seconds=15),
        )


class BoardWifiWorkaroundTests(unittest.TestCase):
    def test_orange_pi_enables_wifi_workarounds(self):
        board_configuration = read_board_configuration("opi-zero-2w")
        self.assertEqual(board_configuration.get("WIFI_POWER_SAVE_DISABLED"), "true")
        self.assertEqual(board_configuration.get("WIFI_STALL_WATCHDOG_ENABLED"), "true")

    def test_raspberry_pi_keeps_default_wifi_behavior(self):
        board_configuration = read_board_configuration("rpi-zero-2w")
        self.assertNotEqual(board_configuration.get("WIFI_POWER_SAVE_DISABLED"), "true")
        self.assertNotEqual(
            board_configuration.get("WIFI_STALL_WATCHDOG_ENABLED"), "true"
        )

    def test_power_save_config_disables_network_manager_power_save(self):
        self.assertIn("wifi.powersave = 2", POWER_SAVE_CONFIG_PATH.read_text())

    def test_auth_retries_config_retries_authentication_indefinitely(self):
        auth_retries_configuration = AUTH_RETRIES_CONFIG_PATH.read_text().splitlines()
        self.assertEqual(
            auth_retries_configuration, ["[connection]", "connection.auth-retries=0"]
        )

    def test_assembler_installs_and_verifies_auth_retries_for_every_board(self):
        assemble_script_source = ASSEMBLE_SCRIPT_PATH.read_text()
        installed_auth_retries_config = (
            "/etc/NetworkManager/conf.d/ambrosia-wifi-auth-retries.conf"
        )
        self.assertIn(
            installed_auth_retries_config,
            read_shell_function_body(assemble_script_source, "install_repo_assets"),
        )
        self.assertNotIn(
            installed_auth_retries_config,
            read_shell_function_body(
                assemble_script_source, "install_board_wifi_workarounds"
            ),
        )
        verification_body = read_shell_function_body(
            assemble_script_source, "verify_mounted_image"
        )
        self.assertIn(
            f'require_nonempty_file "$ROOTFS_MNT{installed_auth_retries_config}"',
            verification_body,
        )
        self.assertIn("connection\\.auth-retries=0", verification_body)

    def test_assembler_installs_enables_and_verifies_watchdog(self):
        assemble_script_source = ASSEMBLE_SCRIPT_PATH.read_text()
        self.assertIn("install_board_wifi_workarounds\n", assemble_script_source)
        self.assertIn("enable ambrosia-wifi-watchdog.service", assemble_script_source)
        self.assertIn(
            "is-enabled ambrosia-wifi-watchdog.service", assemble_script_source
        )


if __name__ == "__main__":
    unittest.main()
