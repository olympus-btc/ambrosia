"""Static checks that images keep a sane clock and reissue Caddy certificates."""

import configparser
import unittest
from pathlib import Path

IMAGE_DIRECTORY = Path(__file__).resolve().parents[1]
SYSTEMD_UNITS_DIRECTORY = IMAGE_DIRECTORY / "common/systemd"
ASSEMBLE_SCRIPT_PATH = IMAGE_DIRECTORY / "build/assemble-image.sh"
TIME_RESYNC_UNIT_NAME = "ambrosia-caddy-time-resync"


def read_systemd_unit(unit_file_name):
    unit_parser = configparser.ConfigParser(strict=False, interpolation=None)
    unit_parser.optionxform = str
    unit_parser.read(SYSTEMD_UNITS_DIRECTORY / unit_file_name)
    return unit_parser


def section_of_function(script_source, function_name):
    return script_source.split(f"{function_name}() {{", 1)[1].split("\n}\n", 1)[0]


class ClockSyncTests(unittest.TestCase):
    def setUp(self):
        self.assemble_script_source = ASSEMBLE_SCRIPT_PATH.read_text()

    def test_every_board_installs_time_sync_packages(self):
        board_package_files = sorted(IMAGE_DIRECTORY.glob("boards/*/packages.txt"))
        self.assertTrue(board_package_files)
        for board_package_file in board_package_files:
            board_packages = {
                package_line.strip()
                for package_line in board_package_file.read_text().splitlines()
                if package_line.strip() and not package_line.startswith("#")
            }
            with self.subTest(board=board_package_file.parent.name):
                self.assertIn("systemd-timesyncd", board_packages)
                self.assertIn("fake-hwclock", board_packages)

    def test_path_unit_triggers_resync_after_first_clock_synchronization(self):
        path_unit = read_systemd_unit(f"{TIME_RESYNC_UNIT_NAME}.path")
        self.assertEqual(
            path_unit["Path"]["PathExists"], "/run/systemd/timesync/synchronized"
        )
        self.assertEqual(path_unit["Path"]["Unit"], f"{TIME_RESYNC_UNIT_NAME}.service")
        self.assertEqual(path_unit["Install"]["WantedBy"], "multi-user.target")

    def test_resync_service_restarts_caddy_once_without_blocking_boot(self):
        service_unit = read_systemd_unit(f"{TIME_RESYNC_UNIT_NAME}.service")
        self.assertEqual(service_unit["Service"]["Type"], "oneshot")
        self.assertEqual(service_unit["Service"]["RemainAfterExit"], "yes")
        self.assertEqual(
            service_unit["Service"]["ExecStart"],
            "/bin/systemctl try-restart caddy.service",
        )
        self.assertNotIn("Install", service_unit)

    def test_assembly_installs_enables_and_verifies_clock_assets(self):
        repo_assets_section = section_of_function(
            self.assemble_script_source, "install_repo_assets"
        )
        enabled_services_section = section_of_function(
            self.assemble_script_source, "enable_services"
        )
        verification_section = section_of_function(
            self.assemble_script_source, "verify_mounted_image"
        )
        self.assertIn('touch "$ROOTFS_MNT/usr/lib/clock-epoch"', repo_assets_section)
        for unit_suffix in ("service", "path"):
            self.assertIn(f"{TIME_RESYNC_UNIT_NAME}.{unit_suffix}", repo_assets_section)
        for enabled_unit in (
            f"{TIME_RESYNC_UNIT_NAME}.path",
            "systemd-timesyncd.service",
            "fake-hwclock.service",
        ):
            self.assertIn(enabled_unit, enabled_services_section)
            self.assertIn(enabled_unit, verification_section)
        self.assertIn("/usr/lib/clock-epoch", verification_section)


if __name__ == "__main__":
    unittest.main()
