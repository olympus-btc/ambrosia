# Per-unit TLS trust

Each unit keeps its Caddy CA in `/var/lib/caddy/.local/share/caddy/pki/authorities/local`. Only the public root is exported. Never copy `root.key`, `intermediate.key`, or the Caddy data directory to client devices or a golden image.

## New images

The build installs these assets automatically. First boot creates the device identity, clears inherited PKI and exports, and renders Caddy's configuration. Caddy generates the root; the export service publishes immutable generations under `/var/lib/ambrosia/trust-generations`, switching `/var/lib/ambrosia/trust` atomically. Repeated exports of the same inputs reuse the generation. Errors withdraw the public pointer rather than leaving a known-invalid download online.

The service runs at boot, on certificate/hostname changes and periodically after missed events or transient errors. It does not start Caddy: the Wi-Fi portal retains ownership of port 80 until it exits. A missing CA produces an export error in the journal and is retried, without blocking Wi-Fi setup.

The enrollment URL is `http://<hostname>.local/trust/`. The same files and an independent check page are available over HTTPS. Unknown trust paths return 404; other HTTP paths redirect to HTTPS. The UI fetches same-origin HTTPS metadata. It reports the session scheme, never claims to inspect the client's trust store. The service worker routes trust requests to the network with no offline fallback.

New images run Ambrosia, Next.js and Phoenix as the locked `ambrosia-service` account, with data in `/home/ambrosia-service`. The SSH operator remains `ambrosia`; use `AMBROSIA_ADMIN_PASSWORD` to preseed a unique SSH password. Without preseed, first boot generates a random password, shows it only on the physical console and stores it in root-only `/var/lib/ambrosia/operator-password`. It is not written to the firstboot log. Existing-unit migrations never change operator credentials. Root owns privileged scripts, templates and export parents. Caddy administration uses `/run/caddy-admin/admin.sock` inside a 0700 Caddy-owned directory. Ktor and Next.js bind to loopback. The application services also use `NoNewPrivileges` and cannot access the Caddy state or administrative socket.

## Existing units

Run from a trusted checkout on the unit. Python 3, OpenSSL, Caddy and systemd must already be installed. The commands below validate first, then explicitly apply:

```sh
sudo python3 hardware/image/common/certificates/install-trust.py
sudo python3 hardware/image/common/certificates/install-trust.py --apply
```

The installer recognizes the old image and operator-bootstrap Caddyfiles, the current template, or the last managed configuration. It refuses customized configurations without changing them. A customized installation needs a reviewed manual integration of the template's trust routes, private admin socket and systemd override.

The installer preserves the existing root, application data, account identities and network bindings. It updates both portal layouts, validates Caddy with disposable PKI, backs up replaced files under a root-only `trust-migration-*` directory, reloads Caddy if active, and enables export triggers. When the portal has stopped Caddy, activation is deferred to its normal exit. Failure restores replaced configuration files and attempts to reload the previous Caddyfile. No factory reset or wallet migration is performed.

**Legacy isolation prerequisite:** older installs may run under a sudo-capable operator account and expose ports 3000/9154 directly. Installing the trust routes alone does not fix that. Before production rollout, move those services to a locked runtime account using the site's reviewed data-migration procedure, set `http-bind-ip=127.0.0.1`, bind Next.js to loopback, apply the service protections from `common/systemd`, and verify API, WebSockets, printers and Phoenix webhooks. This is deliberately not an unattended wallet/data migration. New images already include this isolation.

Do not run `bootstrap-ambrosia.sh` on a working unit to migrate it: bootstrap also resets application configuration. Normal application updates must preserve Caddy state and `/var/lib/ambrosia/firstboot-complete`. The generic `scripts/update.sh` updates legacy `~/.local/ambrosia` installs; it is not an updater for `/opt/ambrosia` images. To update only trust support, rerun the installer from the new trusted checkout.

## Verify and issue an identity card

After the final unit boots, inspect its fingerprint on the physical console or using SSH with a previously verified host key:

```sh
sudo openssl x509 -in /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt -noout -fingerprint -sha256
cat /var/lib/ambrosia/trust/metadata.json
```

Transfer the public metadata through that trusted channel to the operator workstation, then generate a printable card:

```sh
python3 hardware/preinstalled/operator/scripts/generate-trust-card.py unit-metadata.json > unit-trust-card.html
```

Give this card alongside the setup QR card. Compare the downloaded certificate's fingerprint in the OS viewer against this independent reference. A fingerprint or QR obtained from the same unauthenticated HTTP page does not authenticate that page. A CA can authorize other names on trusting clients; enrollment is broader than an exception for one website.

The static assistant contains ES/EN installation and removal instructions for iOS/iPadOS, Android, Windows, macOS, Linux and Firefox. iOS profile installation and full TLS trust are separate steps. Device management policies can prevent installation. A profile is an unsigned certificate-only plist; it is not MDM enrollment. Validate the documented steps on supported OS/browser versions before release.

## Lifecycle and recovery

| Operation | Expected result |
|---|---|
| Reboot or ordinary binary update | Same CA and client trust |
| Re-export or trust component update | Same CA; updated public files |
| Site certificate renewal | Same trusted root |
| Hostname change | Update hostname and rendered Caddyfile together, reload, re-export, reissue identity card; keep PKI |
| Factory reset of an image unit | Back up business/wallet data according to existing procedures, then reflash a clean image; new CA, remove old client trust and enroll again |
| Legacy clone preparation | Legacy scripts remove PKI and exports; never apply their user-renaming flow to an image unit |
| Missing/corrupt PKI | Inspect Caddy/export logs and disk/clock health; do not silently delete keys as a repair |
| Compromised or expired CA | Remove the old CA from every client; restore/reprovision the unit under operator control, verify its new identity and enroll again |

Do not delete the firstboot marker as a TLS repair: first boot also clears wallet/application state. Do not copy another unit's PKI during business-data restoration. Reflashing is not a normal update. Never erase PKI after printing the final identity card.

Check date/time and `.local` name resolution separately from certificate trust. An IP URL is not interchangeable with the hostname certificate. Offline units need a maintained clock; test prolonged power loss and disconnected operation. HSTS for this hostname would disable HTTP enrollment, so the template intentionally does not enable it. Test browsers configured to require HTTPS.

## Validation

The hardware tests require Python 3 with Flask, Node.js (for the portal's actual JavaScript), and OpenSSL. Install Flask in a development virtual environment or use the distribution's `python3-flask` package. NetworkManager and radio commands are mocked; these tests do not change your Wi-Fi connection.

```sh
python3 -m unittest discover -s hardware/image/tests -v
CADDY_BIN=/usr/bin/caddy python3 -m unittest discover -s hardware/image/tests -v
cd client
npm run test:coverage -- --runInBand
npm run lint
```

The second hardware command includes real HTTP/HTTPS and CA-preservation checks in temporary directories and unprivileged ports. It neither installs a system root nor touches running services. The image build validates a rendered config with isolated temporary PKI and checks that neither PKI nor per-unit exports remain. CI includes ShellCheck, Python tests and Caddy integration.

Release gate: flash both boards; exercise failed/successful Wi-Fi setup and Ethernet; install and remove the CA on actual supported clients without previous exceptions; verify direct backend ports are inaccessible from the LAN, administrative socket access is denied to the runtime account, and fingerprints survive reboot/update but change after reflashing. Physical-device and OS-store checks cannot be replaced by the automated tests.
