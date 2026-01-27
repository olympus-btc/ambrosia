#!/bin/bash

# ==========================================
# 🚀 Ambrosia & Phoenixd Installer
# ==========================================

# Exit immediately if a command exits with a non-zero status, undefined vars, pipe fails.
set -euo pipefail
IFS=$'\n\t'

# --- Argument validation ---
AUTO_YES=false
INSTALL_SYSTEMD=true

for arg in "$@"; do
  case $arg in
    --yes|-y) 
      AUTO_YES=true
      shift
      ;;
    --no-service)
      INSTALL_SYSTEMD=false
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
  local dependencies=("curl" "unzip" "tar" "sha256sum" "gpg")
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

print_header() {
  echo "----------------------------------------"
  echo " 🚀 Unified Ambrosia & Phoenixd Installer"
  echo "----------------------------------------"
}

# --- Phoenixd Installation Logic ---

PHOENIXD_TAG="0.7.1"
PHOENIXD_RELEASE_BASE_URL="https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_TAG}"
PHOENIXD_INSTALL_DIR="/usr/local/bin"
PHOENIXD_OS=""
PHOENIXD_ARCH=""
PHOENIXD_ZIP_FILENAME=""

phoenixd_detect_os_arch() {
  PHOENIXD_ARCH=$(uname -m)
  if [[ "$OSTYPE" == "linux"* ]]; then
    if [[ "$PHOENIXD_ARCH" == "x86_64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-linux-x64.zip"
      PHOENIXD_OS="linux-x64"
    elif [[ "$PHOENIXD_ARCH" == "aarch64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-linux-arm64.zip"
      PHOENIXD_OS="linux-arm64"
    else
      log_error "Unsupported architecture: $PHOENIXD_ARCH"
      exit 1
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ "$PHOENIXD_ARCH" == "x86_64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-macos-x64.zip"
      PHOENIXD_OS="macos-x64"
    elif [[ "$PHOENIXD_ARCH" == "arm64" ]]; then
      PHOENIXD_ZIP_FILENAME="phoenixd-${PHOENIXD_TAG}-macos-arm64.zip"
      PHOENIXD_OS="macos-arm64"
    else
      log_error "Unsupported architecture: $PHOENIXD_ARCH"
      exit 1
    fi
  else
    log_error "Unsupported OS type: $OSTYPE"
    exit 1
  fi
  echo "Detected architecture: $PHOENIXD_ARCH"
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
  pushd "$GLOBAL_TEMP_DIR" > /dev/null
  
  local acinq_key_url="https://acinq.co/pgp/padioupm.asc"
  local sig_url="${PHOENIXD_RELEASE_BASE_URL}/SHA256SUMS.asc"
  
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

phoenixd_install() {
  phoenixd_detect_os_arch
  phoenixd_check_existing
  
  echo "Installing phoenixd ${PHOENIXD_TAG}"
  sudo mkdir -p "$PHOENIXD_INSTALL_DIR"
  
  # Download to global temp
  download_file "${PHOENIXD_RELEASE_BASE_URL}/${PHOENIXD_ZIP_FILENAME}" "$GLOBAL_TEMP_DIR/$PHOENIXD_ZIP_FILENAME"
  
  phoenixd_verify_signature
  
  sudo unzip -j -o "$GLOBAL_TEMP_DIR/$PHOENIXD_ZIP_FILENAME" -d "$PHOENIXD_INSTALL_DIR"
  echo "✅ phoenixd installed to $PHOENIXD_INSTALL_DIR"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "MacOS: Ensure $PHOENIXD_INSTALL_DIR is in your PATH."
    return
  fi

  # Systemd
  if [[ "$INSTALL_SYSTEMD" == "true" ]] && command -v systemctl >/dev/null; then
     phoenixd_setup_systemd
  fi
}

phoenixd_setup_systemd() {
  local reply="n"
  if [[ "$AUTO_YES" == true ]]; then reply="y";
  elif [[ -t 0 ]]; then
    echo "Do you want to setup a systemd service (requires sudo permission)? (y/n): "
    read -r reply
  fi
  
  if [[ $reply =~ ^[Yy]$ ]]; then
    sudo tee /etc/systemd/system/phoenixd.service > /dev/null << EOF
[Unit]
Description=Phoenix Daemon
After=network.target

[Service]
ExecStart=$PHOENIXD_INSTALL_DIR/phoenixd --agree-to-terms-of-service
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

AMBROSIA_TAG="0.5.1-alpha"
AMBROSIA_URL="https://github.com/olympus-btc/ambrosia/releases/download/v${AMBROSIA_TAG}"
AMBROSIA_INSTALL_DIR="$HOME/.local/ambrosia"
AMBROSIA_BIN_DIR="$HOME/.local/bin"

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

  mkdir -p "$AMBROSIA_BIN_DIR" "$AMBROSIA_INSTALL_DIR"
  
  download_file "${AMBROSIA_URL}/ambrosia-${AMBROSIA_TAG}.jar" "$AMBROSIA_INSTALL_DIR/ambrosia.jar"
  download_file "https://raw.githubusercontent.com/olympus-btc/ambrosia/v${AMBROSIA_TAG}/scripts/run-server.sh" "$AMBROSIA_INSTALL_DIR/run-server.sh"
  
  chmod +x "$AMBROSIA_INSTALL_DIR/ambrosia.jar" "$AMBROSIA_INSTALL_DIR/run-server.sh"
  ln -sf "$AMBROSIA_INSTALL_DIR/run-server.sh" "$AMBROSIA_BIN_DIR/ambrosia"
  
  echo "✅ Ambrosia POS Server installed."
  
  # Setup Path logic (simplified)
  local rc_file=""
  [[ $SHELL == *"zsh"* ]] && rc_file="$HOME/.zshrc"
  [[ $SHELL == *"bash"* ]] && rc_file="$HOME/.bashrc"
  if [[ -n "$rc_file" && -f "$rc_file" ]] && ! grep -q "$AMBROSIA_BIN_DIR" "$rc_file"; then
      echo "export PATH=\"$AMBROSIA_BIN_DIR:\$PATH\"" >> "$rc_file"
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
ExecStart=$AMBROSIA_INSTALL_DIR/run-server.sh
WorkingDirectory=$AMBROSIA_INSTALL_DIR
User=$USER
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

CLIENT_TAG="0.5.1-alpha"
CLIENT_DIST_FILE="ambrosia-client-${CLIENT_TAG}.tar.gz"
CLIENT_DIST_URL="https://github.com/olympus-btc/ambrosia/releases/download/v${CLIENT_TAG}/${CLIENT_DIST_FILE}"
CLIENT_INSTALL_DIR="$HOME/.local/ambrosia/client"

client_install() {
  echo "➡️  Starting Ambrosia POS Client installation..."
  if [ -d "${CLIENT_INSTALL_DIR}" ]; then
    echo "⚠️ Ambrosia Client is already installed."
    if [[ "$AUTO_YES" != true ]]; then
      echo "Do you want to continue (Overwrite)? (y/n): "
      read -r CONTINUE_REPLY
      if [[ ! $CONTINUE_REPLY =~ ^[Yy]$ ]]; then return; fi
    fi
    rm -rf "${CLIENT_INSTALL_DIR}"
  fi

  mkdir -p "$CLIENT_INSTALL_DIR"
  
  download_file "$CLIENT_DIST_URL" "$GLOBAL_TEMP_DIR/$CLIENT_DIST_FILE"
  tar -xzf "$GLOBAL_TEMP_DIR/$CLIENT_DIST_FILE" -C "$CLIENT_INSTALL_DIR" --strip-components=1
  
  echo "   Installing Node.js dependencies..."
  pushd "$CLIENT_INSTALL_DIR" > /dev/null
  npm install --production --silent
  popd > /dev/null
  
  echo "✅ Client installed."

  # Create wrapper for easier execution
  cat <<EOF > "$AMBROSIA_INSTALL_DIR/run-client.sh"
#!/bin/bash
cd "$CLIENT_INSTALL_DIR" && npm start
EOF
  chmod +x "$AMBROSIA_INSTALL_DIR/run-client.sh"
  ln -sf "$AMBROSIA_INSTALL_DIR/run-client.sh" "$AMBROSIA_BIN_DIR/ambrosia-client"
  echo "   Symlink created: $AMBROSIA_BIN_DIR/ambrosia-client -> $AMBROSIA_INSTALL_DIR/run-client.sh"

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

    local npm_path=$(which npm)
    local node_path=$(which node)

    if [ -z "$npm_path" ]; then
        log_error "Could not find npm executable."
        return 1
    fi

    sudo tee "/etc/systemd/system/ambrosia-client.service" > /dev/null << EOF
[Unit]
Description=Ambrosia POS Client (Next.js)
After=network.target

[Service]
User=$USER
WorkingDirectory=$CLIENT_INSTALL_DIR
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
phoenixd_install
ambrosia_install
client_install

echo "🎉 Installation complete!"
