# OrangePi Zero 2W image build

This board target builds Ambrosia on top of the official Orange Pi Debian 12
Bookworm server image for `OrangePi Zero 2W`.

## Inputs

- Base image archive: `orangepizero2w_1.0.0_debian_bookworm_server_linux6.1.31.7z`
- Official board page:
  `https://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/service-and-support/Orange-Pi-Zero-2W.html`
- Phoenixd: `0.7.2` Linux ARM64

Direct vendor download URLs tend to move. The assembler therefore supports:

- `AMBROSIA_BASE_IMAGE_URL=<direct-archive-url>`
- `AMBROSIA_BASE_IMAGE_PATH=/path/to/orangepi-image.7z`

## Building on macOS

Use `build-docker.sh` — no host tools required beyond Docker Desktop:

```bash
./hardware/image/build/build-docker.sh \
  --board opi-zero-2w \
  --base-image ~/Downloads/orangepizero2w_1.0.0_debian_bookworm_server_linux6.1.31.7z
```

See `hardware/image/README.md` for full details.

## Host prerequisites (Linux only)

- root privileges
- `git`, `npm`, `node` (for building artifacts)
- `7z`, `blkid`, `curl`, `e2fsck`, `gzip`, `losetup`, `mount`, `openssl`, `parted`, `resize2fs`, `rsync`, `sha256sum`, `tar`, `truncate`, `umount`, `unzip`, `xz`
- `systemctl`
- `qemu-aarch64-static` if the build host is not `aarch64`

## Entry points

- `hardware/image/build/build-docker.sh --board opi-zero-2w` (macOS / any host with Docker)
- `hardware/image/build/build-artifacts.sh` (Linux, artifacts only)
- `hardware/image/build/assemble-image.sh --board opi-zero-2w` (Linux, full build)

## Outputs

- `hardware/image/out/ambrosia-opi-zero-2w-<version>.img.gz`
- `hardware/image/out/ambrosia-opi-zero-2w-<version>.sha256`
- `hardware/image/out/ambrosia-opi-zero-2w-<version>.manifest.json`
