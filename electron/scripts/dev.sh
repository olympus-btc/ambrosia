#!/bin/bash

# Script de desarrollo para Ambrosia POS Electron

set -e

echo "🚀 Iniciando Ambrosia POS en modo desarrollo..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js no está instalado${NC}"
    exit 1
fi

# Verificar configuración de backend
CONF_FILE="$HOME/.Ambrosia-POS/ambrosia.conf"
if [ ! -f "$CONF_FILE" ]; then
    echo -e "${RED}❌ Error: No se encontró $CONF_FILE${NC}"
    echo -e "${YELLOW}   Por favor, inicie el backend de Ambrosia primero${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuración de backend encontrada${NC}"

# Instalar dependencias de Electron si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de Electron..."
    npm install
fi

# Instalar dependencias del cliente si es necesario
if [ ! -d "../client/node_modules" ]; then
    echo "📦 Instalando dependencias del cliente..."
    cd ../client
    npm install
    cd ../electron
fi

# Iniciar Electron
echo -e "${GREEN}🎯 Iniciando Electron...${NC}"
NODE_ENV=development npm run dev
