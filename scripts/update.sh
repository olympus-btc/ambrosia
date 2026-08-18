#!/bin/bash

# ==========================================
# 🔄 Ambrosia & Phoenixd Updater
# ==========================================
#
# Removes the currently installed phoenixd, Ambrosia server (jar), and
# Ambrosia client (Next.js build), and replaces them with the latest
# GitHub release, following the same conventions as scripts/install.sh.
#
# Note: unlike install.sh (which pins phoenixd to a GPG-verified version),
# this script always tracks phoenixd's actual latest upstream release,
# unless pinned via the PHOENIXD_TAG env var.

set -euo pipefail
IFS=$'\n\t'

# --- Argument validation ---
AUTO_YES=false
FORCE=false

for arg in "$@"; do
  case $arg in
    --yes|-y)
      AUTO_YES=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# --- Helper Functions ---

log_info() { echo -e "\033[34m[INFO]\033[0m $*"; }
log_error() { echo -e "\033[31m[ERROR]\033[0m $*" >&2; }

# Global temp dir for cleanup
GLOBAL_TEMP_DIR=$(mktemp -d)

cleanup() {
  if [[ -d "$GLOBAL_TEMP_DIR" ]]; then
    rm -rf "$GLOBAL_TEMP_DIR"
  fi
}
trap cleanup EXIT

check_dependencies() {
  local dependencies=("curl" "tar" "unzip" "sha256sum" "gpg")
  for cmd in "${dependencies[@]}"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      log_error "Missing required dependency: $cmd"
      exit 1
    fi
  done
}

download_file() {
  local url="$1"
  local dest="$2"
  # Retry 3 times, fail on error, follow redirects, silent unless error
  if ! curl -fL --retry 3 --retry-delay 2 -o "$dest" "$url"; then
    log_error "Failed to download $url"
    exit 1
  fi
}

confirm() {
  local prompt="$1"
  if [[ "$AUTO_YES" == true ]]; then
    return 0
  fi
  if [[ ! -t 0 ]]; then
    return 0
  fi
  echo "$prompt (y/n): "
  read -r reply
  [[ $reply =~ ^[Yy]$ ]]
}

print_header() {
  echo "----------------------------------------"
  echo " 🔄 Ambrosia & Phoenixd Updater"
  echo "----------------------------------------"
}

# --- Shared GitHub release tag resolution ---

