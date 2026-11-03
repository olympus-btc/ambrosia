#!/bin/bash

# ==========================================
# 🚀 Ambrosia & Phoenixd Installer
# ==========================================

set -euo pipefail
IFS=$'\n\t'

# --- Argument validation ---
AUTO_YES=false
INSTALL_SYSTEMD=true
EXPOSE_LAN=false
LOCAL_INSTALL=false

for argument in "$@"; do
  case $argument in
    --yes|-y)
      AUTO_YES=true
      shift
      ;;
    --no-service)
      INSTALL_SYSTEMD=false
      shift
      ;;
    --expose-lan)
      EXPOSE_LAN=true
      shift
      ;;
    --local)
      LOCAL_INSTALL=true
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
GLOBAL_TEMP_DIRECTORY=$(mktemp -d)

cleanup() {
  if [[ -d "$GLOBAL_TEMP_DIRECTORY" ]]; then
    rm -rf "$GLOBAL_TEMP_DIRECTORY"
  fi
}
trap cleanup EXIT

check_dependencies() {
  local dependencies=("curl" "unzip" "tar" "sha256sum" "gpg")
  for command_name in "${dependencies[@]}"; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      log_error "Missing required dependency: $command_name"
      exit 1
    fi
  done
}

download_file() {
  local url="$1"
  local destination="$2"
  if ! curl -fL \
    --retry 5 \
    --retry-delay 5 \
    --retry-all-errors \
    --connect-timeout 30 \
    -o "$destination" \
    "$url"; then
    log_error "Failed to download $url"
    exit 1
  fi
}

print_header() {
  echo "----------------------------------------"
  echo " 🚀 Unified Ambrosia & Phoenixd Installer"
  echo "----------------------------------------"
}

