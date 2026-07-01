# Ambrosia Image Build

This directory contains the tooling to produce reproducible, flashable SD card images for supported hardware targets with Ambrosia POS pre-installed and ready to boot.

The image embeds the full stack: Ambrosia server (Kotlin/Ktor), the Next.js client, Phoenixd (Lightning node), and Caddy as a reverse proxy. On first boot the device self-initializes — SSH host keys and the machine ID are regenerated, secrets are provisioned, and an optional preseed file is consumed to configure hostname, admin password, Wi-Fi country, and locale.

## Supported boards

| Board ID | Board | Base OS |
|---|---|---|
| `opi-zero-2w` | OrangePi Zero 2W | Debian Bookworm (official OPi image) |
| `rpi-zero-2w` | Raspberry Pi Zero 2W | Raspberry Pi OS Lite 64-bit Bookworm |

Each board has its own definition under `hardware/image/boards/<board-id>/`. Adding a new board only requires creating that directory with `board.env`, `packages.txt`, and `README.md`.

## What the build produces

A successful build writes three files to `hardware/image/out/`:

| File | Description |
|---|---|
| `ambrosia-<board-id>-<version>.img.gz` | Compressed flashable image |
| `ambrosia-<board-id>-<version>.sha256` | SHA-256 hash of the `.img.gz` |
| `ambrosia-<board-id>-<version>.manifest.json` | Build metadata (versions, commit, base image) |

### What is inside the image

The image is built from the board's official Debian Bookworm base. On top of it the assembler installs:

- **Runtime packages**: `temurin-21-jre`, `nodejs` 24, `caddy`, `network-manager`, `avahi-daemon`, `openssh-server`, `hostapd`, `dnsmasq`, and supporting utilities
- **Phoenixd** (`/usr/local/bin/phoenixd`, `phoenix-cli`) — the Lightning Network daemon
- **Ambrosia server** at `/opt/ambrosia/server/ambrosia.jar`
- **Ambrosia client** at `/opt/ambrosia/client/` (Next.js standalone build)
- **systemd services**: `ambrosia.service`, `ambrosia-client.service`, `phoenixd.service`, `caddy.service`, `ambrosia-firstboot.service`, `ambrosia-wifi-portal.service`
- All services run as the `ambrosia` system user (UID 1001)

## Base image

Each board defines its own base image in `hardware/image/boards/<board-id>/board.env`. Refer to the board's `README.md` for the expected filename and download page.

You can provide the image in any of these ways:

- **Local file** via `--base-image <path>` — accepts `.7z`, `.gz`, `.xz`, or `.img`
- **Direct download** via `--base-image-url <url>` — cached in `hardware/image/out/cache/` for subsequent runs
- **Environment variable** `AMBROSIA_BASE_IMAGE_PATH` or `AMBROSIA_BASE_IMAGE_URL`

> The cache directory (`hardware/image/out/cache/`) is never cleaned between builds. Subsequent runs reuse the downloaded archive automatically.

## Build

### On macOS — Docker wrapper

On macOS the assembler requires Linux kernel interfaces (`losetup`, `chroot`, `mount`, `parted`) that are not available natively. Use `build-docker.sh`, which runs the entire build inside a privileged Debian Bookworm container automatically.

**Prerequisite**: Docker Desktop (or Podman) installed and running.

```bash
./hardware/image/build/build-docker.sh \
  --board opi-zero-2w \
  --base-image ~/Downloads/orangepizero2w_1.0.0_debian_bookworm_server_linux6.1.31.7z
```

For Raspberry Pi:

```bash
./hardware/image/build/build-docker.sh \
  --board rpi-zero-2w \
  --base-image ~/Downloads/2024-11-19-raspios-bookworm-arm64-lite.img.xz
```

The wrapper installs all required build tools (Java 21 Temurin, Node 24, parted, e2fsprogs, etc.) inside the container on every run. The repo is mounted at `/repo` so output lands in `hardware/image/out/` on your host, and file ownership is restored to your user automatically.