resolve_latest_tag() {
  local repo="$1"
  local pinned="$2"
  if [[ -n "$pinned" ]]; then
    echo "${pinned#v}"
    return
  fi
  local api_url="https://api.github.com/repos/${repo}/releases"
  local auth_args=()
  if [[ -n "${GH_TOKEN:-}" ]]; then
    auth_args=(-H "Authorization: Bearer $GH_TOKEN")
  fi
  local response
  response=$(curl -fsSL "${auth_args[@]}" "$api_url")
  printf '%s\n' "$response" \
    | sed -E -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v?([^"]+)".*/\1/p' \
    | sed -n '1p'
}

# --- Ambrosia release resolution (mirrors install.sh) ---

AMBROSIA_REPO="olympus-btc/ambrosia"
AMBROSIA_INSTALL_DIR="$HOME/.local/ambrosia"
AMBROSIA_BIN_DIR="$HOME/.local/bin"
CLIENT_INSTALL_DIR="$HOME/.local/ambrosia/client"
AMBROSIA_TAG="${AMBROSIA_TAG:-}"

ambrosia_resolve_tag() {
  log_info "Resolving latest Ambrosia release from $AMBROSIA_REPO..."
  AMBROSIA_TAG=$(resolve_latest_tag "$AMBROSIA_REPO" "$AMBROSIA_TAG")
  if [[ -z "$AMBROSIA_TAG" ]]; then
    log_error "Could not determine the latest Ambrosia release tag (GitHub API rate limit?)."
    log_error "You can pin a version manually: AMBROSIA_TAG=vX.Y.Z $0"
    exit 1
  fi
  log_info "Latest Ambrosia release: v$AMBROSIA_TAG"
}

# --- phoenixd release resolution ---

PHOENIXD_REPO="ACINQ/phoenixd"
PHOENIXD_INSTALL_DIR="/usr/local/bin"
PHOENIXD_TAG="${PHOENIXD_TAG:-}"
PHOENIXD_ARCH=""
PHOENIXD_ZIP_FILENAME=""

phoenixd_resolve_tag() {
  log_info "Resolving latest phoenixd release from $PHOENIXD_REPO..."
  PHOENIXD_TAG=$(resolve_latest_tag "$PHOENIXD_REPO" "$PHOENIXD_TAG")
  if [[ -z "$PHOENIXD_TAG" ]]; then
    log_error "Could not determine the latest phoenixd release tag (GitHub API rate limit?)."
    log_error "You can pin a version manually: PHOENIXD_TAG=vX.Y.Z $0"
    exit 1
  fi
  log_info "Latest phoenixd release: v$PHOENIXD_TAG"
}

phoenixd_detect_os_arch() {
  PHOENIXD_ARCH=$(uname -m)
  if [[ "$OSTYPE" == "linux"* ]]; then
    if [[ "$PHOENIXD_ARCH" == "x86_64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-linux-x64.zip"
    elif [[ "$PHOENIXD_ARCH" == "aarch64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-linux-arm64.zip"
    else
      log_error "Unsupported architecture: $PHOENIXD_ARCH"
      exit 1
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ "$PHOENIXD_ARCH" == "x86_64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-macos-x64.zip"
    elif [[ "$PHOENIXD_ARCH" == "arm64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-macos-arm64.zip"
    else
      log_error "Unsupported architecture: $PHOENIXD_ARCH"
      exit 1
    fi
  else
    log_error "Unsupported OS type: $OSTYPE"
    exit 1
  fi
}

phoenixd_verify_signature() {
  echo "🔐 Verifying package signature and integrity..."
  local release_base_url="https://github.com/${PHOENIXD_REPO}/releases/download/v${PHOENIXD_TAG}"
  pushd "$GLOBAL_TEMP_DIR" > /dev/null

  local acinq_key_url="https://acinq.co/pgp/padioupm.asc"
  local sig_url="${release_base_url}/SHA256SUMS.asc"

  download_file "$acinq_key_url" "padioupm.asc"
  download_file "$sig_url" "SHA256SUMS.asc"

  if ! gpg --quiet --import padioupm.asc >/dev/null 2>&1; then
    log_error "Failed to import ACINQ PGP key."
    popd > /dev/null
    exit 1
  fi
  if ! gpg --quiet --decrypt SHA256SUMS.asc > SHA256SUMS.stripped 2>/dev/null; then
    log_error "Signature verification failed! The file SHA256SUMS.asc is not valid."
    popd > /dev/null
    exit 1
  fi

  local sha_cmd="sha256sum"
  if ! command -v sha256sum >/dev/null; then sha_cmd="shasum -a 256"; fi

  if grep "$PHOENIXD_ZIP_FILENAME" SHA256SUMS.stripped | $sha_cmd -c - >/dev/null 2>&1; then
    echo "✅ Package verification successful."
  else
    log_error "Checksum verification failed for $PHOENIXD_ZIP_FILENAME"
    popd > /dev/null
    exit 1
  fi
  popd > /dev/null
}

# --- Version detection ---

get_installed_server_version() {
  local jar="$AMBROSIA_INSTALL_DIR/ambrosia.jar"
  if [[ ! -f "$jar" ]]; then
    echo ""
    return
  fi
  unzip -p "$jar" META-INF/MANIFEST.MF 2>/dev/null \
    | tr -d '\r' \
    | sed -n 's/^Implementation-Version: *//p' \
    | head -n1
}

get_installed_client_version() {
  local marker="$CLIENT_INSTALL_DIR/.ambrosia-version"
  if [[ -f "$marker" ]]; then
    cat "$marker"
  else
    echo ""
  fi
}

get_installed_phoenixd_version() {
  if ! command -v phoenixd >/dev/null 2>&1; then
    echo ""
    return
  fi
  phoenixd --version 2>&1 | awk '{print $3}' | cut -d'-' -f1
}

# --- systemd helpers ---

systemd_stop_if_active() {
  local service="$1"
  local service_file="/etc/systemd/system/${service}.service"
  if command -v systemctl >/dev/null 2>&1 && [[ -f "$service_file" ]]; then
    if systemctl is-active --quiet "$service" 2>/dev/null; then
      log_info "Stopping $service service..."
      sudo systemctl stop "$service"
      echo "true"
      return
    fi
  fi
  echo "false"
}

systemd_start_if_was_active() {
  local service="$1"
  local was_active="$2"
  if [[ "$was_active" == "true" ]]; then
    log_info "Restarting $service service..."
    sudo systemctl start "$service"
  fi
}

# --- phoenixd update ---

phoenixd_update() {
  echo ""
  echo "➡️  Checking phoenixd..."

  if ! command -v phoenixd >/dev/null 2>&1; then
    log_info "phoenixd is not installed here, skipping. Run install.sh first."
    return
  fi

  local installed_version
  installed_version=$(get_installed_phoenixd_version)

  if [[ "$FORCE" != true && -n "$installed_version" && "$installed_version" == "$PHOENIXD_TAG" ]]; then
    log_info "phoenixd already at latest version (v$PHOENIXD_TAG). Skipping."
    return
  fi

  if [[ -n "$installed_version" ]]; then
    log_info "phoenixd: v$installed_version -> v$PHOENIXD_TAG"
  else
    log_info "phoenixd: unknown installed version -> v$PHOENIXD_TAG"
  fi

  if ! confirm "Update phoenixd to v$PHOENIXD_TAG?"; then
    log_info "Skipping phoenixd update."
    return
  fi

  if pgrep -x phoenixd >/dev/null 2>&1 && ! (command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet phoenixd 2>/dev/null); then
    log_error "phoenixd is running as a standalone process (not managed by systemd)."
    log_error "The binary will be replaced, but you must manually restart phoenixd afterward to use the new version."
  fi

  local was_active
  was_active=$(systemd_stop_if_active "phoenixd")

  phoenixd_detect_os_arch
  download_file "https://github.com/${PHOENIXD_REPO}/releases/download/v${PHOENIXD_TAG}/${PHOENIXD_ZIP_FILENAME}" "$GLOBAL_TEMP_DIR/$PHOENIXD_ZIP_FILENAME"
  phoenixd_verify_signature

  sudo mkdir -p "$PHOENIXD_INSTALL_DIR"
  sudo unzip -j -o "$GLOBAL_TEMP_DIR/$PHOENIXD_ZIP_FILENAME" -d "$PHOENIXD_INSTALL_DIR"

  systemd_start_if_was_active "phoenixd" "$was_active"

  echo "✅ phoenixd updated to v$PHOENIXD_TAG."
}

# --- Server update ---

server_update() {
  echo ""
  echo "➡️  Checking Ambrosia Server..."

  if [[ ! -f "$AMBROSIA_INSTALL_DIR/ambrosia.jar" ]]; then
    log_info "Ambrosia Server is not installed here (no ambrosia.jar found), skipping. Run install.sh first."
    return
  fi

  local installed_version
  installed_version=$(get_installed_server_version)

  if [[ "$FORCE" != true && -n "$installed_version" && "$installed_version" == "$AMBROSIA_TAG" ]]; then
    log_info "Ambrosia Server already at latest version (v$AMBROSIA_TAG). Skipping."
    return
  fi

  if [[ -n "$installed_version" ]]; then
    log_info "Ambrosia Server: v$installed_version -> v$AMBROSIA_TAG"
  else
    log_info "Ambrosia Server: unknown installed version -> v$AMBROSIA_TAG"
  fi

  if ! confirm "Update Ambrosia Server to v$AMBROSIA_TAG?"; then
    log_info "Skipping Ambrosia Server update."
    return
  fi

  local was_active
  was_active=$(systemd_stop_if_active "ambrosia")

  local ambrosia_url="https://github.com/${AMBROSIA_REPO}/releases/download/v${AMBROSIA_TAG}"
  download_file "${ambrosia_url}/ambrosia-${AMBROSIA_TAG}.jar" "$GLOBAL_TEMP_DIR/ambrosia.jar"
  download_file "https://raw.githubusercontent.com/${AMBROSIA_REPO}/v${AMBROSIA_TAG}/scripts/run-server.sh" "$GLOBAL_TEMP_DIR/run-server.sh"

  mv -f "$GLOBAL_TEMP_DIR/ambrosia.jar" "$AMBROSIA_INSTALL_DIR/ambrosia.jar"
  mv -f "$GLOBAL_TEMP_DIR/run-server.sh" "$AMBROSIA_INSTALL_DIR/run-server.sh"
  chmod +x "$AMBROSIA_INSTALL_DIR/ambrosia.jar" "$AMBROSIA_INSTALL_DIR/run-server.sh"

  mkdir -p "$AMBROSIA_BIN_DIR"
  ln -sf "$AMBROSIA_INSTALL_DIR/run-server.sh" "$AMBROSIA_BIN_DIR/ambrosia"

  systemd_start_if_was_active "ambrosia" "$was_active"

  echo "✅ Ambrosia Server updated to v$AMBROSIA_TAG."
}

# --- Client update ---

client_update() {
  echo ""
  echo "➡️  Checking Ambrosia Client..."

  if [[ ! -d "$CLIENT_INSTALL_DIR" ]]; then
    log_info "Ambrosia Client is not installed here, skipping. Run install.sh first."
    return
  fi

  local installed_version
  installed_version=$(get_installed_client_version)

  if [[ "$FORCE" != true && -n "$installed_version" && "$installed_version" == "$AMBROSIA_TAG" ]]; then
    log_info "Ambrosia Client already at latest version (v$AMBROSIA_TAG). Skipping."
    return
  fi

  if [[ -n "$installed_version" ]]; then
    log_info "Ambrosia Client: v$installed_version -> v$AMBROSIA_TAG"
  else
    log_info "Ambrosia Client: unknown installed version -> v$AMBROSIA_TAG"
  fi

  if ! confirm "Update Ambrosia Client to v$AMBROSIA_TAG?"; then
    log_info "Skipping Ambrosia Client update."
    return
  fi

  local was_active
  was_active=$(systemd_stop_if_active "ambrosia-client")

  local client_dist_file="ambrosia-client-${AMBROSIA_TAG}.tar.gz"
  local client_dist_url="https://github.com/${AMBROSIA_REPO}/releases/download/v${AMBROSIA_TAG}/${client_dist_file}"
  download_file "$client_dist_url" "$GLOBAL_TEMP_DIR/$client_dist_file"

  rm -rf "$CLIENT_INSTALL_DIR"
  mkdir -p "$CLIENT_INSTALL_DIR"
  tar -xzf "$GLOBAL_TEMP_DIR/$client_dist_file" -C "$CLIENT_INSTALL_DIR" --strip-components=1

  echo "   Installing Node.js dependencies..."
  pushd "$CLIENT_INSTALL_DIR" > /dev/null
  npm install --production --silent
  popd > /dev/null

  echo "$AMBROSIA_TAG" > "$CLIENT_INSTALL_DIR/.ambrosia-version"

  # Self-heal the wrapper script and symlink in case they went missing.
  if [[ ! -f "$AMBROSIA_INSTALL_DIR/run-client.sh" ]]; then
    cat <<EOF > "$AMBROSIA_INSTALL_DIR/run-client.sh"
#!/bin/bash
cd "$CLIENT_INSTALL_DIR" && npm start
EOF
    chmod +x "$AMBROSIA_INSTALL_DIR/run-client.sh"
  fi
  mkdir -p "$AMBROSIA_BIN_DIR"
  ln -sf "$AMBROSIA_INSTALL_DIR/run-client.sh" "$AMBROSIA_BIN_DIR/ambrosia-client"

  systemd_start_if_was_active "ambrosia-client" "$was_active"

  echo "✅ Ambrosia Client updated to v$AMBROSIA_TAG."
}

# --- Main execution flow ---

check_dependencies
print_header

phoenixd_resolve_tag
phoenixd_update

if [[ ! -d "$AMBROSIA_INSTALL_DIR" ]]; then
  log_error "No Ambrosia installation found at $AMBROSIA_INSTALL_DIR."
  log_error "Run scripts/install.sh first."
  exit 1
fi

ambrosia_resolve_tag
server_update
client_update

echo ""
echo "🎉 Update check complete!"
