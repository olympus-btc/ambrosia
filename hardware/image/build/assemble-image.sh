#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=hardware/image/build/lib.sh
source "$SCRIPT_DIR/lib.sh"

BOARD_ID=""
_remaining_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --board)
      [[ -n "${2:-}" ]] || { printf 'ERROR: --board requires an argument\n' >&2; exit 1; }
      BOARD_ID="$2"
      shift 2
      ;;
    *)       _remaining_args+=("$1"); shift ;;
  esac
done
set -- "${_remaining_args[@]+"${_remaining_args[@]}"}"
unset _remaining_args

[[ -n "$BOARD_ID" ]] || { printf 'Usage: sudo %s --board <board-id> [options]\n' "$(basename "$0")" >&2; exit 1; }

BOARD_DIR="$IMAGE_ROOT/boards/$BOARD_ID"
BOARD_ENV_FILE="$BOARD_DIR/board.env"
[[ -f "$BOARD_ENV_FILE" ]] || fail "Missing board definition: $BOARD_ENV_FILE"
# shellcheck source=/dev/null
source "$BOARD_ENV_FILE"
[[ -n "${BOARD_SHORT_NAME:-}" ]] || fail "board.env for '$BOARD_ID' is missing BOARD_SHORT_NAME"

OUTPUT_DIR="${OUTPUT_DIR:-$IMAGE_OUT_DIR}"
STAGING_DIR="${STAGING_DIR:-$IMAGE_STAGING_DIR}"
CACHE_DIR="${CACHE_DIR:-$IMAGE_CACHE_DIR}"
BASE_IMAGE_URL="${BASE_IMAGE_URL:-${AMBROSIA_BASE_IMAGE_URL:-}}"
BASE_IMAGE_PATH="${BASE_IMAGE_PATH:-${AMBROSIA_BASE_IMAGE_PATH:-}}"
IMAGE_EXPAND_SIZE="${IMAGE_EXPAND_SIZE:-4G}"
VALIDATE_ONLY=0
SKIP_ARTIFACTS_BUILD=0
KEEP_WORKDIR=0
OVERRIDE_VERSION=""

usage() {
  cat <<EOF
Usage: sudo $(basename "$0") --board <board-id> [options]

Options:
  --board <id>              Board target (e.g. opi-zero-2w, rpi-zero-2w) [required]
  --base-image <path>       Reuse a local base image archive or .img
  --base-image-url <url>    Download the official base image archive to cache
  --skip-artifacts-build    Reuse an existing staging directory
  --validate-only           Validate host prerequisites and input contracts only
  --keep-workdir            Keep the temporary work directory for inspection
  --version <value>         Override the image version label
  -h, --help                Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-image)
      BASE_IMAGE_PATH="$2"
      shift 2
      ;;
    --base-image-url)
      BASE_IMAGE_URL="$2"
      shift 2
      ;;
    --skip-artifacts-build)
      SKIP_ARTIFACTS_BUILD=1
      shift
      ;;
    --validate-only)
      VALIDATE_ONLY=1
      shift
      ;;
    --keep-workdir)
      KEEP_WORKDIR=1
      shift
      ;;
    --version)
      OVERRIDE_VERSION="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

ROOTFS_MNT=""
BOOT_MNT=""
LOOPDEV=""
WORKDIR=""
CHROOT_MOUNTS=()
PART_LOOPDEVS=()

on_error() {
  local exit_code="$1"
  local line_no="$2"
  fail "assemble failed at line $line_no with exit code $exit_code"
}

trap 'on_error $? $LINENO' ERR

cleanup() {
  local status=$?
  set +e
  if [[ -n "$ROOTFS_MNT" ]]; then
    for mountpoint in "${CHROOT_MOUNTS[@]}"; do
      umount "$ROOTFS_MNT$mountpoint" >/dev/null 2>&1 || true
    done
  fi
  [[ -n "$BOOT_MNT" ]] && mountpoint -q "$BOOT_MNT" && umount "$BOOT_MNT" >/dev/null 2>&1 || true
  [[ -n "$ROOTFS_MNT" ]] && mountpoint -q "$ROOTFS_MNT" && umount "$ROOTFS_MNT" >/dev/null 2>&1 || true
  for _pdev in "${PART_LOOPDEVS[@]+"${PART_LOOPDEVS[@]}"}"; do
    losetup "$_pdev" >/dev/null 2>&1 && losetup -d "$_pdev" >/dev/null 2>&1 || true
  done
  [[ -n "$LOOPDEV" ]] && losetup "$LOOPDEV" >/dev/null 2>&1 && losetup -d "$LOOPDEV" >/dev/null 2>&1 || true
  if [[ -n "$WORKDIR" && "$KEEP_WORKDIR" -eq 0 ]]; then
    rm -rf "$WORKDIR"
  fi
  restore_path_ownership "$OUTPUT_DIR"
  [[ -n "$WORKDIR" ]] && restore_path_ownership "$WORKDIR"
  exit "$status"
}
trap cleanup EXIT