All `assemble-image.sh` flags are forwarded unchanged:

```bash
./hardware/image/build/build-docker.sh \
  --board opi-zero-2w \
  --base-image ~/Downloads/... \
  --skip-artifacts-build
```

### On Linux — direct

The assembler runs directly as root. All tools below must be present before running a build.

**Required commands**:

```
7z          blkid       curl        e2fsck      gzip        losetup
mount       node        npm         parted      resize2fs   rsync
sha256sum   systemctl   tar         truncate    umount      unzip  xz
```

**Additional requirement on non-ARM64 hosts**:

```
qemu-aarch64-static
```

On a Debian/Ubuntu x86_64 machine you can install the missing tools with:

```bash
sudo apt install \
  p7zip-full curl rsync qemu-user-static \
  parted e2fsprogs util-linux xz-utils
```

Run from the repo root:

```bash
cd hardware/image/build

sudo CLIENT_BUILD_MODE=container \
  JAVA_HOME=/path/to/java21 \
  ./assemble-image.sh \
  --board opi-zero-2w \
  --base-image ~/Downloads/orangepizero2w_1.0.0_debian_bookworm_server_linux6.1.31.7z
```

On an ARM64 host, `CLIENT_BUILD_MODE` defaults to `host` and `JAVA_HOME` must point to a Java 21 installation. On x86_64, `CLIENT_BUILD_MODE=container` uses Docker or Podman to compile the client for `linux/arm64` without needing a local JDK.

### Building artifacts only (optional)

To compile and stage the server/client artifacts without assembling the full image — useful for iterating or caching the build step separately:

```bash
cd hardware/image/build
./build-artifacts.sh
```

Artifacts land in `hardware/image/out/staging/`. You can then run the full assembler with `--skip-artifacts-build` to reuse them:

```bash
sudo ./assemble-image.sh \
  --board opi-zero-2w \
  --skip-artifacts-build \
  --base-image ~/Downloads/orangepizero2w_...7z
```

### Build options

#### `build-artifacts.sh`

| Flag | Description |
|---|---|
| `--staging-dir <path>` | Override the staging output directory |
| `--version <value>` | Override the version label embedded in the manifest |
| `--client-build-mode <auto\|host\|container>` | How to compile the Next.js client (see below) |

Environment variables:

| Variable | Description |
|---|---|
| `CLIENT_BUILD_MODE` | `auto` (default) — uses `host` on ARM64, `container` elsewhere |
| `CLIENT_TARGET_PLATFORM` | Container platform (default: `linux/arm64`) |
| `CONTAINER_ENGINE` | Force `docker` or `podman` when multiple engines are installed |

#### `assemble-image.sh`

| Flag | Description |
|---|---|
| `--board <id>` | Board target — **required** (e.g. `opi-zero-2w`, `rpi-zero-2w`) |
| `--base-image <path>` | Local base image archive or `.img` file |
| `--base-image-url <url>` | Download base image and cache it |
| `--skip-artifacts-build` | Reuse an existing `out/staging/` directory |
| `--validate-only` | Check host prerequisites and inputs without building |
| `--keep-workdir` | Preserve the temporary work directory on exit (useful for debugging failures) |
| `--version <value>` | Override the version label in the image and manifest |

Environment variables:

| Variable | Description |
|---|---|
| `AMBROSIA_BASE_IMAGE_PATH` | Equivalent to `--base-image` |
| `AMBROSIA_BASE_IMAGE_URL` | Equivalent to `--base-image-url` |
| `IMAGE_EXPAND_SIZE` | How much to expand the base image before package installation (default: `4G`) |

> **Note**: The assembler deletes all previous image outputs in `out/` before each full rebuild. `out/cache/` is always preserved. File ownership inside `out/` is restored to the invoking user when the script exits, even after errors.

