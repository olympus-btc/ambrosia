"""Public PKI export and real Caddy routing, using disposable state only."""

import http.client
import importlib.machinery
import importlib.util
import json
import os
import plistlib
import socket
import ssl
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

COMMON_DIRECTORY = Path(__file__).resolve().parents[1] / "common"
CERTIFICATE_ASSETS_DIRECTORY = COMMON_DIRECTORY / "certificates"
exporter_module_loader = importlib.machinery.SourceFileLoader(
    "export_ca", str(CERTIFICATE_ASSETS_DIRECTORY / "ambrosia-export-ca")
)
exporter_module_specification = importlib.util.spec_from_loader(
    exporter_module_loader.name, exporter_module_loader
)
certificate_exporter = importlib.util.module_from_spec(exporter_module_specification)
exporter_module_loader.exec_module(certificate_exporter)


def load_module(module_name, module_path):
    module_specification = importlib.util.spec_from_file_location(
        module_name, module_path
    )
    loaded_module = importlib.util.module_from_spec(module_specification)
    module_specification.loader.exec_module(loaded_module)
    return loaded_module


installer = load_module(
    "install_trust", CERTIFICATE_ASSETS_DIRECTORY / "install-trust.py"
)
validator = load_module(
    "validate_trust", CERTIFICATE_ASSETS_DIRECTORY / "validate-trust.py"
)


class InstallerTests(unittest.TestCase):
    def test_rollback_restores_original_permissions_and_removes_new_files(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(installer.os, "chown"),
        ):
            image_root = Path(directory)
            existing_file = image_root / "existing.conf"
            added_file = image_root / "new.conf"
            existing_file.write_bytes(b"original configuration")
            existing_file.chmod(0o640)
            managed_files = {
                existing_file: (b"replacement", 0o644),
                added_file: (b"new asset", 0o644),
            }
            backup_directory, original_files = installer.backup_files(
                managed_files, image_root
            )
            for destination_path, (file_content, file_mode) in managed_files.items():
                installer.install_file(destination_path, file_content, file_mode)
            installer.restore_files(managed_files, original_files)
            self.assertEqual(existing_file.read_bytes(), b"original configuration")
            self.assertEqual(existing_file.stat().st_mode & 0o777, 0o640)
            self.assertFalse(added_file.exists())
            self.assertEqual(backup_directory.stat().st_mode & 0o777, 0o700)

    def test_recognizes_image_and_bootstrap_but_refuses_custom_config(self):
        image = "{ local_certs } https://unit.local { tls internal reverse_proxy /ws/* 127.0.0.1:9154 reverse_proxy 127.0.0.1:3000 }"
        bootstrap = "{ debug local_certs } unit.local { tls internal reverse_proxy /ws/* localhost:9154 reverse_proxy localhost:3000 }"
        self.assertTrue(installer.known_configuration(image, "unit"))
        self.assertTrue(installer.known_configuration(bootstrap, "unit"))
        self.assertFalse(
            installer.known_configuration(
                image + "\nother.local { respond custom }", "unit"
            )
        )
        self.assertFalse(installer.known_configuration(image, "wrong-unit"))
        self.assertTrue(
            installer.known_configuration(
                image,
                "renamed-unit",
                managed_configuration=image,
            )
        )

    def test_installing_assets_preserves_pki_and_other_application_state(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(installer.os, "chown"),
        ):
            image_root = Path(directory)
            pki_directory = image_root / "var/lib/caddy/.local/share/caddy/pki"
            pki_directory.mkdir(parents=True)
            (pki_directory / "root.key").write_bytes(b"sentinel-key")
            installer.install_assets(image_root)
            first_exporter_copy = (
                image_root / "usr/local/libexec/ambrosia/ambrosia-export-ca"
            ).read_bytes()
            installer.install_assets(image_root)
            self.assertEqual((pki_directory / "root.key").read_bytes(), b"sentinel-key")
            self.assertEqual(
                (
                    image_root / "usr/local/libexec/ambrosia/ambrosia-export-ca"
                ).read_bytes(),
                first_exporter_copy,
            )
            self.assertFalse((image_root / "var/lib/ambrosia/trust").exists())
            self.assertEqual(
                (image_root / "var/lib/ambrosia").stat().st_mode & 0o777, 0o755
            )

    def test_installer_rejects_symlinked_destination(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(installer.os, "chown"),
        ):
            image_root = Path(directory)
            (image_root / "etc").mkdir()
            (image_root / "etc/ambrosia").symlink_to(image_root)
            with self.assertRaises(ValueError):
                installer.install_assets(image_root)


