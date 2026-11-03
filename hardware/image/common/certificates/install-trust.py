#!/usr/bin/env python3
"""Install trust assets into an image, or migrate a known live Caddyfile.

Live updates are explicit (--apply), retain PKI, and refuse custom Caddyfiles.
Run from a trusted checkout. No network downloads are performed here.
"""

import argparse
import importlib.util
import json
import os
import pwd
import re
import subprocess
import tempfile
from pathlib import Path

CERTIFICATES_DIRECTORY = Path(__file__).resolve().parent
COMMON_DIRECTORY = CERTIFICATES_DIRECTORY.parent
PRIVATE_ADMIN_ADDRESS = "unix//run/caddy-admin/admin.sock"
EXPORT_UNITS = (
    "ambrosia-export-ca.service",
    "ambrosia-export-ca.path",
    "ambrosia-export-ca.timer",
)


def render_configuration(device_hostname):
    return (
        (COMMON_DIRECTORY / "templates/Caddyfile.template")
        .read_text()
        .replace("__HOSTNAME__", device_hostname)
    )


def unit_status(operation_name, unit_name):
    return (
        subprocess.run(
            ["systemctl", operation_name, "--quiet", unit_name],
            capture_output=True,
            check=False,
        ).returncode
        == 0
    )


def run_required_command(*command_arguments, **command_options):
    return subprocess.run(command_arguments, check=True, **command_options)


def normalize_configuration(configuration_text):
    return " ".join(re.sub(r"(?m)^\s*#.*$", "", configuration_text).split())


def known_configuration(
    current_configuration, device_hostname, managed_configuration=None
):
    if managed_configuration is not None and normalize_configuration(
        current_configuration
    ) == normalize_configuration(managed_configuration):
        return True
    for scheme_prefix in ("", "https://"):
        for loopback_address in ("localhost", "127.0.0.1"):
            for debug_directive in ("", "debug"):
                legacy_configuration = f"{{ {debug_directive} local_certs }} {scheme_prefix}{device_hostname}.local {{ tls internal reverse_proxy /ws/* {loopback_address}:9154 reverse_proxy {loopback_address}:3000 }}"
                if normalize_configuration(
                    current_configuration
                ) == normalize_configuration(legacy_configuration):
                    return True
    return normalize_configuration(current_configuration) == normalize_configuration(
        render_configuration(device_hostname)
    )


def asset_files():
    trust_asset_files = {
        "/usr/local/libexec/ambrosia/ambrosia-export-ca": (
            CERTIFICATES_DIRECTORY / "ambrosia-export-ca",
            0o755,
        ),
        "/usr/local/libexec/ambrosia/validate-trust.py": (
            CERTIFICATES_DIRECTORY / "validate-trust.py",
            0o755,
        ),
        "/etc/ambrosia/Caddyfile.template": (
            COMMON_DIRECTORY / "templates/Caddyfile.template",
            0o644,
        ),
        "/etc/systemd/system/caddy.service.d/ambrosia-trust.conf": (
            CERTIFICATES_DIRECTORY / "caddy-trust.conf",
            0o644,
        ),
    }
    for asset_name in ("index.html", "check.html"):
        trust_asset_files[f"/usr/local/share/ambrosia/trust/{asset_name}"] = (
            CERTIFICATES_DIRECTORY / asset_name,
            0o644,
        )
    for extension in ("service", "path", "timer"):
        unit_name = f"ambrosia-export-ca.{extension}"
        trust_asset_files[f"/etc/systemd/system/{unit_name}"] = (
            CERTIFICATES_DIRECTORY / unit_name,
            0o644,
        )
    return trust_asset_files


def safe_parent(destination_path, trusted_boundary):
    """Reject symlinks rather than following them while installing as root."""
    for path_component in (destination_path, *destination_path.parents):
        if path_component.is_symlink():
            raise ValueError(f"Refusing symlink: {path_component}")
        if path_component == trusted_boundary:
            break


