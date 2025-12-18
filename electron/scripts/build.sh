#!/bin/bash

# Script de build para Ambrosia POS Electron

set -e

echo "🏗️  Building Ambrosia POS para producción..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

cd ../client
npm install
cd ../electron

# 2. Build del cliente Next.js
echo -e "${YELLOW}📦 Building cliente Next.js...${NC}"
cd ../client
npm run build:electron
cd ../electron

# 3. Verificar que .next existe
if [ ! -d "../client/.next" ]; then
    echo "❌ Error: Build de Next.js falló"
    exit 1
fi

echo -e "${GREEN}✅ Build de Next.js completado${NC}"

# 4. Build de Electron
echo -e "${YELLOW}📦 Building aplicación Electron...${NC}"
npm run build

echo -e "${GREEN}✅ Build completado!${NC}"
echo -e "${GREEN}   Archivos disponibles en: electron/dist/${NC}"