detach_image_mounts() {
  if [[ -n "$ROOTFS_MNT" ]]; then
    local mountpoint
    for mountpoint in "${CHROOT_MOUNTS[@]}"; do
      umount "$ROOTFS_MNT$mountpoint" >/dev/null 2>&1 || true
    done
    CHROOT_MOUNTS=()
  fi

  sync

  if [[ -n "$BOOT_MNT" ]] && mountpoint -q "$BOOT_MNT"; then
    umount "$BOOT_MNT"
  fi

  if [[ -n "$ROOTFS_MNT" ]] && mountpoint -q "$ROOTFS_MNT"; then
    umount "$ROOTFS_MNT"
  fi

  sync

  for _pdev in "${PART_LOOPDEVS[@]+"${PART_LOOPDEVS[@]}"}"; do
    losetup -d "$_pdev" 2>/dev/null || true
  done
  PART_LOOPDEVS=()

  if [[ -n "$LOOPDEV" ]]; then
    losetup -d "$LOOPDEV"
  fi

  BOOT_MNT=""
  ROOTFS_MNT=""
  LOOPDEV=""
}

require_nonempty_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "Required file is missing: $path"
  [[ -s "$path" ]] || fail "Required file is empty: $path"
}

require_valid_json_file() {
  local path="$1"
  require_nonempty_file "$path"
  node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'))" "$path" >/dev/null \
    || fail "Required JSON file is invalid: $path"
}

require_sane_json_text_file() {
  local path="$1"
  require_nonempty_file "$path"
  node -e "const fs=require('node:fs'); const path=process.argv[1]; const sample=fs.readFileSync(path); const prefix=sample.subarray(0, Math.min(sample.length, 4096)); if (prefix.includes(0)) { throw new Error('NUL byte found in JSON file prefix: ' + path); } JSON.parse(sample.toString('utf8'));" "$path" >/dev/null \
    || fail "Required JSON file is invalid or corrupt: $path"
}

require_sane_javascript_text_file() {
  local path="$1"
  require_nonempty_file "$path"
  node -e "const fs=require('node:fs'); const path=process.argv[1]; const sample=fs.readFileSync(path); if (sample.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))) { throw new Error('ELF binary found where JavaScript was expected: ' + path); } const prefix=sample.subarray(0, Math.min(sample.length, 4096)); if (prefix.includes(0)) { throw new Error('NUL byte found in JavaScript file prefix: ' + path); }" "$path" >/dev/null \
    || fail "Required JavaScript file is invalid: $path"
}

require_host_dependencies() {
  local deps=(
    blkid
    curl
    e2fsck
    gzip
    losetup
    lsblk
    mount
    openssl
    partx
    parted
    resize2fs
    rsync
    sha256sum
    truncate
    tar
    umount
    unzip
    xz
    7z
    systemctl
  )

  for dep in "${deps[@]}"; do
    require_cmd "$dep"
  done

  if [[ "$(id -u)" -ne 0 ]]; then
    fail "This script must run as root to manage loop devices and mounts"
  fi

  if [[ "$(uname -m)" != "aarch64" ]]; then
    require_cmd qemu-aarch64-static
  fi
}

clean_previous_outputs() {
  log "Cleaning previous image outputs"

  rm -rf "$STAGING_DIR"

  find "$OUTPUT_DIR" -maxdepth 1 -mindepth 1 \
    \( \
      -type d \( -name ".assemble-${BOARD_ID}-*" -o -name ".client-workspace-*" -o -name "img-check" \) -o \
      -type f \( -name "ambrosia-${BOARD_ID}-*.img.gz" -o -name "ambrosia-${BOARD_ID}-*.sha256" -o -name "ambrosia-${BOARD_ID}-*.manifest.json" \) \
    \) \
    -exec rm -rf {} +
}

