"""Test the journald settings installed for boards that keep /var/log in RAM."""

import re
import unittest
from pathlib import Path

IMAGE_DIRECTORY = Path(__file__).resolve().parents[1]
JOURNALD_DIRECTORY = IMAGE_DIRECTORY / "common/journald"
COMMON_JOURNALD_CONFIG_NAME = "ambrosia-journald.conf"
RAM_LOG_JOURNALD_CONFIG_NAME = "ambrosia-ramlog-journald.conf"
ASSEMBLE_SCRIPT_PATH = IMAGE_DIRECTORY / "build/assemble-image.sh"


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


class RamLogJournaldSettingsTests(unittest.TestCase):
    def test_orange_pi_lowers_the_journal_free_space_reserve(self):
        self.assertEqual(
            read_board_configuration("opi-zero-2w").get("JOURNAL_STORED_IN_RAM"), "true"
        )

    def test_raspberry_pi_keeps_the_common_journal_reserve(self):
        self.assertNotEqual(
            read_board_configuration("rpi-zero-2w").get("JOURNAL_STORED_IN_RAM"), "true"
        )

    def test_ram_log_config_reserves_less_than_the_ram_backed_log_size(self):
        self.assertEqual(
            (JOURNALD_DIRECTORY / RAM_LOG_JOURNALD_CONFIG_NAME)
            .read_text()
            .splitlines(),
            ["[Journal]", "SystemKeepFree=5M"],
        )

    def test_ram_log_config_is_read_after_the_common_config(self):
        self.assertEqual(
            sorted([RAM_LOG_JOURNALD_CONFIG_NAME, COMMON_JOURNALD_CONFIG_NAME]),
            [COMMON_JOURNALD_CONFIG_NAME, RAM_LOG_JOURNALD_CONFIG_NAME],
        )

    def test_assembler_installs_and_verifies_the_ram_log_config_only_when_enabled(self):
        assemble_script_source = ASSEMBLE_SCRIPT_PATH.read_text()
        installation_body = read_shell_function_body(
            assemble_script_source, "install_board_journal_settings"
        )
        self.assertIn("if board_stores_journal_in_ram; then", installation_body)
        self.assertIn(
            f"/etc/systemd/journald.conf.d/{RAM_LOG_JOURNALD_CONFIG_NAME}",
            installation_body,
        )
        self.assertIn("install_board_journal_settings\n", assemble_script_source)
        verification_body = read_shell_function_body(
            assemble_script_source, "verify_mounted_image"
        )
        self.assertIn("if board_stores_journal_in_ram; then", verification_body)
        self.assertIn("SystemKeepFree=5M", verification_body)


if __name__ == "__main__":
    unittest.main()
