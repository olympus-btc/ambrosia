# Raspberry Pi Zero 2W image build

This board target builds Ambrosia on top of the official Raspberry Pi OS Lite 64-bit
Debian Bookworm image for the `Raspberry Pi Zero 2W`.

## Inputs

- Base image archive: `2024-11-19-raspios-bookworm-arm64-lite.img.xz`
- Official board page:
  `https://www.raspberrypi.com/software/operating-systems/#raspberry-pi-os-64-bit`
- Phoenixd: `0.7.2` Linux ARM64

The base image filename changes with each release. Always use the latest Raspberry Pi OS
Lite 64-bit (Bookworm) image. Provide the path or URL at build time:

- `AMBROSIA_BASE_IMAGE_URL=<direct-archive-url>`
- `AMBROSIA_BASE_IMAGE_PATH=/path/to/raspios-image.img.xz`

## Boot partition path

Raspberry Pi OS Bookworm mounts the FAT boot partition at `/boot/firmware/` inside the
rootfs (unlike the classic `/boot/` layout used by other boards). The `ambrosia-firstboot`
script detects both paths automatically — no manual configuration is needed.

The optional preseed file must be written to the FAT partition before first boot. After
flashing the image, the FAT partition is typically exposed as partition 1 (`/dev/sdX1`).

## Host prerequisites

- root privileges
- `git`, `npm`, `node` (for building artifacts)
- `7z`, `blkid`, `curl`, `e2fsck`, `gzip`, `losetup`, `lsblk`, `mount`, `openssl`, `partx`, `parted`, `resize2fs`, `rsync`, `sha256sum`, `tar`, `truncate`, `umount`, `unzip`, `xz`
- `systemctl`
- `qemu-aarch64-static` if the build host is not `aarch64`

## Entry points

- `hardware/image/build/build-artifacts.sh`
- `hardware/image/build/assemble-image.sh --board rpi-zero-2w`

## Outputs

- `hardware/image/out/ambrosia-rpi-zero-2w-<version>.img.gz`
- `hardware/image/out/ambrosia-rpi-zero-2w-<version>.sha256`
- `hardware/image/out/ambrosia-rpi-zero-2w-<version>.manifest.json`