ensure_artifacts() {
  if [[ "$SKIP_ARTIFACTS_BUILD" -eq 1 ]]; then
    [[ -f "$STAGING_DIR/manifest.json" ]] || fail "Missing staging manifest at $STAGING_DIR/manifest.json"
    [[ -f "$STAGING_DIR/server/ambrosia.jar" ]] || fail "Missing staged server artifact at $STAGING_DIR/server/ambrosia.jar"
    [[ -f "$STAGING_DIR/client/server.js" ]] || fail "Missing staged client standalone server at $STAGING_DIR/client/server.js"
    [[ -d "$STAGING_DIR/client/.next/static" ]] || fail "Missing staged client static assets at $STAGING_DIR/client/.next/static"
    return
  fi

  local args=(--staging-dir "$STAGING_DIR")
  if [[ -n "$OVERRIDE_VERSION" ]]; then
    args+=(--version "$OVERRIDE_VERSION")
  fi
  "$SCRIPT_DIR/build-artifacts.sh" "${args[@]}"
}

cache_download() {
  local url="$1"
  local destination="$2"

  if [[ -f "$destination" ]]; then
    log "Reusing cached file $(basename "$destination")"
    return
  fi

  log "Downloading $(basename "$destination")"
  curl -fL --retry 3 --retry-delay 2 -o "$destination" "$url"
}

prepare_base_image() {
  local source_path=""
  if [[ -n "$BASE_IMAGE_PATH" ]]; then
    [[ -f "$BASE_IMAGE_PATH" ]] || fail "Base image path not found: $BASE_IMAGE_PATH"
    source_path="$BASE_IMAGE_PATH"
  elif [[ -f "$CACHE_DIR/$BASE_IMAGE_FILENAME" ]]; then
    source_path="$CACHE_DIR/$BASE_IMAGE_FILENAME"
  else
    [[ -n "$BASE_IMAGE_URL" ]] || fail "No base image source provided. Set AMBROSIA_BASE_IMAGE_URL or pass --base-image-url/--base-image"
    source_path="$CACHE_DIR/$BASE_IMAGE_FILENAME"
    cache_download "$BASE_IMAGE_URL" "$source_path"
  fi

  local extension="${source_path##*.}"
  local image_path="$WORKDIR/base.img"

  case "$extension" in
    img)
      cp "$source_path" "$image_path"
      ;;
    gz)
      gzip -dc "$source_path" > "$image_path"
      ;;
    xz)
      xz -dc "$source_path" > "$image_path"
      ;;
    7z)
      7z e -y "-o$WORKDIR" "$source_path" >/dev/null
      local extracted
      extracted=$(find "$WORKDIR" -maxdepth 1 -type f -name '*.img' | sort | head -n 1)
      [[ -n "${extracted:-}" ]] || fail "Archive $source_path did not contain an .img file"
      mv "$extracted" "$image_path"
      ;;
    *)
      fail "Unsupported base image format: $source_path"
      ;;
  esac

  BASE_IMAGE_WORK_PATH="$image_path"
}

expand_base_image() {
  local loopdev="" last_num="" part_start_b="" part_fstype="" part_loopdev=""

  log "Expanding base image by $IMAGE_EXPAND_SIZE before package installation"
  truncate -s "+$IMAGE_EXPAND_SIZE" "$BASE_IMAGE_WORK_PATH"

  # Attach without -P: we don't need /dev/loopNpM nodes — we'll use --offset instead.
  loopdev=$(losetup -f --show "$BASE_IMAGE_WORK_PATH")

  # parted -m gives machine-readable colon-separated output; strip semicolons and
  # keep only partition lines (lines that start with a digit).
  while IFS=: read -r num start _end _size fstype _rest; do
    [[ "$num" =~ ^[0-9]+$ ]] || continue
    last_num="$num"
    part_start_b="${start%B}"
    part_fstype="$fstype"
  done < <(parted -s -m "$loopdev" unit B print 2>/dev/null | tr -d ';' | grep -E '^[0-9]')

  if [[ -z "$last_num" ]]; then
    losetup -d "$loopdev" 2>/dev/null || true
    fail "Could not identify the last partition while expanding $BASE_IMAGE_WORK_PATH"
  fi

  parted -s "$loopdev" -- resizepart "$last_num" 100%
  losetup -d "$loopdev"

  # Attach only the last partition via byte offset — no partition device nodes needed.
  # Not tracked in PART_LOOPDEVS: this device is temporary to this function and its
  # loop number gets recycled before attach_and_mount_image runs, which would cause
  # detach_image_mounts to prematurely release LOOPDEV.
  part_loopdev=$(losetup -f --show --offset "$part_start_b" "$BASE_IMAGE_WORK_PATH")

  case "${part_fstype:-}" in
    ext4|ext3|ext2|"")
      e2fsck -fy "$part_loopdev" >/dev/null 2>&1 || true
      if ! resize2fs "$part_loopdev" >/dev/null; then
        losetup -d "$part_loopdev" 2>/dev/null || true
        fail "resize2fs failed on partition $last_num of $BASE_IMAGE_WORK_PATH"
      fi
      ;;
    *)
      warn "Skipping filesystem resize for unsupported type '${part_fstype:-unknown}' on partition $last_num"
      ;;
  esac

  losetup -d "$part_loopdev"
}