resolve_repo_root() {
  local script_path="${BASH_SOURCE[0]}"
  while [ -L "$script_path" ]; do
    local script_directory
    script_directory=$(cd -- "$(dirname -- "$script_path")" &> /dev/null && pwd)
    script_path=$(readlink "$script_path")
    [[ $script_path != /* ]] && script_path="$script_directory/$script_path"
  done
  local script_directory
  script_directory=$(cd -- "$(dirname -- "$script_path")" &> /dev/null && pwd)
  dirname "$script_directory"
}

require_local_repo_root() {
  REPO_ROOT=$(resolve_repo_root)
  if [[ ! -d "$REPO_ROOT/server" || ! -d "$REPO_ROOT/client" ]]; then
    log_error "--local requires running install.sh from within a cloned ambrosia checkout"
    exit 1
  fi
}

build_local_artifacts() {
  local build_dependencies=("java" "node" "npm")
  for command_name in "${build_dependencies[@]}"; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      log_error "Missing required dependency for --local: $command_name (see doc/dependencies.md)"
      exit 1
    fi
  done

  log_info "Building server JAR from local source..."
  (cd "$REPO_ROOT/server" && ./gradlew jar)

  log_info "Building client from local source..."
  (cd "$REPO_ROOT/client" && chmod +x package-client.sh && NO_ZIP=1 ./package-client.sh)
}

# --- Phoenixd Installation Logic ---

PHOENIXD_TAG="0.9.1"
PHOENIXD_RELEASE_BASE_URL="https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_TAG}"
PHOENIXD_INSTALL_DIRECTORY="/usr/local/bin"
PHOENIXD_OS=""
PHOENIXD_ARCHITECTURE=""
PHOENIXD_ZIP_FILENAME=""

phoenixd_detect_os_architecture() {
  PHOENIXD_ARCHITECTURE=$(uname -m)
  if [[ "$OSTYPE" == "linux"* ]]; then
    if [[ "$PHOENIXD_ARCHITECTURE" == "x86_64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-linux-x64.zip"
      PHOENIXD_OS="linux-x64"
    elif [[ "$PHOENIXD_ARCHITECTURE" == "aarch64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-linux-arm64.zip"
      PHOENIXD_OS="linux-arm64"
    else
      log_error "Unsupported architecture: $PHOENIXD_ARCHITECTURE"
      exit 1
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ "$PHOENIXD_ARCHITECTURE" == "x86_64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-macos-x64.zip"
      PHOENIXD_OS="macos-x64"
    elif [[ "$PHOENIXD_ARCHITECTURE" == "arm64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-macos-arm64.zip"
      PHOENIXD_OS="macos-arm64"
    else
      log_error "Unsupported architecture: $PHOENIXD_ARCHITECTURE"
      exit 1
    fi
  else
    log_error "Unsupported OS type: $OSTYPE"
    exit 1
  fi
  echo "Detected architecture: $PHOENIXD_ARCHITECTURE"
}

phoenixd_check_existing() {
  echo ""
  echo "⚡️ Welcome to Mastering phoenixd installer"
  echo "-----------------------------------------"
  echo "This script will install ${PHOENIXD_OS} version of phoenixd"
  echo "-----------------------------------------"

  if command -v phoenixd >/dev/null 2>&1 && command -v phoenix-cli >/dev/null 2>&1; then
    echo "❌ phoenixd and phoenix-cli are already installed on this system"
    if [[ "$AUTO_YES" != true ]]; then
      echo "Do you want to continue with the installation anyway? (y/n): "
      read -r CONTINUE_REPLY
      if [[ ! $CONTINUE_REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
      fi
    else
      echo "Running in auto-yes mode. Overwriting..."
    fi
  fi
}

phoenixd_verify_signature() {
  echo "🔐 Verifying package signature and integrity..."
  pushd "$GLOBAL_TEMP_DIRECTORY" > /dev/null

  local acinq_key_url="https://acinq.co/pgp/padioupm.asc"
  local signature_url="${PHOENIXD_RELEASE_BASE_URL}/SHA256SUMS.asc"

  download_file "$acinq_key_url" "padioupm.asc"
  download_file "$signature_url" "SHA256SUMS.asc"

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

  local checksum_command="sha256sum"
  if ! command -v sha256sum >/dev/null; then checksum_command="shasum -a 256"; fi

  if grep "$PHOENIXD_ZIP_FILENAME" SHA256SUMS.stripped | $checksum_command -c - >/dev/null 2>&1; then
    echo "✅ Package verification successful."
  else
    log_error "Checksum verification failed for $PHOENIXD_ZIP_FILENAME"
    popd > /dev/null
    exit 1
  fi
  popd > /dev/null
}

phoenixd_install() {
  phoenixd_detect_os_architecture
  phoenixd_check_existing

  echo "Installing phoenixd ${PHOENIXD_TAG}"
  sudo mkdir -p "$PHOENIXD_INSTALL_DIRECTORY"

  # Download to global temp
  download_file "${PHOENIXD_RELEASE_BASE_URL}/${PHOENIXD_ZIP_FILENAME}" "$GLOBAL_TEMP_DIRECTORY/$PHOENIXD_ZIP_FILENAME"

  phoenixd_verify_signature

  sudo unzip -j -o "$GLOBAL_TEMP_DIRECTORY/$PHOENIXD_ZIP_FILENAME" -d "$PHOENIXD_INSTALL_DIRECTORY"
  echo "✅ phoenixd installed to $PHOENIXD_INSTALL_DIRECTORY"

  phoenixd_install_restart_wrapper

  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "MacOS: Ensure $PHOENIXD_INSTALL_DIRECTORY is in your PATH."
    return
  fi

  # Systemd
  if [[ "$INSTALL_SYSTEMD" == "true" ]] && command -v systemctl >/dev/null; then
     phoenixd_setup_systemd
  fi
}

phoenixd_install_restart_wrapper() {
  if [[ "$LOCAL_INSTALL" == "true" ]]; then
    sudo cp "$REPO_ROOT/scripts/run-phoenixd.sh" "$PHOENIXD_INSTALL_DIRECTORY/run-phoenixd.sh"
  else
    local wrapper_url="https://raw.githubusercontent.com/${AMBROSIA_REPO}/v${AMBROSIA_TAG}/scripts/run-phoenixd.sh"
    if ! curl -fsSL -o "$GLOBAL_TEMP_DIRECTORY/run-phoenixd.sh" "$wrapper_url" 2>/dev/null; then
      log_info "phoenixd restart wrapper not published at v$AMBROSIA_TAG yet, phoenixd will run directly."
      return 0
    fi
    sudo cp "$GLOBAL_TEMP_DIRECTORY/run-phoenixd.sh" "$PHOENIXD_INSTALL_DIRECTORY/run-phoenixd.sh"
  fi
  sudo chmod +x "$PHOENIXD_INSTALL_DIRECTORY/run-phoenixd.sh"
  echo "✅ phoenixd restart wrapper installed to $PHOENIXD_INSTALL_DIRECTORY/run-phoenixd.sh"
}

phoenixd_setup_systemd() {
  local reply="n"
  if [[ "$AUTO_YES" == true ]]; then reply="y";
  elif [[ -t 0 ]]; then
    echo "Do you want to setup a systemd service (requires sudo permission)? (y/n): "
    read -r reply
  fi

  if [[ $reply =~ ^[Yy]$ ]]; then
    local exec_start="$PHOENIXD_INSTALL_DIRECTORY/phoenixd --agree-to-terms-of-service"
    if [[ -f "$PHOENIXD_INSTALL_DIRECTORY/run-phoenixd.sh" ]]; then
      exec_start="/bin/bash $PHOENIXD_INSTALL_DIRECTORY/run-phoenixd.sh"
    fi
    sudo tee /etc/systemd/system/phoenixd.service > /dev/null << EOF
[Unit]
Description=Phoenix Daemon
After=network.target

[Service]
ExecStart=$exec_start
User=$USER
Restart=always
RestartSec=5
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable phoenixd
    sudo systemctl start phoenixd
    echo "✅ phoenixd service configured."
  fi
}

# --- Ambrosia Server Installation Logic ---

AMBROSIA_REPO="olympus-btc/ambrosia"
AMBROSIA_INSTALL_DIRECTORY="$HOME/.local/ambrosia"
AMBROSIA_BIN_DIRECTORY="$HOME/.local/bin"
AMBROSIA_TAG="${AMBROSIA_TAG:-}"

ambrosia_resolve_tag() {

  if [[ -n "$AMBROSIA_TAG" ]]; then
    AMBROSIA_TAG="${AMBROSIA_TAG#v}"
    log_info "Using pinned Ambrosia version: v$AMBROSIA_TAG"
    return
  fi
  log_info "Resolving latest Ambrosia release from $AMBROSIA_REPO..."
  local api_url="https://api.github.com/repos/${AMBROSIA_REPO}/releases"
  local authentication_arguments=()
  if [[ -n "${GH_TOKEN:-}" ]]; then
    authentication_arguments=(-H "Authorization: Bearer $GH_TOKEN")
  fi
  local releases_response
  releases_response=$(curl -fsSL "${authentication_arguments[@]}" "$api_url")
  AMBROSIA_TAG=$(printf '%s\n' "$releases_response" \
    | sed -E -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v?([^"]+)".*/\1/p' \
    | sed -n '1p')
  if [[ -z "$AMBROSIA_TAG" ]]; then
    log_error "Could not determine the latest Ambrosia release tag (GitHub API rate limit?)."
    log_error "You can pin a version manually: AMBROSIA_TAG=vX.Y.Z $0"
    exit 1
  fi
  log_info "Latest Ambrosia release: v$AMBROSIA_TAG"
}

ambrosia_write_initial_config() {
  local data_directory="$HOME/.Ambrosia-POS"
  local config_file="$data_directory/ambrosia.conf"
  mkdir -p "$data_directory"

  if [[ -f "$config_file" ]]; then
    log_info "ambrosia.conf already exists, skipping initial config write."
    return
  fi

  local bind_ip="127.0.0.1"
  if [[ "$EXPOSE_LAN" == "true" ]]; then
    bind_ip="0.0.0.0"
    log_info "LAN exposure enabled: http-bind-ip will be set to 0.0.0.0"
  fi

  cat > "$config_file" << EOF
http-bind-ip=$bind_ip
http-bind-port=9154
EOF
  log_info "Wrote initial config to $config_file"
}

ambrosia_install() {
  echo "➡️  Starting Ambrosia POS Server installation..."
  if command -v ambrosia >/dev/null 2>&1; then
      echo "⚠️  Ambrosia POS is already installed."
      if [[ "$AUTO_YES" != true ]]; then
        echo "Do you want to continue (Overwrite)? (y/n): "
        read -r CONTINUE_REPLY
        if [[ ! $CONTINUE_REPLY =~ ^[Yy]$ ]]; then return; fi
      fi
  fi

  mkdir -p "$AMBROSIA_BIN_DIRECTORY" "$AMBROSIA_INSTALL_DIRECTORY"
  ambrosia_write_initial_config

  if [[ "$LOCAL_INSTALL" == "true" ]]; then
    local local_jar
    local_jar=$(find "$REPO_ROOT/server/app/build/libs" -maxdepth 1 -name '*.jar' 2>/dev/null | head -1)
    if [[ -z "$local_jar" ]]; then
      log_error "No local JAR found under $REPO_ROOT/server/app/build/libs/ — run './gradlew jar' in server/ first"
      exit 1
    fi
    cp "$local_jar" "$AMBROSIA_INSTALL_DIRECTORY/ambrosia.jar"
    cp "$REPO_ROOT/scripts/run-server.sh" "$AMBROSIA_INSTALL_DIRECTORY/run-server.sh"
  else
    local ambrosia_url="https://github.com/${AMBROSIA_REPO}/releases/download/v${AMBROSIA_TAG}"
    download_file "${ambrosia_url}/ambrosia-${AMBROSIA_TAG}.jar" "$AMBROSIA_INSTALL_DIRECTORY/ambrosia.jar"
    download_file "https://raw.githubusercontent.com/${AMBROSIA_REPO}/v${AMBROSIA_TAG}/scripts/run-server.sh" "$AMBROSIA_INSTALL_DIRECTORY/run-server.sh"
  fi

  chmod +x "$AMBROSIA_INSTALL_DIRECTORY/ambrosia.jar" "$AMBROSIA_INSTALL_DIRECTORY/run-server.sh"
  ln -sf "$AMBROSIA_INSTALL_DIRECTORY/run-server.sh" "$AMBROSIA_BIN_DIRECTORY/ambrosia"

  echo "✅ Ambrosia POS Server installed."

  # Setup Path logic (simplified)
  local rc_file=""
  [[ $SHELL == *"zsh"* ]] && rc_file="$HOME/.zshrc"
  [[ $SHELL == *"bash"* ]] && rc_file="$HOME/.bashrc"
  if [[ -n "$rc_file" && -f "$rc_file" ]] && ! grep -q "$AMBROSIA_BIN_DIRECTORY" "$rc_file"; then
      echo "export PATH=\"$AMBROSIA_BIN_DIRECTORY:\$PATH\"" >> "$rc_file"
      echo "   Added to PATH in $rc_file"
  fi

  if [[ "$INSTALL_SYSTEMD" == "true" ]] && command -v systemctl >/dev/null; then
      ambrosia_setup_systemd
  fi
}

ambrosia_setup_systemd() {
    local reply="n"
    if [[ "$AUTO_YES" == true ]]; then reply="y";
    elif [[ -t 0 ]]; then
        echo "Setup systemd service for Ambrosia Server? (y/n): "
        read -r reply
    fi

    if [[ $reply =~ ^[Yy]$ ]]; then
        sudo tee /etc/systemd/system/ambrosia.service > /dev/null << EOF
[Unit]
Description=Ambrosia POS Server
After=network.target

[Service]
ExecStart=$AMBROSIA_INSTALL_DIRECTORY/run-server.sh
WorkingDirectory=$AMBROSIA_INSTALL_DIRECTORY
User=$USER
Environment=AMBROSIA_SERVICE_MANAGED=true
Restart=always
RestartSec=5
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable ambrosia
        sudo systemctl start ambrosia
        echo "✅ Ambrosia systemd service configured."
    fi
}

# --- Client Installation ---

CLIENT_INSTALL_DIRECTORY="$HOME/.local/ambrosia/client"
CLIENT_DIST_DIRECTORY="/tmp/ambrosia-client-dist"

client_install() {
  echo "➡️  Starting Ambrosia POS Client installation..."
  if [ -d "${CLIENT_INSTALL_DIRECTORY}" ]; then
    echo "⚠️ Ambrosia Client is already installed."
    if [[ "$AUTO_YES" != true ]]; then
      echo "Do you want to continue (Overwrite)? (y/n): "
      read -r CONTINUE_REPLY
      if [[ ! $CONTINUE_REPLY =~ ^[Yy]$ ]]; then return; fi
    fi
    rm -rf "${CLIENT_INSTALL_DIRECTORY}"
  fi

  mkdir -p "$CLIENT_INSTALL_DIRECTORY"

  if [[ "$LOCAL_INSTALL" == "true" ]]; then
    if [[ ! -d "$CLIENT_DIST_DIRECTORY" ]]; then
      log_error "No local client build found at $CLIENT_DIST_DIRECTORY — run 'make build-client' first"
      exit 1
    fi
    cp -r "$CLIENT_DIST_DIRECTORY/." "$CLIENT_INSTALL_DIRECTORY/"
  else
    local client_dist_file="ambrosia-client-${AMBROSIA_TAG}.tar.gz"
    local client_dist_url="https://github.com/${AMBROSIA_REPO}/releases/download/v${AMBROSIA_TAG}/${client_dist_file}"
    download_file "$client_dist_url" "$GLOBAL_TEMP_DIRECTORY/$client_dist_file"
    tar -xzf "$GLOBAL_TEMP_DIRECTORY/$client_dist_file" -C "$CLIENT_INSTALL_DIRECTORY" --strip-components=1
  fi

  echo "   Installing Node.js dependencies..."
  pushd "$CLIENT_INSTALL_DIRECTORY" > /dev/null
  npm install --production --silent
  popd > /dev/null

  echo "✅ Client installed."

  # Create wrapper for easier execution
  cat <<EOF > "$AMBROSIA_INSTALL_DIRECTORY/run-client.sh"
#!/bin/bash
cd "$CLIENT_INSTALL_DIRECTORY" && npm start
EOF
  chmod +x "$AMBROSIA_INSTALL_DIRECTORY/run-client.sh"
  ln -sf "$AMBROSIA_INSTALL_DIRECTORY/run-client.sh" "$AMBROSIA_BIN_DIRECTORY/ambrosia-client"
  echo "   Symlink created: $AMBROSIA_BIN_DIRECTORY/ambrosia-client -> $AMBROSIA_INSTALL_DIRECTORY/run-client.sh"

  if [[ "$INSTALL_SYSTEMD" == "true" ]] && command -v systemctl >/dev/null; then
      client_setup_systemd
  fi
}

client_setup_systemd() {
    local reply="n"
    if [[ "$AUTO_YES" == true ]]; then reply="y";
    elif [[ -t 0 ]]; then
      echo "Setup systemd service for Ambrosia Client? (y/n): "
      read -r reply
    fi

    if [[ ! $reply =~ ^[Yy]$ ]]; then return 0; fi

    local npm_path node_path
    npm_path=$(which npm)
    node_path=$(which node)

    if [ -z "$npm_path" ]; then
        log_error "Could not find npm executable."
        return 1
    fi

    sudo tee "/etc/systemd/system/ambrosia-client.service" > /dev/null << EOF
[Unit]
Description=Ambrosia POS Client (Next.js)
After=network.target ambrosia.service
Wants=ambrosia.service

[Service]
User=$USER
WorkingDirectory=$CLIENT_INSTALL_DIRECTORY
Environment=PATH=$(dirname "$npm_path"):$(dirname "$node_path"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=NODE_ENV=production
ExecStart=$npm_path start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable "ambrosia-client"
    sudo systemctl restart "ambrosia-client"
    echo "✅ Client systemd service configured."
}

# --- Main execution flow ---
check_dependencies
print_header
if [[ "$LOCAL_INSTALL" == "true" ]]; then
  require_local_repo_root
  build_local_artifacts
else
  ambrosia_resolve_tag
fi
phoenixd_install
ambrosia_install
client_install

echo "🎉 Installation complete!"
