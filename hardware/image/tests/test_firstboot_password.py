"""Exercise only the credential function with isolated system-command targets."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

FIRSTBOOT_SCRIPT_PATH = (
    Path(__file__).resolve().parents[1] / "common/firstboot/ambrosia-firstboot"
)


class FirstbootPasswordTests(unittest.TestCase):
    def test_default_password_is_applied_when_no_preseed_is_given(self):
        default_credentials = self.run_function("")
        self.assertEqual(default_credentials["credential"], "ambrosia:Ambrosia2026!")
        self.assertFalse(default_credentials["stale_password_file_exists"])
        self.assertEqual(default_credentials["logs"], "")

    def test_preseed_overrides_default_without_leaving_a_stale_password_file(self):
        preseeded_credentials = self.run_function("operator-selected-password")
        self.assertEqual(
            preseeded_credentials["credential"],
            "ambrosia:operator-selected-password",
        )
        self.assertFalse(preseeded_credentials["stale_password_file_exists"])

    def run_function(self, configured_password):
        firstboot_script_source = FIRSTBOOT_SCRIPT_PATH.read_text()
        default_password_declaration = next(
            script_line
            for script_line in firstboot_script_source.splitlines()
            if script_line.startswith("DEFAULT_ADMIN_PASSWORD=")
        )
        password_function_source = (
            "apply_admin_password() {"
            + firstboot_script_source.split("apply_admin_password() {", 1)[1].split(
                "\n}\n", 1
            )[0]
            + "\n}\n"
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_root = Path(temporary_directory)
            stale_password_path = temporary_root / "operator-password"
            stale_password_path.write_text("stale")
            test_script = (
                """set -euo pipefail
chpasswd() { cat > "$STATE_DIR/captured"; }
"""
                + default_password_declaration
                + "\n"
                + password_function_source
                + "apply_admin_password\n"
            )
            command_process = subprocess.run(
                ["bash"],
                input=test_script,
                text=True,
                check=True,
                capture_output=True,
                env={
                    **os.environ,
                    "STATE_DIR": temporary_directory,
                    "OPERATOR_USER": "ambrosia",
                    "ambrosia_admin_password": configured_password,
                },
            )
            return {
                "credential": (temporary_root / "captured").read_text().strip(),
                "stale_password_file_exists": stale_password_path.exists(),
                "logs": command_process.stdout + command_process.stderr,
            }


if __name__ == "__main__":
    unittest.main()