def install_file(destination_path, file_content, file_mode=0o644):
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary_path = tempfile.mkstemp(
        prefix=".ambrosia-", dir=destination_path.parent
    )
    try:
        with os.fdopen(file_descriptor, "wb") as destination_stream:
            destination_stream.write(file_content)
            destination_stream.flush()
            os.fsync(destination_stream.fileno())
        os.chmod(temporary_path, file_mode)
        os.chown(temporary_path, 0, 0)
        os.replace(temporary_path, destination_path)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def prepare_asset_directories(image_root):
    for relative_directory in (
        "var/lib/ambrosia",
        "etc/ambrosia",
        "usr/local/libexec/ambrosia",
        "usr/local/share/ambrosia/trust",
    ):
        directory_path = image_root / relative_directory
        safe_parent(directory_path, image_root)
        directory_path.mkdir(parents=True, exist_ok=True)
        directory_path.chmod(0o755)
        os.chown(directory_path, 0, 0)


def install_assets(image_root):
    prepare_asset_directories(image_root)
    for relative_path, (source_path, file_mode) in asset_files().items():
        destination_path = image_root / relative_path.lstrip("/")
        safe_parent(destination_path, image_root)
        install_file(destination_path, source_path.read_bytes(), file_mode)


def validate(caddy_configuration):
    validator_specification = importlib.util.spec_from_file_location(
        "validate_trust", CERTIFICATES_DIRECTORY / "validate-trust.py"
    )
    validator_module = importlib.util.module_from_spec(validator_specification)
    validator_specification.loader.exec_module(validator_module)
    validator_module.validate(caddy_configuration)


def backup_files(managed_files, state_directory):
    backup_directory = Path(
        tempfile.mkdtemp(prefix="trust-migration-", dir=state_directory)
    )
    backup_directory.chmod(0o700)
    original_files = {}
    for file_index, destination_path in enumerate(managed_files):
        if destination_path.exists():
            original_files[destination_path] = (
                destination_path.read_bytes(),
                destination_path.stat().st_mode & 0o777,
            )
            (backup_directory / str(file_index)).write_bytes(
                original_files[destination_path][0]
            )
    (backup_directory / "manifest.json").write_text(
        json.dumps(
            {
                str(destination_path): file_index
                for file_index, destination_path in enumerate(managed_files)
            },
            indent=2,
        )
    )
    return backup_directory, original_files


def restore_files(managed_files, original_files):
    for destination_path in managed_files:
        if destination_path in original_files:
            install_file(destination_path, *original_files[destination_path])
        else:
            destination_path.unlink(missing_ok=True)