## Flash to microSD

### On macOS

Identify your SD card with `diskutil list` — it appears as an external disk. The SD card will show as `/dev/diskN` (e.g. `/dev/disk4`).

```bash
# Unmount partitions (keep the card plugged in)
diskutil unmountDisk /dev/diskN

# Flash — use /dev/rdiskN (raw device, 3-4x faster than /dev/diskN)
gunzip -c hardware/image/out/ambrosia-<board-id>-<version>.img.gz \
  | sudo dd of=/dev/rdiskN bs=4m status=progress

# Eject
diskutil eject /dev/diskN
```

### On Linux

Identify your SD card device:

```bash
lsblk
```

Flash the image (replace `/dev/sdX` with your device — **the whole disk, not a partition**):

```bash
gzip -dc hardware/image/out/ambrosia-<board-id>-<version>.img.gz \
  | sudo dd of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

### Verify the hash before booting

```bash
sha256sum hardware/image/out/ambrosia-<board-id>-<version>.img.gz
cat hardware/image/out/ambrosia-<board-id>-<version>.sha256
```

Both lines must show the same hash.

## Preseed (optional)

You can pre-configure the device before its first boot by writing an `ambrosia-device.env` file to the boot partition of the SD card. This is useful for operator provisioning — you can ship a pre-configured device without needing to connect to it interactively.

Supported keys:

| Key | Description | Default |
|---|---|---|
| `AMBROSIA_HOSTNAME` | Device hostname | `ambrosia-<board-short-name>-<machine-id-prefix>` (auto-generated) |
| `AMBROSIA_ADMIN_PASSWORD` | SSH password for the `ambrosia` user | `Ambrosia2026!` |
| `AMBROSIA_WIFI_COUNTRY` | ISO 3166-1 alpha-2 country code for Wi-Fi regulations | `US` |
| `AMBROSIA_LANG` | System locale | `en_US.UTF-8` |

The preseed file is consumed and deleted on first boot. A copy is archived to `/var/lib/ambrosia/consumed-device.env` for auditing. An example file (`ambrosia-device.env.example`) is already present on the boot partition of every image.

### On macOS — using debugfs

macOS cannot mount ext4 partitions natively. Use `debugfs` from Homebrew's `e2fsprogs` to write the file directly to the partition.

Install once:

```bash
brew install e2fsprogs
```

Create the preseed file locally:

```bash
cat > /tmp/ambrosia-device.env <<'EOF'
AMBROSIA_HOSTNAME=my-device
AMBROSIA_ADMIN_PASSWORD=my-password
AMBROSIA_WIFI_COUNTRY=MX
AMBROSIA_LANG=es_MX.UTF-8
EOF
```

Unmount the SD card (keep it plugged in) and open `debugfs` interactively:

```bash
diskutil unmountDisk /dev/diskN
sudo /opt/homebrew/opt/e2fsprogs/sbin/debugfs -w /dev/rdiskNs1
```

Inside the `debugfs` prompt, write and verify the file:

```
write /tmp/ambrosia-device.env /boot/ambrosia-device.env
cat /boot/ambrosia-device.env
quit
```

> Replace `diskN` with your SD card disk number (e.g. `disk4`). The partition is always `s1` on these images.

### On Linux

Mount the root partition after flashing:

```bash
sudo mount /dev/sdX1 /mnt/ambrosia-sd
```

Create the preseed file:

```bash
sudo tee /mnt/ambrosia-sd/boot/ambrosia-device.env > /dev/null <<'EOF'
AMBROSIA_HOSTNAME=my-device
AMBROSIA_ADMIN_PASSWORD=my-password
AMBROSIA_WIFI_COUNTRY=MX
AMBROSIA_LANG=es_MX.UTF-8
EOF