def create_ca(output_directory, common_name="unit-a", is_certificate_authority=True):
    certificate = output_directory / f"{common_name}.crt"
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "ec",
            "-pkeyopt",
            "ec_paramgen_curve:P-256",
            "-nodes",
            "-keyout",
            str(output_directory / f"{common_name}.key"),
            "-out",
            str(certificate),
            "-days",
            "2",
            "-subj",
            f"/CN={common_name}",
            "-addext",
            f"basicConstraints=critical,CA:{str(is_certificate_authority).upper()}",
            "-addext",
            "keyUsage=critical,keyCertSign,cRLSign",
        ],
        check=True,
        capture_output=True,
    )
    return certificate


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.root_directory = Path(self.temporary_directory.name)
        self.state_directory = self.root_directory / "state"
        self.state_directory.mkdir()
        self.root_certificate = create_ca(self.root_directory)

    def publish(self, certificate=None, hostname="ambrosia-test"):
        return certificate_exporter.publish(
            certificate or self.root_certificate,
            hostname,
            CERTIFICATE_ASSETS_DIRECTORY,
            self.state_directory,
        )

    def test_certificate_profile_and_metadata_have_identical_fingerprint(self):
        trust_metadata = self.publish()
        public_directory = self.state_directory / "trust"
        self.assertEqual(
            {artifact_path.name for artifact_path in public_directory.iterdir()},
            certificate_exporter.PUBLIC_FILES,
        )
        fingerprint = (
            certificate_exporter.run_openssl(
                "x509",
                "-inform",
                "DER",
                "-in",
                str(public_directory / "ambrosia-ca.crt"),
                "-noout",
                "-fingerprint",
                "-sha256",
            )
            .decode()
            .strip()
            .split("=", 1)[1]
        )
        self.assertEqual(trust_metadata["sha256"], fingerprint)
        apple_profile = plistlib.loads(
            (public_directory / "ambrosia-ca.mobileconfig").read_bytes()
        )
        self.assertEqual(len(apple_profile["PayloadContent"]), 1)
        self.assertEqual(
            apple_profile["PayloadContent"][0]["PayloadType"],
            "com.apple.security.root",
        )
        self.assertEqual(
            apple_profile["PayloadContent"][0]["PayloadContent"],
            (public_directory / "ambrosia-ca.crt").read_bytes(),
        )
        for artifact_path in public_directory.iterdir():
            artifact_content = artifact_path.read_bytes()
            self.assertEqual(artifact_path.stat().st_mode & 0o777, 0o644)
            self.assertNotIn(b"PRIVATE KEY", artifact_content)
            if artifact_path.suffix == ".html":
                self.assertNotIn(b"__HOSTNAME__", artifact_content)
                self.assertNotIn(b"__FINGERPRINT__", artifact_content)
        installation_guide = (public_directory / "index.html").read_text()
        self.assertIn('<html lang="en">', installation_guide)
        self.assertLess(
            installation_guide.index('id="es"'), installation_guide.index('id="en"')
        )
        self.assertEqual(installation_guide.count('name="platform-en"'), 6)
        self.assertEqual(installation_guide.count('name="platform-es"'), 6)
        self.assertEqual(installation_guide.count("<summary>"), 14)
        for expected_instruction in (
            "VPN y gestión de dispositivos",
            "VPN &amp; Device Management",
            "Trusted Root Certification Authorities",
            "Entidades de certificación raíz de confianza",
            "security.enterprise_roots.enabled",
        ):
            self.assertIn(expected_instruction, installation_guide)
        self.assertEqual(public_directory.stat().st_mode & 0o777, 0o755)

    def test_reexport_is_identical_and_never_changes_private_key(self):
        private_key_content = self.root_certificate.with_suffix(".key").read_bytes()
        initial_metadata = self.publish()
        published_generation = (self.state_directory / "trust").readlink()
        published_files = {
            artifact_path.name: artifact_path.read_bytes()
            for artifact_path in (self.state_directory / "trust").iterdir()
        }
        self.assertEqual(initial_metadata, self.publish())
        self.assertEqual(
            published_generation, (self.state_directory / "trust").readlink()
        )
        self.assertEqual(
            published_files,
            {
                artifact_path.name: artifact_path.read_bytes()
                for artifact_path in (self.state_directory / "trust").iterdir()
            },
        )
        self.assertEqual(
            private_key_content,
            self.root_certificate.with_suffix(".key").read_bytes(),
        )

    def test_independent_ca_and_hostname_change(self):
        initial_metadata = self.publish()
        renamed_metadata = self.publish(hostname="ambrosia-renamed")
        self.assertEqual(initial_metadata["sha256"], renamed_metadata["sha256"])
        self.assertEqual(
            renamed_metadata["trustUrl"], "http://ambrosia-renamed.local/trust/"
        )
        replacement_metadata = self.publish(create_ca(self.root_directory, "unit-b"))
        self.assertNotEqual(initial_metadata["sha256"], replacement_metadata["sha256"])
        self.assertEqual(
            len(list((self.state_directory / "trust-generations").iterdir())), 2
        )

    def test_rejects_private_material_bundle_and_truncated_certificate(self):
        valid_certificate_content = self.root_certificate.read_bytes()
        for invalid_certificate_content in (
            valid_certificate_content
            + self.root_certificate.with_suffix(".key").read_bytes(),
            valid_certificate_content + valid_certificate_content,
            valid_certificate_content[:50],
            b"invalid",
        ):
            with self.subTest(invalid_content=invalid_certificate_content[:20]):
                self.root_certificate.write_bytes(invalid_certificate_content)
                with self.assertRaises((ValueError, subprocess.SubprocessError)):
                    self.publish()
                self.assertFalse((self.state_directory / "trust").exists())

    def test_rejects_leaf_certificate_and_invalid_hostname(self):
        with self.assertRaises(ValueError):
            self.publish(
                create_ca(
                    self.root_directory,
                    "leaf",
                    is_certificate_authority=False,
                )
            )
        for invalid_hostname in (
            "../evil",
            "-bad",
            "two.local",
            "x\nroot",
            "a" * 64,
        ):
            with self.subTest(hostname=invalid_hostname), self.assertRaises(ValueError):
                self.publish(hostname=invalid_hostname)

    def test_rejects_symlink_source_and_generation_directory(self):
        certificate_symlink = self.root_directory / "link.crt"
        certificate_symlink.symlink_to(self.root_certificate)
        with self.assertRaises(OSError):
            self.publish(certificate_symlink)
        (self.state_directory / "trust-generations").symlink_to(self.root_directory)
        with self.assertRaises(ValueError):
            self.publish()

    def test_failure_does_not_partially_replace_generation(self):
        self.publish()
        published_generation = (self.state_directory / "trust").readlink()
        self.root_certificate.write_text("broken")
        with self.assertRaises(ValueError):
            self.publish()
        self.assertEqual(
            published_generation, (self.state_directory / "trust").readlink()
        )
        certificate_exporter.unpublish(self.state_directory)
        self.assertFalse((self.state_directory / "trust").exists())

    def test_does_not_replace_unmanaged_directory(self):
        public_directory = self.state_directory / "trust"
        public_directory.mkdir()
        (public_directory / "keep").write_text("unmanaged")
        with self.assertRaises(ValueError):
            self.publish()
        self.assertEqual((public_directory / "keep").read_text(), "unmanaged")

    def test_detects_tampered_existing_generation(self):
        self.publish()
        (self.state_directory / "trust/ambrosia-ca.crt").write_bytes(
            b"wrong certificate"
        )
        with self.assertRaises(ValueError):
            self.publish()