attach_and_mount_image() {
  # Attach without -P: /dev/loopNpM nodes may not appear in containers when
  # the loop kernel module was loaded with max_part=0 (Docker Desktop default).
  # Instead, create a dedicated loop device per partition using --offset/--sizelimit.
  LOOPDEV=$(losetup -f --show "$BASE_IMAGE_WORK_PATH")

  local boot_part="" root_part=""
  local partition_count=0

  while IFS=: read -r num start _end size fstype _rest; do
    [[ "$num" =~ ^[0-9]+$ ]] || continue
    local start_b="${start%B}"
    local size_b="${size%B}"
    ((partition_count++)) || true

    local part_dev
    part_dev=$(losetup -f --show --offset "$start_b" --sizelimit "$size_b" "$BASE_IMAGE_WORK_PATH")
    PART_LOOPDEVS+=("$part_dev")

    # parted may not detect the filesystem type if the partition is freshly written;
    # fall back to blkid in that case.
    local detected_fstype="$fstype"
    if [[ -z "$detected_fstype" ]]; then
      detected_fstype=$(blkid -o value -s TYPE "$part_dev" 2>/dev/null || true)
    fi

    case "$detected_fstype" in
      fat32|fat16|vfat)
        [[ -z "$boot_part" ]] && boot_part="$part_dev"
        ;;
      ext4|ext3|ext2|btrfs|xfs)
        [[ -z "$root_part" ]] && root_part="$part_dev"
        ;;
    esac
  done < <(parted -s -m "$LOOPDEV" unit B print 2>/dev/null | tr -d ';' | grep -E '^[0-9]')

  if [[ "${#PART_LOOPDEVS[@]}" -eq 0 ]]; then
    fail "No partitions found in $BASE_IMAGE_WORK_PATH"
  fi

  # Fallback: if filesystem type was not identified, treat the last partition as
  # root and (if there are multiple) the first as boot.
  if [[ -z "$root_part" ]]; then
    root_part="${PART_LOOPDEVS[-1]}"
    if [[ "${#PART_LOOPDEVS[@]}" -ge 2 && -z "$boot_part" ]]; then
      boot_part="${PART_LOOPDEVS[0]}"
    fi
  fi

  [[ -n "$root_part" ]] || fail "Could not detect root partition on $LOOPDEV (found $partition_count partition(s))"

  ROOTFS_MNT="$WORKDIR/rootfs"
  mkdir -p "$ROOTFS_MNT"
  mount "$root_part" "$ROOTFS_MNT"

  if [[ -n "$boot_part" ]]; then
    BOOT_MNT="$WORKDIR/boot"
    mkdir -p "$BOOT_MNT"
    mount "$boot_part" "$BOOT_MNT"
  elif [[ "$partition_count" -eq 1 ]]; then
    BOOT_MNT="$ROOTFS_MNT/boot"
    mkdir -p "$BOOT_MNT"
    log "No separate boot partition detected on $LOOPDEV; using rootfs /boot"
  else
    fail "Could not detect boot partition on $LOOPDEV"
  fi
}

setup_chroot_mounts() {
  mkdir -p "$ROOTFS_MNT"/{dev,proc,sys,run}
  for dir in /dev /proc /sys /run; do
    mount --bind "$dir" "$ROOTFS_MNT$dir"
    CHROOT_MOUNTS+=("$dir")
  done

  if [[ "$(uname -m)" != "aarch64" ]]; then
    install -m 0755 "$(command -v qemu-aarch64-static)" "$ROOTFS_MNT/usr/bin/qemu-aarch64-static"
  fi
}

run_in_chroot() {
  chroot "$ROOTFS_MNT" /usr/bin/env -i HOME=/root PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash -lc "$*"
}

disable_service_autostart() {
  cat > "$ROOTFS_MNT/usr/sbin/policy-rc.d" <<'EOF'
#!/bin/sh
exit 101
EOF
  chmod 0755 "$ROOTFS_MNT/usr/sbin/policy-rc.d"
}

