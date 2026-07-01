#!/usr/bin/env bash

set -euo pipefail

IMAGE_BUILD_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
IMAGE_ROOT=$(cd -- "$IMAGE_BUILD_DIR/.." && pwd)
REPO_ROOT=$(cd -- "$IMAGE_ROOT/../.." && pwd)
IMAGE_OUT_DIR="$IMAGE_ROOT/out"
IMAGE_STAGING_DIR="$IMAGE_OUT_DIR/staging"
IMAGE_CACHE_DIR="$IMAGE_OUT_DIR/cache"

mkdir -p "$IMAGE_OUT_DIR" "$IMAGE_CACHE_DIR"

log() {
  printf '[ambrosia-image] %s\n' "$*"
}

warn() {
  printf '[ambrosia-image] WARN: %s\n' "$*" >&2
}

fail() {
  printf '[ambrosia-image] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing required command: $cmd"
}

json_escape() {
  local value="${1//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  printf '%s' "$value"
}

resolve_commit_sha() {
  git -C "$REPO_ROOT" rev-parse HEAD
}

resolve_version() {
  if git -C "$REPO_ROOT" describe --tags --always --dirty >/dev/null 2>&1; then
    git -C "$REPO_ROOT" describe --tags --always --dirty | sed 's/^v//'
    return
  fi

  sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$REPO_ROOT/client/package.json" | head -n 1
}

resolve_build_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

sanitize_version_for_filename() {
  printf '%s' "$1" | sed 's/[^A-Za-z0-9._-]/-/g'
}

latest_matching_file() {
  local dir="$1"
  local pattern="$2"
  find "$dir" -maxdepth 1 -type f -name "$pattern" | sort | tail -n 1
}

write_json_file() {
  local destination="$1"
  local body="$2"
  printf '%s\n' "$body" > "$destination"
}

restore_path_ownership() {
  local path="$1"
  local target_uid="${SUDO_UID:-}"
  local target_gid="${SUDO_GID:-}"

  [[ -n "$target_uid" && -n "$target_gid" ]] || return 0
  [[ -e "$path" ]] || return 0

  chown -R "$target_uid:$target_gid" "$path" >/dev/null 2>&1 || true
}
