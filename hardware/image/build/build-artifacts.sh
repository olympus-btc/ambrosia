#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=hardware/image/build/lib.sh
source "$SCRIPT_DIR/lib.sh"

STAGING_DIR="${STAGING_DIR:-$IMAGE_STAGING_DIR}"
SERVER_STAGE="$STAGING_DIR/server"
CLIENT_STAGE="$STAGING_DIR/client"
MANIFEST_PATH="$STAGING_DIR/manifest.json"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--staging-dir <path>] [--version <value>] [--client-build-mode <auto|host|container>]

Builds Ambrosia server/client artifacts from the current checkout and stages them
under hardware/image/out/staging by default.
EOF
}

OVERRIDE_VERSION=""
CLIENT_BUILD_MODE="${CLIENT_BUILD_MODE:-auto}"
CLIENT_TARGET_PLATFORM="${CLIENT_TARGET_PLATFORM:-linux/arm64}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging-dir)
      STAGING_DIR="$2"
      shift 2
      ;;
    --version)
      OVERRIDE_VERSION="$2"
      shift 2
      ;;
    --client-build-mode)
      CLIENT_BUILD_MODE="$2"
      shift
      shift
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

require_cmd git
require_cmd npm
require_cmd node
require_cmd rsync
require_cmd sha256sum
require_cmd tar

require_sane_javascript_text_file() {
  local path="$1"
  [[ -s "$path" ]] || fail "Client build workspace is missing JavaScript file: $path"
  node -e "const fs=require('node:fs'); const path=process.argv[1]; const sample=fs.readFileSync(path); if (sample.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))) { throw new Error('ELF binary found where JavaScript was expected: ' + path); } const prefix=sample.subarray(0, Math.min(sample.length, 4096)); if (prefix.includes(0)) { throw new Error('NUL byte found in JavaScript file prefix: ' + path); }" "$path" >/dev/null
}

require_sane_json_text_file() {
  local path="$1"
  [[ -s "$path" ]] || fail "Client build workspace is missing JSON file: $path"
  node -e "const fs=require('node:fs'); const path=process.argv[1]; const sample=fs.readFileSync(path); const prefix=sample.subarray(0, Math.min(sample.length, 4096)); if (prefix.includes(0)) { throw new Error('NUL byte found in JSON file prefix: ' + path); } JSON.parse(sample.toString('utf8'));" "$path" >/dev/null
}

mkdir -p "$STAGING_DIR"
rm -rf "$SERVER_STAGE" "$CLIENT_STAGE"
mkdir -p "$SERVER_STAGE" "$CLIENT_STAGE"

commit_sha=$(resolve_commit_sha)
version="${OVERRIDE_VERSION:-$(resolve_version)}"
build_time_utc=$(resolve_build_timestamp)

find_container_engine() {
  if [[ -n "${CONTAINER_ENGINE:-}" ]]; then
    command -v "$CONTAINER_ENGINE" >/dev/null 2>&1 || fail "Requested container engine not found: $CONTAINER_ENGINE"
    printf '%s\n' "$CONTAINER_ENGINE"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    printf 'docker\n'
    return
  fi

  if command -v podman >/dev/null 2>&1; then
    printf 'podman\n'
    return
  fi

  fail "No supported container engine found. Install docker or podman, or run on an aarch64 host with --client-build-mode host"
}

resolve_client_build_mode() {
  case "$CLIENT_BUILD_MODE" in
    auto)
      if [[ "$(uname -m)" == "aarch64" ]]; then
        printf 'host\n'
      else
        printf 'container\n'
      fi
      ;;
    host|container)
      printf '%s\n' "$CLIENT_BUILD_MODE"
      ;;
    *)
      fail "Unknown client build mode: $CLIENT_BUILD_MODE"
      ;;
  esac
}