remove_service_autostart_guard() {
  rm -f "$ROOTFS_MNT/usr/sbin/policy-rc.d"
}

install_board_packages() {
  local packages_file="$BOARD_DIR/packages.txt"
  [[ -f "$packages_file" ]] || fail "Missing packages list: $packages_file"

  disable_service_autostart
  run_in_chroot "apt-get update"
  if [[ "${JAVA_APT_REPO:-}" == "temurin" ]]; then
    run_in_chroot "apt-get install -y wget gnupg ca-certificates apt-transport-https"
    run_in_chroot "mkdir -p /etc/apt/keyrings && wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor >/etc/apt/keyrings/adoptium.gpg"
    run_in_chroot "printf 'deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main\n' >/etc/apt/sources.list.d/adoptium.list"
    run_in_chroot "apt-get update"
  fi
  if [[ "${NODE_APT_REPO:-}" == "nodesource" ]]; then
    run_in_chroot "apt-get install -y curl gnupg ca-certificates"
    run_in_chroot "mkdir -p /etc/apt/keyrings && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor >/etc/apt/keyrings/nodesource.gpg"
    run_in_chroot "printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main\n' >/etc/apt/sources.list.d/nodesource.list"
    run_in_chroot "apt-get update"
  fi

  mapfile -t packages < <(grep -Ev '^\s*(#|$)' "$packages_file")
  [[ "${#packages[@]}" -gt 0 ]] || fail "No packages listed in $packages_file"
  run_in_chroot "DEBIAN_FRONTEND=noninteractive apt-get install -y ${packages[*]}"
  remove_service_autostart_guard
}

ensure_runtime_user() {
  run_in_chroot "getent group ${RUNTIME_GROUP} >/dev/null 2>&1 || groupadd --gid ${RUNTIME_GID} ${RUNTIME_GROUP} 2>/dev/null || groupadd ${RUNTIME_GROUP}"
  run_in_chroot "id -u ${RUNTIME_USER} >/dev/null 2>&1 || useradd --uid ${RUNTIME_UID} --gid ${RUNTIME_GROUP} --groups sudo,netdev,audio,video,plugdev --create-home --shell /bin/bash ${RUNTIME_USER} 2>/dev/null || useradd --gid ${RUNTIME_GROUP} --groups sudo,netdev,audio,video,plugdev --create-home --shell /bin/bash ${RUNTIME_USER}"
  run_in_chroot "id ${RUNTIME_USER} >/dev/null 2>&1 || exit 1"
  run_in_chroot "install -d -m 0755 -o ${RUNTIME_USER} -g ${RUNTIME_GROUP} /opt/ambrosia/server /opt/ambrosia/client /opt/ambrosia/bin /etc/ambrosia /var/lib/ambrosia"
}

install_ambrosia_artifacts() {
  rsync -a --delete "$STAGING_DIR/server/" "$ROOTFS_MNT/opt/ambrosia/server/"
  rsync -a --delete "$STAGING_DIR/client/" "$ROOTFS_MNT/opt/ambrosia/client/"

  cat > "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-server" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export HOME=/home/${RUNTIME_USER}
export AMBROSIA_DATADIR=/home/${RUNTIME_USER}/.Ambrosia-POS
export PHOENIX_DATADIR=/home/${RUNTIME_USER}/.phoenix
exec java -jar /opt/ambrosia/server/ambrosia.jar "\$@"
EOF

  cat > "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-client" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd /opt/ambrosia/client
export HOME=/home/${RUNTIME_USER}
export NODE_ENV=production
export HOSTNAME=127.0.0.1
export PORT=3000
exec /usr/bin/node /opt/ambrosia/client/server.js
EOF

  chmod 0755 "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-server" "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-client"
  run_in_chroot "chown -R ${RUNTIME_USER}:${RUNTIME_GROUP} /opt/ambrosia"
}

install_phoenixd() {
  local archive="$CACHE_DIR/$PHOENIXD_ARCHIVE"
  cache_download "$PHOENIXD_URL" "$archive"

  mkdir -p "$WORKDIR/phoenixd"
  unzip -oq "$archive" -d "$WORKDIR/phoenixd"
  local binary cli
  binary=$(find "$WORKDIR/phoenixd" -maxdepth 2 -type f -name phoenixd | head -n 1)
  cli=$(find "$WORKDIR/phoenixd" -maxdepth 2 -type f -name phoenix-cli | head -n 1)
  [[ -n "${binary:-}" ]] || fail "phoenixd archive did not contain phoenixd"
  [[ -n "${cli:-}" ]] || fail "phoenixd archive did not contain phoenix-cli"

  install -m 0755 "$binary" "$ROOTFS_MNT/usr/local/bin/phoenixd"
  install -m 0755 "$cli" "$ROOTFS_MNT/usr/local/bin/phoenix-cli"
}

