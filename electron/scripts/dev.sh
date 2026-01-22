#!/bin/bash

# Development script for Ambrosia POS Electron

set -e

echo "🚀 Starting Ambrosia POS in development mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

# Check backend configuration
CONF_FILE="$HOME/.Ambrosia-POS/ambrosia.conf"
if [ ! -f "$CONF_FILE" ]; then
    echo -e "${RED}❌ Error: $CONF_FILE not found${NC}"
    echo -e "${YELLOW}   Please start the Ambrosia backend first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend configuration found${NC}"

# Install Electron dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Electron dependencies..."
    npm install
fi

# Install client dependencies if needed
if [ ! -d "../client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd ../client
    npm install
    cd ../electron
fi

# Start Electron
echo -e "${GREEN}🎯 Starting Electron...${NC}"
NODE_ENV=development npm run dev