def migrate(apply_changes):
    device_hostname = Path("/etc/hostname").read_text().strip().lower()
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", device_hostname):
        raise ValueError("Expected a single DNS hostname label")
    caddyfile_path = Path("/etc/caddy/Caddyfile")
    current_configuration = caddyfile_path.read_text()
    managed_configuration_path = Path("/etc/ambrosia/Caddyfile.managed")
    managed_configuration = None
    if managed_configuration_path.exists() and all(
        not path_component.is_symlink()
        and path_component.stat().st_uid == 0
        and not path_component.stat().st_mode & 0o022
        for path_component in (
            managed_configuration_path,
            *managed_configuration_path.parents,
        )
    ):
        managed_configuration = managed_configuration_path.read_text()
    if not known_configuration(
        current_configuration, device_hostname, managed_configuration
    ):
        raise ValueError(
            "Custom Caddyfile: no changes made. Integrate the template manually; see certificates/README.md."
        )
    if (
        Path("/opt/ambrosia/bin/ambrosia-firstboot").exists()
        and not Path("/var/lib/ambrosia/firstboot-complete").exists()
    ):
        raise ValueError("First boot must complete before migrating this unit")
    candidate_configuration = render_configuration(device_hostname)
    validate(candidate_configuration)
    if not apply_changes:
        print(
            "Known configuration; validation passed. Use --apply to install. PKI will be preserved."
        )
        return

    image_root = Path("/")
    managed_files = {
        image_root / relative_path.lstrip("/"): (source_path.read_bytes(), file_mode)
        for relative_path, (source_path, file_mode) in asset_files().items()
    }
    managed_files[caddyfile_path] = (candidate_configuration.encode(), 0o644)
    managed_files[managed_configuration_path] = (
        candidate_configuration.encode(),
        0o644,
    )
    # Both layouts use the same portal source; keep their executable location.
    portal_service = Path("/etc/systemd/system/ambrosia-wifi-portal.service")
    if portal_service.exists():
        portal_executable = (
            "/opt/ambrosia/bin/ambrosia-wifi-portal"
            if "/opt/ambrosia/bin/" in portal_service.read_text()
            else "/usr/local/bin/ambrosia-wifi-portal"
        )
        managed_files[Path(portal_executable)] = (
            (COMMON_DIRECTORY / "portal/ambrosia-wifi-portal").read_bytes(),
            0o755,
        )
    for destination_path in managed_files:
        safe_parent(destination_path, image_root)
    state_directory = Path("/var/lib/ambrosia")
    safe_parent(state_directory, image_root)
    state_directory.mkdir(exist_ok=True)
    state_directory.chmod(0o755)
    os.chown(state_directory, 0, 0)
    # Repair ancestors of existing root-run image scripts; never recursively
    # change ownership of application data or a wallet during a TLS migration.
    for protected_directory in (
        Path("/opt/ambrosia"),
        Path("/opt/ambrosia/bin"),
        Path("/etc/ambrosia"),
    ):
        safe_parent(protected_directory, image_root)
        if protected_directory.exists():
            protected_directory.chmod(0o755)
            os.chown(protected_directory, 0, 0)
    backup_directory, original_files = backup_files(managed_files, state_directory)
    caddy_was_active = unit_status("is-active", "caddy")
    export_units = EXPORT_UNITS
    previously_enabled_units = {
        unit_name: unit_status("is-enabled", unit_name) for unit_name in export_units
    }
    previously_active_units = {
        unit_name: unit_status("is-active", unit_name) for unit_name in export_units
    }
    previous_admin_address = (
        PRIVATE_ADMIN_ADDRESS
        if f"admin {PRIVATE_ADMIN_ADDRESS}" in current_configuration
        else "localhost:2019"
    )
    try:
        prepare_asset_directories(image_root)
        for destination_path, (file_content, file_mode) in managed_files.items():
            install_file(destination_path, file_content, file_mode)
        admin_directory = Path("/run/caddy-admin")
        safe_parent(admin_directory, image_root)
        admin_directory.mkdir(exist_ok=True)
        caddy_account = pwd.getpwnam("caddy")
        os.chown(admin_directory, caddy_account.pw_uid, caddy_account.pw_gid)
        admin_directory.chmod(0o700)
        run_required_command("systemctl", "daemon-reload")
        if caddy_was_active:
            run_required_command(
                "caddy",
                "reload",
                "--config",
                str(caddyfile_path),
                "--address",
                previous_admin_address,
                "--force",
            )
            run_required_command("/usr/local/libexec/ambrosia/ambrosia-export-ca")
        run_required_command("systemctl", "enable", *export_units)
        run_required_command(
            "systemctl", "start", "ambrosia-export-ca.path", "ambrosia-export-ca.timer"
        )
    except Exception:
        subprocess.run(["systemctl", "stop", *export_units], check=False)
        for unit_name in export_units:
            if not previously_enabled_units[unit_name]:
                subprocess.run(["systemctl", "disable", unit_name], check=False)
        restore_files(managed_files, original_files)
        run_required_command("systemctl", "daemon-reload")
        if caddy_was_active:
            # Reload may have switched sockets before a later step failed.
            for admin_address in (
                PRIVATE_ADMIN_ADDRESS,
                previous_admin_address,
            ):
                if (
                    subprocess.run(
                        [
                            "caddy",
                            "reload",
                            "--config",
                            str(caddyfile_path),
                            "--address",
                            admin_address,
                            "--force",
                        ],
                        capture_output=True,
                        check=False,
                    ).returncode
                    == 0
                ):
                    break
        for unit_name in export_units:
            if previously_active_units[unit_name]:
                subprocess.run(["systemctl", "start", unit_name], check=False)
        raise
    print(
        f"Trust support installed; CA preserved. Configuration backup: "
        f"{backup_directory}"
    )
    print(
        "Existing application accounts and port bindings were retained. Complete the legacy isolation checklist in certificates/README.md before production rollout."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    operation_group = parser.add_mutually_exclusive_group()
    operation_group.add_argument("--image-root", type=Path)
    operation_group.add_argument("--apply", action="store_true")
    parsed_arguments = parser.parse_args()
    if os.geteuid() != 0:
        parser.error(
            "Run as root; without --apply this validates the live configuration only"
        )
    if parsed_arguments.image_root:
        if parsed_arguments.image_root.resolve() == Path("/"):
            parser.error("Use --apply for the running system")
        install_assets(parsed_arguments.image_root.resolve())
    else:
        migrate(parsed_arguments.apply)


if __name__ == "__main__":
    main()
