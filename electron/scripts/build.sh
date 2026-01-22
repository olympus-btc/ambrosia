#!/bin/bash

# Build script for Ambrosia POS Electron

set -e

echo "🏗️  Building Ambrosia POS for production..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

cd ../client
npm install
cd ../electron

# 2. Build Next.js client
echo -e "${YELLOW}📦 Building Next.js client...${NC}"
cd ../client
npm run build:electron
cd ../electron

# 3. Verify that .next exists
if [ ! -d "../client/.next" ]; then
    echo "❌ Error: Next.js build failed"
    exit 1
fi

echo -e "${GREEN}✅ Next.js build completed${NC}"

# 4. Build Electron
echo -e "${YELLOW}📦 Building Electron application...${NC}"
npm run build

echo -e "${GREEN}✅ Build completed!${NC}"
echo -e "${GREEN}   Files available at: electron/dist/${NC}"
