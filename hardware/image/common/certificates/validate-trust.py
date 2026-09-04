#!/usr/bin/env python3
"""Provision a rendered Caddyfile using disposable storage, never image PKI."""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def validate(caddyfile_template, caddy_binary="caddy"):
    with tempfile.TemporaryDirectory(
        prefix="ambrosia-caddy-validation-"
    ) as temporary_directory_name:
        temporary_directory = Path(temporary_directory_name)
        rendered_caddyfile = temporary_directory / "Caddyfile"
        rendered_caddyfile.write_text(
            caddyfile_template.replace("__HOSTNAME__", "ambrosia-validation")
        )
        adapted_configuration_process = subprocess.run(
            [
                caddy_binary,
                "adapt",
                "--adapter",
                "caddyfile",
                "--config",
                str(rendered_caddyfile),
            ],
            check=True,
            capture_output=True,
        )
        caddy_configuration = json.loads(adapted_configuration_process.stdout)
        caddy_configuration["storage"] = {
            "module": "file_system",
            "root": str(temporary_directory / "data"),
        }
        for certificate_authority in (
            caddy_configuration.get("apps", {})
            .get("pki", {})
            .get("certificate_authorities", {})
            .values()
        ):
            certificate_authority["install_trust"] = False
        validation_configuration_path = temporary_directory / "config.json"
        validation_configuration_path.write_text(json.dumps(caddy_configuration))
        subprocess.run(
            [
                caddy_binary,
                "validate",
                "--config",
                str(validation_configuration_path),
            ],
            check=True,
            env={
                **os.environ,
                "XDG_DATA_HOME": str(temporary_directory / "data"),
                "XDG_CONFIG_HOME": str(temporary_directory / "config"),
            },
        )


if __name__ == "__main__":
    validate(Path(sys.argv[1]).read_text())
