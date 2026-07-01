#!/usr/bin/env bash
# Wrapper that runs assemble-image.sh inside a privileged Debian Bookworm container.
# Needed on macOS (and any host that lacks losetup, chroot, parted, etc.).
# Accepts the same flags as assemble-image.sh and passes them through unchanged.
#
# Usage:
#   ./hardware/image/build/build-docker.sh --board opi-zero-2w --base-image ~/Downloads/image.7z
#   ./hardware/image/build/build-docker.sh --board rpi-zero-2w --base-image ~/Downloads/image.img.xz
#   CONTAINER_ENGINE=podman ./hardware/image/build/build-docker.sh --board opi-zero-2w ...

set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../../.." && pwd)

log()  { printf '[build-docker] %s\n' "$*"; }
warn() { printf '[build-docker] WARN: %s\n' "$*" >&2; }
fail() { printf '[build-docker] ERROR: %s\n' "$*" >&2; exit 1; }

# Pure-bash realpath fallback (macOS may not have GNU realpath).
resolve_real_path() {
  local path="$1"
  if command -v realpath >/dev/null 2>&1; then
    realpath "$path"
    return
  fi
  [[ "$path" == /* ]] || path="$PWD/$path"
  local dir base
  dir=$(cd "$(dirname "$path")" 2>/dev/null && pwd) || { printf '%s\n' "$path"; return; }
  base=$(basename "$path")
  printf '%s/%s\n' "$dir" "$base"
}

# Mirrors the same function in build-artifacts.sh.
find_container_engine() {
  if [[ -n "${CONTAINER_ENGINE:-}" ]]; then
    command -v "$CONTAINER_ENGINE" >/dev/null 2>&1 \
      || fail "Requested container engine not found: $CONTAINER_ENGINE"
    printf '%s\n' "$CONTAINER_ENGINE"
    return
  fi
  for engine in docker podman; do
    if command -v "$engine" >/dev/null 2>&1; then
      printf '%s\n' "$engine"
      return
    fi
  done
  fail "No supported container engine found. Install Docker Desktop or Podman."
}

# ── Argument parsing ──────────────────────────────────────────────────────────
# Intercept --base-image for path translation; forward everything else verbatim.

BASE_IMAGE_HOST_PATH=""
PASS_THROUGH_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-image)
      [[ -n "${2:-}" ]] || fail "--base-image requires an argument"
      BASE_IMAGE_HOST_PATH="$2"
      shift 2
      ;;
    *)
      PASS_THROUGH_ARGS+=("$1")
      shift
      ;;
  esac
done

# Also honour the env-var form that assemble-image.sh accepts.
if [[ -z "$BASE_IMAGE_HOST_PATH" && -n "${AMBROSIA_BASE_IMAGE_PATH:-}" ]]; then
  BASE_IMAGE_HOST_PATH="$AMBROSIA_BASE_IMAGE_PATH"
fi

# ── Base-image path translation ───────────────────────────────────────────────
# The repo is mounted at /repo inside the container.
# If the image is inside the repo → remap to /repo/<relpath>.
# If the image is outside the repo → mount its parent dir as /image-input (ro).

EXTRA_MOUNTS=()
BASE_IMAGE_CONTAINER_ARGS=()

if [[ -n "$BASE_IMAGE_HOST_PATH" ]]; then
  [[ -f "$BASE_IMAGE_HOST_PATH" ]] || fail "Base image not found: $BASE_IMAGE_HOST_PATH"

  real_base=$(resolve_real_path "$BASE_IMAGE_HOST_PATH")
  real_repo=$(resolve_real_path "$REPO_ROOT")

  if [[ "$real_base" == "$real_repo"/* ]]; then
    rel="${real_base#"$real_repo/"}"
    BASE_IMAGE_CONTAINER_ARGS=(--base-image "/repo/$rel")
    log "Base image inside repo → /repo/$rel"
  else
    img_dir=$(cd "$(dirname "$real_base")" && pwd)
    img_file=$(basename "$real_base")
    EXTRA_MOUNTS=(-v "$img_dir:/image-input:ro")
    BASE_IMAGE_CONTAINER_ARGS=(--base-image "/image-input/$img_file")
    log "Base image outside repo → mounting $img_dir as /image-input"
  fi
fi

# ── Container engine ──────────────────────────────────────────────────────────
CONTAINER_ENGINE=$(find_container_engine)

case "$(uname -s)" in
  Darwin) log "macOS detected — running assembler inside a $CONTAINER_ENGINE container" ;;
  Linux)
    log "Linux detected — running assembler inside a $CONTAINER_ENGINE container"
    log "Tip: on Linux you can also run assemble-image.sh directly with sudo"
    ;;
esac

if [[ "$CONTAINER_ENGINE" == "podman" ]]; then
  warn "Podman detected. Loop device support inside a privileged Podman container"
  warn "requires podman-machine to expose /dev/loop*. If you see losetup errors,"
  warn "switch to Docker Desktop."
fi

# ── Bootstrap script (runs as root inside the container) ─────────────────────
# Single-quoted heredoc → no variable expansion in the outer shell.
# Args are forwarded via `bash -c 'script' -- "$@"` positional convention.

read -r -d '' BOOTSTRAP <<'BOOTSTRAP_EOF' || true
set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "[build-docker] Installing host build tools..."
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  curl wget gnupg ca-certificates apt-transport-https \
  util-linux parted e2fsprogs rsync \
  xz-utils unzip p7zip-full openssl \
  systemd qemu-user-static git

echo "[build-docker] Adding Adoptium (Temurin 21 JDK) repository..."
mkdir -p /etc/apt/keyrings
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public \
  | gpg --dearmor > /etc/apt/keyrings/adoptium.gpg
printf 'deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main\n' \
  > /etc/apt/sources.list.d/adoptium.list

echo "[build-docker] Adding NodeSource (Node.js 24) repository..."
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor > /etc/apt/keyrings/nodesource.gpg
printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main\n' \
  > /etc/apt/sources.list.d/nodesource.list

apt-get update -qq
apt-get install -y -qq --no-install-recommends temurin-21-jdk nodejs

# Detect the real JAVA_HOME — path varies by arch (temurin-21-amd64, temurin-21-arm64, etc.)
JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")
export JAVA_HOME
echo "[build-docker] JAVA_HOME detected: $JAVA_HOME"

echo "[build-docker] Starting image assembler..."
exec /repo/hardware/image/build/assemble-image.sh "$@"
BOOTSTRAP_EOF

# ── Launch the container ──────────────────────────────────────────────────────
log "Launching $CONTAINER_ENGINE container (debian:bookworm, privileged)..."

"$CONTAINER_ENGINE" run \
  --rm \
  --privileged \
  -v "$REPO_ROOT:/repo" \
  "${EXTRA_MOUNTS[@]+"${EXTRA_MOUNTS[@]}"}" \
  -e "SUDO_UID=$(id -u)" \
  -e "SUDO_GID=$(id -g)" \
  -e "CLIENT_BUILD_MODE=host" \
  debian:bookworm \
  bash -c "$BOOTSTRAP" -- \
  "${PASS_THROUGH_ARGS[@]+"${PASS_THROUGH_ARGS[@]}"}" \
  "${BASE_IMAGE_CONTAINER_ARGS[@]+"${BASE_IMAGE_CONTAINER_ARGS[@]}"}"