sync
sudo umount /mnt/ambrosia-sd
```

> **Raspberry Pi note**: on RPi OS Bookworm the FAT boot partition is also partition 1 (`/dev/sdX1`). The `ambrosia-firstboot` script detects both `/boot/firmware/` and `/boot/` automatically.

## First boot

First boot provisions the device and can take **1 to 3 minutes**. Progress is logged to `/var/log/ambrosia-firstboot.log`.

What happens on first boot:

1. A unique machine ID and SSH host keys are generated
2. The preseed file (if present) is loaded
3. Hostname, locale, Wi-Fi country, and admin password are applied
4. Phoenixd and Ambrosia configuration files are initialized from templates
5. The `ambrosia-firstboot` service marks itself complete and will not run again

**After first boot:**

- If the device cannot reach a known Wi-Fi network, a setup access point named `<hostname>-setup` will appear. Connect to it and open `http://10.42.1.1` in a browser to configure Wi-Fi via the captive portal.
- Once connected, the POS interface is reachable at `http://<hostname>.local` (mDNS via Avahi) or directly at the device IP on port 80.
- SSH is available:
  - **User**: `ambrosia`
  - **Password**: the value set in `AMBROSIA_ADMIN_PASSWORD` (default: `Ambrosia2026!`)

## Validate the image before flashing

The assembler runs a thorough verification pass before compressing the image — it checks that all binaries, service files, and client assets are present and valid, and that no forbidden state (SSH host keys, DB, Phoenix seed) remains. Inspect the manifest to confirm:

```bash
cat hardware/image/out/ambrosia-<board-id>-<version>.manifest.json
```

To do a deeper inspection on Linux, mount the image as a loop device:

```bash
gzip -dc hardware/image/out/ambrosia-<board-id>-<version>.img.gz \
  > /tmp/ambrosia-check.img

LOOPDEV=$(sudo losetup -f --show /tmp/ambrosia-check.img)
# Get the ext4 partition start offset
OFFSET=$(sudo parted -s -m "$LOOPDEV" unit B print | tr -d ';' \
  | awk -F: 'NR>2 && $5=="ext4" {gsub(/B/,"",$2); print $2; exit}')
PARTDEV=$(sudo losetup -f --show --offset "$OFFSET" /tmp/ambrosia-check.img)

sudo mount -o ro "$PARTDEV" /mnt/ambrosia-sd
file /mnt/ambrosia-sd/opt/ambrosia/client/server.js
file /mnt/ambrosia-sd/opt/ambrosia/server/ambrosia.jar

sudo umount /mnt/ambrosia-sd
sudo losetup -d "$PARTDEV" "$LOOPDEV"
rm /tmp/ambrosia-check.img
```

## Troubleshooting

**The image loops at first boot or takes more than 5 minutes.**
SSH into the device and check `/var/log/ambrosia-firstboot.log`. If SSH is not yet available, connect a serial console or HDMI monitor.

**`assemble-image.sh` fails midway.**
Rerun with `--keep-workdir` to preserve the mounted work directory and inspect what went wrong. Use `--validate-only` first to confirm all host tools are present.

**The image validates correctly via loop mount but behaves incorrectly after flashing.**
Suspect the SD card or reader. Try a different card or use `conv=fsync` and an explicit `sync` after `dd`. Verify the hash against the `.sha256` file.

**Client JavaScript files appear as ELF binaries in the build.**
This indicates a cross-compilation failure where the container built native ARM64 binaries instead of JavaScript. Clean `out/staging/` and rebuild. If the issue persists with `container` mode, try `--client-build-mode host` on an ARM64 machine.

**`qemu-aarch64-static` not found on an x86_64 host.**
Install it with `sudo apt install qemu-user-static` (Debian/Ubuntu) or the equivalent for your distribution.

**`build-docker.sh` fails with permission errors on the output directory.**
The wrapper passes your UID/GID into the container. If you see ownership issues, check that `SUDO_UID`/`SUDO_GID` are exported in your shell environment, or run the wrapper with `sudo -E` to preserve them.