install_repo_assets() {
  install -d "$ROOTFS_MNT/opt/ambrosia/bin" "$ROOTFS_MNT/etc/ambrosia" "$ROOTFS_MNT/etc/systemd/system"

  install -m 0755 "$IMAGE_ROOT/common/portal/ambrosia-wifi-portal" "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-wifi-portal"
  install -m 0755 "$IMAGE_ROOT/common/firstboot/ambrosia-firstboot" "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-firstboot"

  install -m 0644 "$IMAGE_ROOT/common/portal/ambrosia-wifi-portal.service" "$ROOTFS_MNT/etc/systemd/system/ambrosia-wifi-portal.service"
  install -m 0644 "$IMAGE_ROOT/common/firstboot/ambrosia-firstboot.service" "$ROOTFS_MNT/etc/systemd/system/ambrosia-firstboot.service"
  install -m 0644 "$IMAGE_ROOT/common/systemd/ambrosia.service" "$ROOTFS_MNT/etc/systemd/system/ambrosia.service"
  install -m 0644 "$IMAGE_ROOT/common/systemd/ambrosia-client.service" "$ROOTFS_MNT/etc/systemd/system/ambrosia-client.service"
  install -m 0644 "$IMAGE_ROOT/common/systemd/phoenixd.service" "$ROOTFS_MNT/etc/systemd/system/phoenixd.service"

  install -m 0644 "$IMAGE_ROOT/common/templates/Caddyfile.template" "$ROOTFS_MNT/etc/ambrosia/Caddyfile.template"
  install -m 0644 "$IMAGE_ROOT/common/templates/ambrosia.conf.stub" "$ROOTFS_MNT/etc/ambrosia/ambrosia.conf.stub"
  install -m 0644 "$IMAGE_ROOT/common/templates/phoenix.conf.stub" "$ROOTFS_MNT/etc/ambrosia/phoenix.conf.stub"
  install -m 0644 "$IMAGE_ROOT/common/templates/ambrosia-device.env.example" "$BOOT_MNT/ambrosia-device.env.example"

  printf 'BOARD_SHORT_NAME=%s\n' "$BOARD_SHORT_NAME" > "$ROOTFS_MNT/etc/ambrosia/board-identity"
  chmod 0644 "$ROOTFS_MNT/etc/ambrosia/board-identity"

  if [[ -f "$ROOTFS_MNT/usr/lib/raspberrypi-sys-mods/firstboot" ]]; then
    printf 'ambrosia:%s\n' "$(openssl passwd -6 'Ambrosia2026!')" > "$BOOT_MNT/userconf.txt"
  fi

  sed -i \
    -e "s/__RUNTIME_USER__/${RUNTIME_USER}/g" \
    -e "s/__RUNTIME_GROUP__/${RUNTIME_GROUP}/g" \
    "$ROOTFS_MNT/etc/systemd/system/ambrosia.service" \
    "$ROOTFS_MNT/etc/systemd/system/ambrosia-client.service" \
    "$ROOTFS_MNT/etc/systemd/system/phoenixd.service"
}

verify_client_runtime_artifacts() {
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/client/server.js"
  require_sane_javascript_text_file "$ROOTFS_MNT/opt/ambrosia/client/server.js"
  require_sane_json_text_file "$ROOTFS_MNT/opt/ambrosia/client/package.json"
  require_valid_json_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/@swc/helpers/package.json"
  require_valid_json_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/tslib/package.json"
  require_sane_javascript_text_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/next/dist/compiled/comment-json/index.js"
  require_sane_javascript_text_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/next/dist/build/next-config-ts/transpile-config.js"
  [[ -d "$ROOTFS_MNT/opt/ambrosia/client/.next/static" ]] || fail "Mounted image is missing client static assets"
  run_in_chroot "chown -R ${RUNTIME_USER}:${RUNTIME_GROUP} /opt/ambrosia/client"
}

