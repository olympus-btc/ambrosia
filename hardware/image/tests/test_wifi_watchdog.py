"""Test the Wi-Fi stall watchdog with all device commands mocked."""

import importlib.machinery
import importlib.util
import io
import subprocess
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import Mock, call, patch

IMAGE_DIRECTORY = Path(__file__).resolve().parents[1]
WATCHDOG_PATH = IMAGE_DIRECTORY / "common/wifi/ambrosia-wifi-watchdog"
POWER_SAVE_CONFIG_PATH = IMAGE_DIRECTORY / "common/wifi/ambrosia-wifi-powersave.conf"
ASSEMBLE_SCRIPT_PATH = IMAGE_DIRECTORY / "build/assemble-image.sh"


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


class WifiWatchdogCheckTests(unittest.TestCase):
    def setUp(self):
        self.watchdog_module = load_watchdog_module()
        self.wifi_watchdog = self.watchdog_module.WifiWatchdog()

    def patch_link_state(
        self, portal_active=False, wifi_connected=True, gateway="192.168.1.1"
    ):
        return (
            patch.object(
                self.watchdog_module,
                "wifi_portal_is_active",
                return_value=portal_active,
            ),
            patch.object(
                self.watchdog_module, "wifi_is_connected", return_value=wifi_connected
            ),
            patch.object(
                self.watchdog_module, "find_wifi_gateway", return_value=gateway
            ),
        )

    def run_failed_checks(self, failed_check_count):
        portal_patch, connected_patch, gateway_patch = self.patch_link_state()
        with (
            portal_patch,
            connected_patch,
            gateway_patch,
            patch.object(
                self.watchdog_module, "wifi_tcp_is_healthy", return_value=False
            ),
            patch.object(self.watchdog_module, "reconnect_wifi") as reconnect_wifi,
            redirect_stdout(io.StringIO()),
        ):
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
        portal_patch, connected_patch, gateway_patch = self.patch_link_state()
        with (
            portal_patch,
            connected_patch,
            gateway_patch,
            patch.object(
                self.watchdog_module, "wifi_tcp_is_healthy", return_value=True
            ),
            patch.object(self.watchdog_module, "reconnect_wifi") as reconnect_wifi,
        ):
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

    def test_link_is_not_probed_when_it_should_be_left_alone(self):
        for link_state in (
            {"portal_active": True},
            {"wifi_connected": False},
            {"gateway": None},
        ):
            with self.subTest(link_state=link_state):
                self.wifi_watchdog.consecutive_failed_checks = 2
                portal_patch, connected_patch, gateway_patch = self.patch_link_state(
                    **link_state
                )
                with (
                    portal_patch,
                    connected_patch,
                    gateway_patch,
                    patch.object(
                        self.watchdog_module, "wifi_tcp_is_healthy"
                    ) as wifi_tcp_is_healthy,
                    patch.object(
                        self.watchdog_module, "reconnect_wifi"
                    ) as reconnect_wifi,
                ):
                    self.wifi_watchdog.check_once()
                wifi_tcp_is_healthy.assert_not_called()
                reconnect_wifi.assert_not_called()
                self.assertEqual(self.wifi_watchdog.consecutive_failed_checks, 0)


class WifiWatchdogProbeTests(unittest.TestCase):
    def setUp(self):
        self.watchdog_module = load_watchdog_module()

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
            redirect_stdout(io.StringIO()),
        ):
            self.watchdog_module.reconnect_wifi()
        self.assertEqual(
            run_command.call_args_list,
            [
                call(["nmcli", "device", "disconnect", "wlan0"], timeout_seconds=15),
                call(["nmcli", "device", "connect", "wlan0"], timeout_seconds=45),
            ],
        )

    def test_reconnect_timeout_does_not_stop_the_watchdog(self):
        with (
            patch.object(self.watchdog_module.time, "sleep"),
            patch.object(
                self.watchdog_module,
                "run_command",
                side_effect=subprocess.TimeoutExpired(["nmcli"], 15),
            ),
            redirect_stdout(io.StringIO()),
        ):
            self.watchdog_module.reconnect_wifi()


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

    def test_assembler_installs_enables_and_verifies_watchdog(self):
        assemble_script_source = ASSEMBLE_SCRIPT_PATH.read_text()
        self.assertIn("install_board_wifi_workarounds\n", assemble_script_source)
        self.assertIn("enable ambrosia-wifi-watchdog.service", assemble_script_source)
        self.assertIn(
            "is-enabled ambrosia-wifi-watchdog.service", assemble_script_source
        )


if __name__ == "__main__":
    unittest.main()