stage_client_runtime_tree() {
  local workspace="$1"

  [[ -f "$workspace/server.js" ]] || fail "Client build workspace is missing standalone server.js"
  [[ -d "$workspace/.next/static" ]] || fail "Client build workspace is missing .next/static"
  [[ -d "$workspace/public" ]] || fail "Client build workspace is missing public"
  [[ -s "$workspace/package.json" ]] || fail "Client build workspace is missing standalone package.json"
  [[ -s "$workspace/node_modules/@swc/helpers/package.json" ]] || fail "Client build workspace is missing @swc/helpers"
  [[ -s "$workspace/node_modules/tslib/package.json" ]] || fail "Client build workspace is missing tslib"
  require_sane_json_text_file "$workspace/package.json"
  require_sane_javascript_text_file "$workspace/server.js"
  require_sane_javascript_text_file "$workspace/node_modules/next/dist/compiled/comment-json/index.js"
  require_sane_javascript_text_file "$workspace/node_modules/next/dist/build/next-config-ts/transpile-config.js"

  rsync -a --delete "$workspace/" "$CLIENT_STAGE/"
}

prepare_client_workspace() {
  local workspace="$1"
  mkdir -p "$workspace"
  rsync -a --delete \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude 'node_modules' \
    "$REPO_ROOT/client/" "$workspace/"
}

build_client_on_host() {
  local workspace="$1"
  (
    cd "$workspace"
    CLIENT_DIST_DIR="$workspace/dist-root" NO_ZIP=1 ./package-client.sh
  )
}

build_client_in_container() {
  local workspace="$1"
  local container_engine="$2"
  local image="node:24-bookworm"

  "$container_engine" run --rm \
    --platform "$CLIENT_TARGET_PLATFORM" \
    -v "$workspace:/workspace" \
    -w /workspace \
    "$image" \
    bash -lc 'set -euo pipefail && CLIENT_DIST_DIR=/workspace/dist-root NO_ZIP=1 ./package-client.sh'
}

log "Building server artifact"
(
  cd "$REPO_ROOT/server"
  ./gradlew jar
)

server_jar=$(find "$REPO_ROOT/server/app/build/libs" -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | sort | tail -n 1)
[[ -n "${server_jar:-}" && -f "$server_jar" ]] || fail "Server build completed but no JAR was found in server/app/build/libs"

install -m 0644 "$server_jar" "$SERVER_STAGE/ambrosia.jar"
install -m 0755 "$REPO_ROOT/scripts/run-server.sh" "$SERVER_STAGE/run-server.sh"

log "Building client artifact"
client_build_mode=$(resolve_client_build_mode)
client_workspace=$(mktemp -d "$IMAGE_OUT_DIR/.client-workspace-XXXXXX")
cleanup_client_workspace() {
  rm -rf "$client_workspace"
}
trap cleanup_client_workspace EXIT

prepare_client_workspace "$client_workspace"
if [[ "$client_build_mode" == "host" ]]; then
  build_client_on_host "$client_workspace"
else
  container_engine=$(find_container_engine)
  build_client_in_container "$client_workspace" "$container_engine"
fi

stage_client_runtime_tree "$client_workspace/dist-root"

server_sha=$(sha256sum "$SERVER_STAGE/ambrosia.jar" | awk '{print $1}')
client_file_count=$(find "$CLIENT_STAGE" -type f | wc -l | awk '{print $1}')

write_json_file "$MANIFEST_PATH" "$(cat <<EOF
{
  "board_family": "ambrosia-image",
  "build_time_utc": "$(json_escape "$build_time_utc")",
  "commit_sha": "$(json_escape "$commit_sha")",
  "version": "$(json_escape "$version")",
  "server": {
    "artifact": "server/ambrosia.jar",
    "sha256": "$(json_escape "$server_sha")"
  },
  "client": {
    "artifact_dir": "client",
    "file_count": $client_file_count,
    "build_mode": "$(json_escape "$client_build_mode")",
    "target_platform": "$(json_escape "$CLIENT_TARGET_PLATFORM")",
    "format": "next-standalone"
  }
}
EOF
)"

restore_path_ownership "$STAGING_DIR"

log "Artifact staging complete: $STAGING_DIR"