write_base_configuration() {
  run_in_chroot "install -d -m 0700 -o ${RUNTIME_USER} -g ${RUNTIME_GROUP} /home/${RUNTIME_USER}/.phoenix /home/${RUNTIME_USER}/.Ambrosia-POS"
  install -d "$ROOTFS_MNT/etc/caddy"
  cp "$IMAGE_ROOT/common/templates/Caddyfile.template" "$ROOTFS_MNT/etc/caddy/Caddyfile"
  cp "$IMAGE_ROOT/common/templates/ambrosia.conf.stub" "$ROOTFS_MNT/home/${RUNTIME_USER}/.Ambrosia-POS/ambrosia.conf"
  cp "$IMAGE_ROOT/common/templates/phoenix.conf.stub" "$ROOTFS_MNT/home/${RUNTIME_USER}/.phoenix/phoenix.conf"
  run_in_chroot "chown -R ${RUNTIME_USER}:${RUNTIME_GROUP} /home/${RUNTIME_USER}/.phoenix /home/${RUNTIME_USER}/.Ambrosia-POS"
}

enable_services() {
  systemctl --root="$ROOTFS_MNT" disable dnsmasq.service hostapd.service >/dev/null 2>&1 || true
  systemctl --root="$ROOTFS_MNT" enable \
    ambrosia-firstboot.service \
    ambrosia-wifi-portal.service \
    ambrosia.service \
    ambrosia-client.service \
    phoenixd.service \
    caddy.service \
    NetworkManager.service \
    avahi-daemon.service >/dev/null
}

