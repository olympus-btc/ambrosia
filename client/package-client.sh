#!/bin/bash
set -e

TAG="0.5.1-alpha"

echo "=== Packaging Next.js application for distribution ==="

# 1. Clean
echo "Cleaning previous builds..."
npm run clean

# Verify if the dist directory exists, if not, create it
if [ ! -d "./dist" ]; then
  echo "Creating dist directory in client/..."
  mkdir -p ./dist
fi

# 2. Install dependencies
echo "Installing dependencies..."
npm i
# 3. Build the application
echo "Building the Next.js application..."
npm run build

# 4. Create temporary directory for the package
PACKAGE_NAME="ambrosia-client-dist"
rm -rf "/tmp/$PACKAGE_NAME"
mkdir -p "/tmp/$PACKAGE_NAME"

# 5. Copy necessary files for production
echo "Copying build artifacts..."
cp -r .next "/tmp/$PACKAGE_NAME/"
cp -r public "/tmp/$PACKAGE_NAME/"
cp package.json "/tmp/$PACKAGE_NAME/"
cp package-lock.json "/tmp/$PACKAGE_NAME/"
cp next.config.mjs "/tmp/$PACKAGE_NAME/"

# 6. Copy installation script
echo "Copying installation script..."

# 7. Create compressed file if not NO_ZIP=1
if [ "${NO_ZIP:-0}" != "1" ]; then
  DIST_FILE="ambrosia-client-$TAG.tar.gz"
  echo "Creating distribution file: $DIST_FILE..."
  cd /tmp
  tar -czf "$DIST_FILE" "$PACKAGE_NAME"
  cd -
  # 6. Clean up
  mv "/tmp/$DIST_FILE" ./dist/
fi

echo ""
echo "✅ Packaging complete!"
echo "Your distribution package is located at: client/dist/$DIST_FILE"
