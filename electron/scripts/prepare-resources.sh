#!/bin/bash
set -e

echo "==========================================="
echo "  Ambrosia POS - Resource Preparation"
echo "==========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ELECTRON_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running on macOS (for platform-specific tasks)
IS_MACOS=false
if [[ "$OSTYPE" == "darwin"* ]]; then
    IS_MACOS=true
fi

# Detect target platform
# Use TARGET_PLATFORM env var if set, otherwise auto-detect
if [ -n "$TARGET_PLATFORM" ]; then
    PLATFORM="$TARGET_PLATFORM"
    echo "Using TARGET_PLATFORM: $PLATFORM (cross-platform build)"
else
    PLATFORM=""
    ARCH=$(uname -m)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if [[ "$ARCH" == "arm64" ]]; then
            PLATFORM="macos-arm64"
        else
            PLATFORM="macos-x64"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        PLATFORM="linux-x64"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        PLATFORM="win-x64"
    fi
    echo "Auto-detected platform: $PLATFORM"
fi

echo "Building for platform: $PLATFORM"
echo ""

echo "=== Step 1: Download Node.js for $PLATFORM ==="
echo ""

NODE_CHECK=""
if [ "$PLATFORM" == "win-x64" ]; then
    NODE_CHECK="resources/node/$PLATFORM/node.exe"
else
    NODE_CHECK="resources/node/$PLATFORM/bin/node"
fi

if [ -f "$NODE_CHECK" ]; then
    print_status "Node.js already downloaded for $PLATFORM, skipping..."
else
    print_warning "Downloading Node.js (this may take a while)..."
    node scripts/download-node.js
    print_status "Node.js download complete"
fi

echo ""
echo "=== Step 2: Download JRE 21 for $PLATFORM ==="
echo ""

JRE_CHECK=""
if [ "$PLATFORM" == "win-x64" ]; then
    JRE_CHECK="resources/jre/$PLATFORM/bin/java.exe"
else
    JRE_CHECK="resources/jre/$PLATFORM/bin/java"
fi

if [ -f "$JRE_CHECK" ]; then
    print_status "JRE already downloaded for $PLATFORM, skipping..."
else
    print_warning "Downloading JRE 21 (this may take a while)..."
    node scripts/download-jre.js
    print_status "JRE download complete"
fi

echo ""
echo "=== Step 3: Download Phoenixd for $PLATFORM ==="
echo ""

PHOENIXD_CHECK=""
if [ "$PLATFORM" == "win-x64" ]; then
    PHOENIXD_CHECK="resources/phoenixd/$PLATFORM/bin/phoenixd.bat"
else
    PHOENIXD_CHECK="resources/phoenixd/$PLATFORM/phoenixd"
fi

if [ -f "$PHOENIXD_CHECK" ]; then
    print_status "Phoenixd already downloaded for $PLATFORM, skipping..."
else
    print_warning "Downloading Phoenixd binaries..."
    node scripts/download-phoenixd.js
    print_status "Phoenixd download complete"
fi

echo ""
echo "=== Step 4: Build Backend JAR ==="
echo ""

node scripts/build-backend.js
print_status "Backend build complete"

echo ""
echo "=== Step 5: Build Next.js Client ==="
echo ""

node scripts/build-client.js
print_status "Client build complete"

echo ""
echo "==========================================="
echo "  Resource Preparation Summary"
echo "==========================================="
echo ""

# Calculate sizes
NODE_SIZE=$(du -sh resources/node 2>/dev/null | cut -f1 || echo "N/A")
JRE_SIZE=$(du -sh resources/jre 2>/dev/null | cut -f1 || echo "N/A")
PHOENIXD_SIZE=$(du -sh resources/phoenixd 2>/dev/null | cut -f1 || echo "N/A")
BACKEND_SIZE=$(du -sh resources/backend 2>/dev/null | cut -f1 || echo "N/A")
CLIENT_SIZE=$(du -sh resources/client 2>/dev/null | cut -f1 || echo "N/A")
TOTAL_SIZE=$(du -sh resources 2>/dev/null | cut -f1 || echo "N/A")

echo "Resources prepared for $PLATFORM:"
echo "  • Node.js:        $NODE_SIZE"
echo "  • JRE:            $JRE_SIZE"
echo "  • Phoenixd:       $PHOENIXD_SIZE"
echo "  • Backend JAR:    $BACKEND_SIZE"
echo "  • Next.js Client: $CLIENT_SIZE"
echo "  ────────────────────────"
echo "  • Total:                 $TOTAL_SIZE"
echo ""

# Verify critical files
echo "Verifying critical files:"

ERRORS=0

# Check Node.js for current platform
if [ "$PLATFORM" == "win-x64" ]; then
    NODE_BIN="resources/node/$PLATFORM/node.exe"
else
    NODE_BIN="resources/node/$PLATFORM/bin/node"
fi

if [ -f "$NODE_BIN" ]; then
    print_status "Node.js $PLATFORM: Found"
else
    print_error "Node.js $PLATFORM: Missing"
    ERRORS=$((ERRORS + 1))
fi

# Check JRE for current platform
if [ "$PLATFORM" == "win-x64" ]; then
    JAVA_BIN="resources/jre/$PLATFORM/bin/java.exe"
else
    JAVA_BIN="resources/jre/$PLATFORM/bin/java"
fi

if [ -f "$JAVA_BIN" ]; then
    print_status "JRE $PLATFORM: Found"
else
    print_error "JRE $PLATFORM: Missing"
    ERRORS=$((ERRORS + 1))
fi

# Check Phoenixd for current platform
if [ "$PLATFORM" == "win-x64" ]; then
    PHOENIXD_BIN="resources/phoenixd/$PLATFORM/bin/phoenixd.bat"
else
    PHOENIXD_BIN="resources/phoenixd/$PLATFORM/phoenixd"
fi

if [ -f "$PHOENIXD_BIN" ]; then
    print_status "Phoenixd $PLATFORM: Found"
else
    print_error "Phoenixd $PLATFORM: Missing"
    ERRORS=$((ERRORS + 1))
fi

# Check Backend
if [ -f "resources/backend/ambrosia.jar" ]; then
    print_status "Backend JAR: Found"
else
    print_error "Backend JAR: Missing"
    ERRORS=$((ERRORS + 1))
fi

# Check Client
if [ -f "resources/client/server.js" ]; then
    print_status "Next.js Client: Found"
else
    print_error "Next.js Client: Missing"
    ERRORS=$((ERRORS + 1))
fi

echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}==========================================="
    echo "  ✓ All resources prepared successfully!"
    echo "  Ready to build with electron-builder"
    echo -e "===========================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  • npm run build      - Build for current platform"
    echo "  • npm run dist:mac   - Build macOS installer"
    echo "  • npm run dist:win   - Build Windows installer"
    echo "  • npm run dist:linux - Build Linux installer"
    echo ""
    exit 0
else
    echo -e "${RED}==========================================="
    echo "  ✗ Resource preparation incomplete"
    echo "  $ERRORS error(s) found"
    echo -e "===========================================${NC}"
    echo ""
    exit 1
fi
