#!/bin/bash
set -euo pipefail

TAG="0.7.1-beta"
PACKAGE_NAME="ambrosia-client-dist"
CLIENT_DIST_DIR="${CLIENT_DIST_DIR:-/tmp/$PACKAGE_NAME}"

echo "=== Packaging Next.js application for distribution ==="

echo "Cleaning previous builds..."
rm -rf .next node_modules dist

if [ ! -d "./dist" ]; then
  echo "Creating dist directory in client/..."
  mkdir -p ./dist
fi

echo "Installing dependencies..."
npm ci --silent

echo "Building the Next.js application..."
npm run build

echo "Preparing standalone distribution tree..."
rm -rf "$CLIENT_DIST_DIR"
mkdir -p "$CLIENT_DIST_DIR/.next"
mkdir -p "$CLIENT_DIST_DIR/node_modules/@swc" "$CLIENT_DIST_DIR/node_modules"

echo "Copying build artifacts..."
cp -r .next/standalone/. "$CLIENT_DIST_DIR/"
cp -r .next/static "$CLIENT_DIST_DIR/.next/"
cp -r public "$CLIENT_DIST_DIR/"

# Next standalone occasionally omits runtime helpers that are still resolved
# dynamically at runtime on ARM targets. Copy the minimal helper packages
# explicitly to keep the bundle self-contained.
cp -r node_modules/@swc/helpers "$CLIENT_DIST_DIR/node_modules/@swc/"
cp -r node_modules/tslib "$CLIENT_DIST_DIR/node_modules/"

DIST_FILE="ambrosia-client-$TAG.tar.gz"

if [ "${NO_ZIP:-0}" != "1" ]; then
  echo "Creating distribution file: $DIST_FILE..."
  tar -C "$(dirname "$CLIENT_DIST_DIR")" -czf "$DIST_FILE" "$(basename "$CLIENT_DIST_DIR")"
  mv "$DIST_FILE" ./dist/
fi

echo ""
echo "Packaging complete!"
if [ "${NO_ZIP:-0}" = "1" ]; then
  echo "Your distribution package is located at: $CLIENT_DIST_DIR"
else
  echo "Your distribution package is located at: client/dist/$DIST_FILE"
fi
