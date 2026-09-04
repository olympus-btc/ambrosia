"""Exercise only the credential function with isolated system-command targets."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path


class FirstbootPasswordTests(unittest.TestCase):
    def test_random_password_is_unique_private_and_not_in_logs(self):
        first_generated_credentials = self.run_function("")
        second_generated_credentials = self.run_function("")
        self.assertNotEqual(
            first_generated_credentials["credential"],
            second_generated_credentials["credential"],
        )
        self.assertEqual(
            len(first_generated_credentials["credential"].split(":")[1]), 24
        )
        self.assertEqual(first_generated_credentials["mode"], 0o600)
        self.assertIn(
            first_generated_credentials["credential"].split(":")[1],
            first_generated_credentials["console"],
        )
        self.assertEqual(first_generated_credentials["logs"], "")

    def test_preseed_is_applied_without_leaving_a_stale_password_file(self):
        preseeded_credentials = self.run_function("operator-selected-password")
        self.assertEqual(
            preseeded_credentials["credential"],
            "ambrosia:operator-selected-password",
        )
        self.assertIsNone(preseeded_credentials["mode"])
        self.assertEqual(preseeded_credentials["console"], "")

    def run_function(self, configured_password):
        firstboot_script_source = (
            Path(__file__).resolve().parents[1] / "common/firstboot/ambrosia-firstboot"
        ).read_text()
        password_function_source = (
            "apply_admin_password() {"
            + firstboot_script_source.split("apply_admin_password() {", 1)[1].split(
                "\n}\n", 1
            )[0]
            + "\n}\n"
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_root = Path(temporary_directory)
            console_path = temporary_root / "console"
            console_path.touch()
            (temporary_root / "operator-password").write_text("stale")
            password_function_source = password_function_source.replace(
                "/dev/console", str(console_path)
            )
            test_script = (
                """set -euo pipefail
install() { command install -m 0600 /dev/null "${@: -1}"; }
chpasswd() { cat > "$STATE_DIR/captured"; }
"""
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
            stored_password_path = temporary_root / "operator-password"
            return {
                "credential": (temporary_root / "captured").read_text().strip(),
                "mode": stored_password_path.stat().st_mode & 0o777
                if stored_password_path.exists()
                else None,
                "console": console_path.read_text(),
                "logs": command_process.stdout + command_process.stderr,
            }