clean_forbidden_state() {
  rm -f "$ROOTFS_MNT/home/${RUNTIME_USER}/.phoenix/seed.dat"
  rm -f "$ROOTFS_MNT/home/${RUNTIME_USER}/.Ambrosia-POS/ambrosia.db"
  rm -f "$ROOTFS_MNT/home/${RUNTIME_USER}/.Ambrosia-POS/keystore.jks"
  rm -f "$ROOTFS_MNT/etc/ssh/ssh_host_"*
  : > "$ROOTFS_MNT/etc/machine-id"
  rm -f "$ROOTFS_MNT/var/lib/dbus/machine-id"
  ln -sf /etc/machine-id "$ROOTFS_MNT/var/lib/dbus/machine-id"
  rm -rf "$ROOTFS_MNT/var/lib/caddy/.local/share/caddy"/* 2>/dev/null || true
  rm -f "$ROOTFS_MNT/var/lib/caddy/.config/caddy/autosave.json"
  rm -rf "$ROOTFS_MNT/var/log/journal"/* 2>/dev/null || true
  rm -rf "$ROOTFS_MNT/var/log/"*.log "$ROOTFS_MNT/var/log/"*.gz 2>/dev/null || true
  rm -f "$ROOTFS_MNT/var/lib/ambrosia/firstboot-complete"
  if [[ "$(uname -m)" != "aarch64" ]]; then
    rm -f "$ROOTFS_MNT/usr/bin/qemu-aarch64-static"
  fi
}

verify_mounted_image() {
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/server/ambrosia.jar"
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-server"
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-client"
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-firstboot"
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/bin/ambrosia-wifi-portal"
  require_nonempty_file "$ROOTFS_MNT/opt/ambrosia/client/server.js"
  require_sane_javascript_text_file "$ROOTFS_MNT/opt/ambrosia/client/server.js"
  require_sane_json_text_file "$ROOTFS_MNT/opt/ambrosia/client/package.json"
  require_valid_json_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/@swc/helpers/package.json"
  require_valid_json_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/tslib/package.json"
  require_sane_javascript_text_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/next/dist/compiled/comment-json/index.js"
  require_sane_javascript_text_file "$ROOTFS_MNT/opt/ambrosia/client/node_modules/next/dist/build/next-config-ts/transpile-config.js"
  [[ -d "$ROOTFS_MNT/opt/ambrosia/client/.next/static" ]] || fail "Mounted image is missing /opt/ambrosia/client/.next/static"
  require_nonempty_file "$ROOTFS_MNT/etc/ambrosia/board-identity"
  require_nonempty_file "$ROOTFS_MNT/etc/ambrosia/Caddyfile.template"
  require_nonempty_file "$ROOTFS_MNT/etc/systemd/system/ambrosia-firstboot.service"
  require_nonempty_file "$ROOTFS_MNT/etc/systemd/system/ambrosia-wifi-portal.service"
  require_nonempty_file "$ROOTFS_MNT/etc/systemd/system/ambrosia-client.service"
  require_nonempty_file "$ROOTFS_MNT/etc/systemd/system/ambrosia.service"
  require_nonempty_file "$ROOTFS_MNT/etc/systemd/system/phoenixd.service"
  [[ -L "$ROOTFS_MNT/etc/systemd/system/multi-user.target.wants/ambrosia-firstboot.service" ]] || fail "ambrosia-firstboot.service was not enabled"
  [[ ! -e "$ROOTFS_MNT/home/${RUNTIME_USER}/.phoenix/seed.dat" ]] || fail "Forbidden state present: phoenix seed.dat"
  [[ ! -e "$ROOTFS_MNT/home/${RUNTIME_USER}/.Ambrosia-POS/ambrosia.db" ]] || fail "Forbidden state present: ambrosia.db"
  if compgen -G "$ROOTFS_MNT/etc/ssh/ssh_host_*" >/dev/null; then
    fail "Forbidden state present: SSH host keys"
  fi
}

emit_outputs() {
  local version="${OVERRIDE_VERSION:-$(resolve_version)}"
  local safe_version
  safe_version=$(sanitize_version_for_filename "$version")
  local image_base="ambrosia-${BOARD_ID}-${safe_version}"
  local image_gz="$OUTPUT_DIR/${image_base}.img.gz"
  local hash_file="$OUTPUT_DIR/${image_base}.sha256"
  local manifest_file="$OUTPUT_DIR/${image_base}.manifest.json"
  local build_time_utc
  local commit_sha
  local image_sha

  mkdir -p "$OUTPUT_DIR"
  gzip -c "$BASE_IMAGE_WORK_PATH" > "$image_gz"
  image_sha=$(sha256sum "$image_gz" | awk '{print $1}')
  printf '%s  %s\n' "$image_sha" "$(basename "$image_gz")" > "$hash_file"

  build_time_utc=$(resolve_build_timestamp)
  commit_sha=$(resolve_commit_sha)

  write_json_file "$manifest_file" "$(cat <<EOF
{
  "board_id": "$(json_escape "$BOARD_ID")",
  "board_name": "$(json_escape "$BOARD_NAME")",
  "build_time_utc": "$(json_escape "$build_time_utc")",
  "commit_sha": "$(json_escape "$commit_sha")",
  "version": "$(json_escape "$version")",
  "base_image": {
    "filename": "$(json_escape "$BASE_IMAGE_FILENAME")",
    "page_url": "$(json_escape "$BASE_IMAGE_PAGE_URL")"
  },
  "phoenixd": {
    "version": "$(json_escape "$PHOENIXD_VERSION")",
    "archive": "$(json_escape "$PHOENIXD_ARCHIVE")"
  },
  "image": {
    "file": "$(json_escape "$(basename "$image_gz")")",
    "sha256": "$(json_escape "$image_sha")"
  }
}
EOF
)"

  log "Image ready:"
  log "  $image_gz"
  log "  $hash_file"
  log "  $manifest_file"
}

require_host_dependencies

if [[ "$VALIDATE_ONLY" -eq 0 && "$SKIP_ARTIFACTS_BUILD" -eq 0 ]]; then
  clean_previous_outputs
fi

if [[ "$VALIDATE_ONLY" -eq 1 ]]; then
  if [[ "$SKIP_ARTIFACTS_BUILD" -eq 1 ]]; then
    [[ -f "$STAGING_DIR/manifest.json" ]] || fail "Missing staging manifest at $STAGING_DIR/manifest.json"
  else
    require_cmd git
    require_cmd npm
  fi
  log "Validation complete"
  exit 0
fi

ensure_artifacts

WORKDIR=$(mktemp -d "$OUTPUT_DIR/.assemble-${BOARD_ID}-XXXXXX")
log "Preparing base image"
prepare_base_image
log "Expanding base image"
expand_base_image
log "Attaching and mounting image"
attach_and_mount_image
log "Setting up chroot mounts"
setup_chroot_mounts
log "Installing board packages"
install_board_packages
log "Ensuring runtime user"
ensure_runtime_user
log "Installing Ambrosia artifacts"
install_ambrosia_artifacts
log "Installing phoenixd"
install_phoenixd
log "Installing repo assets"
install_repo_assets
log "Verifying staged client runtime dependencies"
verify_client_runtime_artifacts
log "Writing base configuration"
write_base_configuration
log "Enabling services"
enable_services
log "Cleaning forbidden state"
clean_forbidden_state
log "Verifying mounted image"
verify_mounted_image
log "Detaching image mounts"
detach_image_mounts
log "Writing final image artifacts"
emit_outputs