def free_port():
    with socket.socket() as listener_socket:
        listener_socket.bind(("127.0.0.1", 0))
        return listener_socket.getsockname()[1]


@unittest.skipUnless(
    os.environ.get("CADDY_BIN"), "Set CADDY_BIN to run real HTTP/HTTPS tests"
)
class CaddyTests(unittest.TestCase):
    @classmethod
    def setUpClass(test_class):
        test_class.temporary_directory = tempfile.TemporaryDirectory()
        test_class.addClassCleanup(test_class.temporary_directory.cleanup)
        test_class.root_directory = Path(test_class.temporary_directory.name)
        test_class.state_directory = test_class.root_directory / "state"
        test_class.state_directory.mkdir()
        test_class.http_port, test_class.https_port = free_port(), free_port()
        caddyfile_content = (
            COMMON_DIRECTORY / "templates/Caddyfile.template"
        ).read_text()
        caddyfile_content = caddyfile_content.replace(
            "http://__HOSTNAME__.local {",
            f"http://ambrosia-test.local:{test_class.http_port} {{",
        )
        caddyfile_content = caddyfile_content.replace(
            "https://__HOSTNAME__.local {",
            f"https://ambrosia-test.local:{test_class.https_port} {{",
        )
        caddyfile_content = caddyfile_content.replace("__HOSTNAME__", "ambrosia-test")
        caddyfile_content = caddyfile_content.replace(
            "/var/lib/ambrosia/trust", str(test_class.state_directory / "trust")
        )
        caddyfile_content = caddyfile_content.replace(
            "/run/caddy-admin/admin.sock", str(test_class.root_directory / "admin.sock")
        )
        caddyfile_content = caddyfile_content.replace(
            "  local_certs",
            f"  http_port {test_class.http_port}\n  https_port {test_class.https_port}\n  storage file_system {test_class.root_directory / 'data'}\n  local_certs",
            1,
        )
        test_class.caddyfile_path = test_class.root_directory / "Caddyfile"
        test_class.caddyfile_path.write_text(caddyfile_content)
        test_class.caddy_log = (test_class.root_directory / "caddy.log").open("w+")
        test_class.addClassCleanup(test_class.caddy_log.close)
        test_class.caddy_process = subprocess.Popen(
            [
                os.environ["CADDY_BIN"],
                "run",
                "--config",
                str(test_class.caddyfile_path),
                "--adapter",
                "caddyfile",
            ],
            stdout=test_class.caddy_log,
            stderr=test_class.caddy_log,
        )
        test_class.addClassCleanup(test_class.stop)
        test_class.root_certificate = (
            test_class.root_directory / "data/pki/authorities/local/root.crt"
        )
        for _ in range(100):
            if test_class.caddy_process.poll() is not None:
                test_class.caddy_log.seek(0)
                raise RuntimeError(test_class.caddy_log.read())
            if test_class.root_certificate.exists():
                try:
                    with socket.create_connection(
                        ("127.0.0.1", test_class.https_port), timeout=0.2
                    ):
                        pass
                    certificate_exporter.publish(
                        test_class.root_certificate,
                        "ambrosia-test",
                        CERTIFICATE_ASSETS_DIRECTORY,
                        test_class.state_directory,
                    )
                    break
                except OSError:
                    pass
            time.sleep(0.1)
        else:
            raise RuntimeError("Caddy did not create a CA")

    @classmethod
    def stop(test_class):
        test_class.caddy_process.terminate()
        test_class.caddy_process.wait(timeout=10)

    def request(
        self, request_path, use_https=False, http_method="GET", trust_root=True
    ):
        server_port = self.https_port if use_https else self.http_port
        connection = http.client.HTTPConnection("127.0.0.1", server_port, timeout=5)
        if use_https:
            tls_context = ssl.create_default_context(
                cafile=str(self.root_certificate) if trust_root else None
            )
            connection.sock = tls_context.wrap_socket(
                socket.create_connection(("127.0.0.1", server_port)),
                server_hostname="ambrosia-test.local",
            )
        try:
            connection.request(
                http_method,
                request_path,
                headers={"Host": f"ambrosia-test.local:{server_port}"},
            )
            http_response = connection.getresponse()
            return (
                http_response.status,
                dict(http_response.getheaders()),
                http_response.read(),
            )
        finally:
            connection.close()

    def test_http_serves_allowlist_and_preserves_other_redirects(self):
        for request_path in (
            "/trust/",
            "/trust/metadata.json",
            "/trust/ambrosia-ca.crt",
            "/trust/ambrosia-ca.mobileconfig",
        ):
            self.assertEqual(self.request(request_path)[0], 200, request_path)
        self.assertEqual(self.request("/trust")[1]["Location"], "/trust/")
        self.assertEqual(
            self.request("/store/settings")[1]["Location"],
            "https://ambrosia-test.local/store/settings",
        )
        for request_path in (
            "/trust/root.key",
            "/trust/.staging/secret",
            "/trust/backup",
            "/trust/trust.lock",
        ):
            self.assertEqual(self.request(request_path)[0], 404, request_path)
        self.assertEqual(
            self.request("/trust/metadata.json", http_method="POST")[0], 405
        )

    def test_mime_cache_headers_and_https_without_app(self):
        for artifact_name, expected_content_type in (
            ("ambrosia-ca.crt", "application/x-x509-ca-cert"),
            ("ambrosia-ca.mobileconfig", "application/x-apple-aspen-config"),
        ):
            response_status, response_headers, _response_body = self.request(
                "/trust/" + artifact_name
            )
            self.assertEqual(response_status, 200)
            self.assertEqual(response_headers["Content-Type"], expected_content_type)
            self.assertEqual(response_headers["Cache-Control"], "no-store")
        self.assertEqual(self.request("/trust/check.html", use_https=True)[0], 200)
        _, _, metadata_body = self.request("/trust/metadata.json", use_https=True)
        self.assertEqual(json.loads(metadata_body)["hostname"], "ambrosia-test.local")
        with self.assertRaises(ssl.SSLCertVerificationError):
            self.request("/trust/check.html", use_https=True, trust_root=False)

    def test_reload_keeps_the_same_root(self):
        root_certificate_before_reload = self.root_certificate.read_bytes()
        subprocess.run(
            [
                os.environ["CADDY_BIN"],
                "reload",
                "--config",
                str(self.caddyfile_path),
                "--adapter",
                "caddyfile",
                "--address",
                f"unix/{self.root_directory}/admin.sock",
                "--force",
            ],
            check=True,
            capture_output=True,
        )
        self.assertEqual(
            self.root_certificate.read_bytes(), root_certificate_before_reload
        )
        self.assertEqual(self.request("/trust/metadata.json", use_https=True)[0], 200)

    def test_validation_does_not_change_existing_pki(self):
        root_certificate_before_validation = self.root_certificate.read_bytes()
        validator.validate(
            (COMMON_DIRECTORY / "templates/Caddyfile.template").read_text(),
            caddy_binary=os.environ["CADDY_BIN"],
        )
        self.assertEqual(
            self.root_certificate.read_bytes(), root_certificate_before_validation
        )


if __name__ == "__main__":
    unittest.main()
