#!/bin/bash

set -eo pipefail

# This script is for uninstalling Ambrosia POS from a Linux system.

# Parse command line arguments
AUTO_YES=false
for arg in "$@"; do
  case $arg in
    --yes|-y)
      AUTO_YES=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# --- Install locations (mirrors Makefile and install.sh) ---
AMBROSIA_INSTALL_DIR="$HOME/.local/ambrosia"
AMBROSIA_BIN_DIR="$HOME/.local/bin"
AMBROSIA_CONFIG_DIR="$HOME/.Ambrosia-POS"
AMBROSIA_SERVICE_FILE="/etc/systemd/system/ambrosia.service"
AMBROSIA_CLIENT_SERVICE_FILE="/etc/systemd/system/ambrosia-client.service"
CLIENT_DIST_DIR="/tmp/ambrosia-client-dist"

PHOENIXD_BIN_DIR="/usr/local/bin"
PHOENIXD_SERVICE_FILE="/etc/systemd/system/phoenixd.service"

echo ""
echo "🗑️  Ambrosia POS Uninstaller"
echo "-----------------------------------"
echo "This script will remove all Ambrosia POS components from your system."
echo ""

if [[ "$AUTO_YES" == true ]]; then
  REPLY="y"
elif [[ -t 0 ]]; then
  echo "Are you sure you want to uninstall Ambrosia POS? This will remove all data. (y/n): "
  read -r REPLY
else
  echo "Running in non-interactive mode. Proceeding with uninstallation."
  REPLY="y"
fi

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Uninstallation cancelled."
  exit 0
fi

# --- Ambrosia server systemd service ---
if [ -f "$AMBROSIA_SERVICE_FILE" ]; then
  echo "Stopping and disabling Ambrosia POS service..."
  sudo systemctl stop ambrosia 2>/dev/null || true
  sudo systemctl disable ambrosia 2>/dev/null || true
  sudo rm -f "$AMBROSIA_SERVICE_FILE" 2>/dev/null || true
  sudo systemctl daemon-reload 2>/dev/null || true
  echo "✅ Ambrosia systemd service removed"
fi

# --- Ambrosia client systemd service ---
if [ -f "$AMBROSIA_CLIENT_SERVICE_FILE" ]; then
  echo "Stopping and disabling Ambrosia POS Client service..."
  sudo systemctl stop ambrosia-client 2>/dev/null || true
  sudo systemctl disable ambrosia-client 2>/dev/null || true
  sudo rm -f "$AMBROSIA_CLIENT_SERVICE_FILE" 2>/dev/null || true
  sudo systemctl daemon-reload 2>/dev/null || true
  echo "✅ Ambrosia client systemd service removed"
fi

# --- Symlinks ---
if [ -L "$AMBROSIA_BIN_DIR/ambrosia" ]; then
  rm -f "$AMBROSIA_BIN_DIR/ambrosia"
  echo "✅ ambrosia symlink removed"
fi

if [ -L "$AMBROSIA_BIN_DIR/ambrosia-client" ]; then
  rm -f "$AMBROSIA_BIN_DIR/ambrosia-client"
  echo "✅ ambrosia-client symlink removed"
fi

# --- Installation directory (includes server JAR, scripts, and client build) ---
if [ -d "$AMBROSIA_INSTALL_DIR" ]; then
  echo "Removing installation directory..."
  rm -rf "$AMBROSIA_INSTALL_DIR"
  echo "✅ Installation directory removed ($AMBROSIA_INSTALL_DIR)"
fi

# --- Build artifacts ---
if [ -d "$CLIENT_DIST_DIR" ]; then
  rm -rf "$CLIENT_DIST_DIR"
  echo "✅ Build artifacts removed ($CLIENT_DIST_DIR)"
fi

# --- Configuration directory (optional) ---
if [ -d "$AMBROSIA_CONFIG_DIR" ]; then
  if [[ "$AUTO_YES" == true ]]; then
    REMOVE_CONFIG="y"
  elif [[ -t 0 ]]; then
    echo "Do you want to remove the configuration directory with all your settings? (y/n): "
    read -r REMOVE_CONFIG
  else
    # In non-interactive mode, preserve config by default
    REMOVE_CONFIG="n"
  fi

  if [[ $REMOVE_CONFIG =~ ^[Yy]$ ]]; then
    rm -rf "$AMBROSIA_CONFIG_DIR"
    echo "✅ Configuration directory removed ($AMBROSIA_CONFIG_DIR)"
  else
    echo "Configuration directory preserved at: $AMBROSIA_CONFIG_DIR"
  fi
fi

echo ""
echo "✅ Ambrosia POS has been uninstalled successfully!"
echo ""
echo "Note: Any PATH modifications made during installation were not removed."
echo "If you'd like to remove them, please edit your ~/.bashrc and ~/.zshrc files."
echo ""

# --- phoenixd ---
echo ""
echo "🗑️  phoenixd Uninstaller"
echo "-----------------------------------"
echo "This script will remove phoenixd binaries and service from your system."
echo "⚠️  Note: Your wallet data and configuration files will NOT be removed."
echo ""

if [[ "$AUTO_YES" == true ]]; then
  REPLY="y"
elif [[ -t 0 ]]; then
  echo "Are you sure you want to uninstall phoenixd? (y/n): "
  read -r REPLY
else
  echo "Running in non-interactive mode. Proceeding with uninstallation."
  REPLY="y"
fi

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "phoenixd uninstallation cancelled."
  exit 0
fi

if [ -f "$PHOENIXD_SERVICE_FILE" ]; then
  echo "Stopping and disabling phoenixd service..."
  sudo systemctl stop phoenixd 2>/dev/null || true
  sudo systemctl disable phoenixd 2>/dev/null || true
  sudo rm -f "$PHOENIXD_SERVICE_FILE" 2>/dev/null || true
  sudo systemctl daemon-reload 2>/dev/null || true
  echo "✅ phoenixd systemd service removed"
fi

if [ -f "$PHOENIXD_BIN_DIR/phoenixd" ]; then
  sudo rm -f "$PHOENIXD_BIN_DIR/phoenixd"
  echo "✅ phoenixd binary removed"
fi

if [ -f "$PHOENIXD_BIN_DIR/phoenix-cli" ]; then
  sudo rm -f "$PHOENIXD_BIN_DIR/phoenix-cli"
  echo "✅ phoenix-cli binary removed"
fi

echo ""
echo "✅ phoenixd has been uninstalled successfully!"
echo ""
echo "⚠️  IMPORTANT: Your wallet data has been preserved for security reasons."
echo "If you need to remove wallet data, you must do it manually."
echo "Data directory location: ~/.phoenix"
echo ""
echo "Note: If you manually added phoenixd to your PATH, please remove those entries"
echo "from your ~/.bashrc, ~/.zshrc, or other shell configuration files."
echo ""
