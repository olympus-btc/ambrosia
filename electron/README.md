# Ambrosia POS - Electron Desktop Application

Aplicación de escritorio completa y autónoma para Ambrosia POS construida con Electron.

## Arquitectura

Ambrosia POS Electron es una **aplicación standalone completa** que integra todo el stack:

```
Electron Main Process
├── ServiceManager (orchestrator)
│   ├── PhoenixdService → phoenixd daemon (Bitcoin/Lightning)
│   ├── BackendService  → Kotlin/Ktor API server
│   └── NextJsService   → Next.js web server
├── ConfigurationBootstrap (auto-config con BIP39)
├── Port Allocator (dynamic port assignment)
├── Health Checks (wait-on con reintentos)
└── BrowserWindow → http://localhost:[DYNAMIC_PORT]

Renderer Process
├── Next.js App Router (React 19)
├── API calls → Backend interno (127.0.0.1:[BACKEND_PORT])
└── Interfaz completa del POS
```

### Dos Modos de Operación

**Desarrollo** (`NODE_ENV=development` o `!app.isPackaged`):
- Solo inicia **Next.js** en puerto 3000
- Asume phoenixd (9740) y backend (9154) externos
- DevTools habilitado automáticamente
- Ideal para desarrollo del frontend

**Producción** (app empaquetado):
- Inicia secuencialmente: **Phoenixd → Backend → Next.js**
- Puertos dinámicos (evita conflictos)
- Aplicación completamente autónoma
- No requiere servicios externos

## Requisitos Previos

- **Node.js 18+** y npm
- **Java Runtime** (incluido en el bundle de producción)
- Solo para desarrollo: Backend corriendo externamente en 9154

## Instalación de Dependencias

```bash
# Desde la carpeta electron/
npm install

# Instalar dependencias del cliente
cd ../client
npm install
cd ../electron
```

## Desarrollo

### Prerequisitos para Desarrollo

Antes de ejecutar Electron en modo desarrollo, asegúrate de tener:

1. **Backend corriendo**:
   ```bash
   cd server && ./gradlew run
   ```

2. **Phoenixd corriendo** (opcional, solo si necesitas pagos):
   ```bash
   # Ver documentación de phoenixd
   ```

### Usando el Script de Desarrollo

**macOS/Linux:**
```bash
./scripts/dev.sh
```

**Windows:**
```bash
scripts\dev.bat
```

### Usando npm directamente

```bash
npm run dev
```

### Usando Make (desde la raíz del proyecto)

```bash
make electron-dev
```

### ¿Qué sucede al ejecutar en modo desarrollo?

1. **ServiceManager detecta modo desarrollo**
2. **Solo inicia Next.js** en puerto 3000
3. Asume backend externo en `http://localhost:9154`
4. Asume phoenixd externo en `http://localhost:9740`
5. Crea BrowserWindow y carga `http://localhost:3000`
6. Habilita DevTools automáticamente
7. Hot reload de Next.js funcionando

## Build para Producción

### Build Completo

```bash
# Usando el script
./scripts/build.sh

# O usando npm
npm run build

# O usando Make
make electron-build
```

### Build por Plataforma

```bash
# macOS
npm run dist:mac:arm64           # ARM64 (Apple Silicon)
npm run dist:mac:x64             # Intel
make electron-build-mac

# Windows
npm run dist:win:x64             # x64
npm run dist:win:arm64           # ARM64
make electron-build-win

# Linux
npm run dist:linux:x64           # x64
npm run dist:linux:arm64         # ARM64
make electron-build-linux
```

### Salida del Build

Los instaladores se generan en `electron/dist/`:
- **macOS**: `Ambrosia POS-1.0.0.dmg`, `Ambrosia POS-1.0.0-mac.zip`
- **Windows**: `Ambrosia POS Setup 1.0.0.exe`, portable `.exe`
- **Linux**:
  - Debian/Ubuntu: `ambrosia-pos_1.0.0_amd64.deb`, `ambrosia-pos_1.0.0_arm64.deb`
  - Red Hat/Fedora/CentOS: `ambrosia-pos-1.0.0.x86_64.rpm`, `ambrosia-pos-1.0.0.aarch64.rpm`

## Estructura del Proyecto

```
electron/
├── main.js                          # Proceso principal de Electron
├── preload.js                       # Script de preload (APIs seguras)
├── package.json                     # Configuración y dependencias
├── services/                        # Gestión de servicios embebidos
│   ├── ServiceManager.js            # Orquestador principal
│   ├── PhoenixdService.js           # Gestión de phoenixd
│   ├── BackendService.js            # Gestión del backend Kotlin
│   ├── NextJsService.js             # Gestión de Next.js
│   └── ConfigurationBootstrap.js    # Generación automática de configs
├── utils/                           # Utilidades
│   ├── portAllocator.js             # Asignación dinámica de puertos
│   ├── healthCheck.js               # Health checks con reintentos
│   └── resourcePaths.js             # Rutas de recursos y detección de modo
├── build/                           # Assets para electron-builder
│   ├── icon.icns                    # Icono macOS
│   ├── icon.ico                     # Icono Windows
│   ├── icon.png                     # Icono Linux
│   ├── entitlements.mac.plist
│   └── ICONS_README.md              # Instrucciones para generar iconos
├── scripts/                         # Scripts de desarrollo y build
│   ├── dev.sh                       # Script de desarrollo (Unix)
│   ├── dev.bat                      # Script de desarrollo (Windows)
│   ├── build.sh                     # Script de build
│   ├── prepare-resources-wrapper.js # Preparación de recursos para build
│   └── clean-build.js               # Limpieza de builds
├── resources/                       # Recursos embebidos (generado en build)
│   ├── phoenixd/                    # Binarios de phoenixd por plataforma
│   ├── backend/                     # JAR del backend + JRE
│   └── client/                      # Build standalone de Next.js
└── dist/                            # Salida de electron-builder (generado)
```

## Configuración

### Generación Automática de Configuración

La aplicación genera automáticamente toda la configuración necesaria en el primer arranque:

**Archivos generados**:
```
~/.Ambrosia-POS/
├── ambrosia.conf              # Configuración del backend
├── ambrosia.db                # Base de datos SQLite
├── phoenix/
│   └── phoenix.conf           # Configuración de phoenixd
└── logs/
    ├── phoenixd-YYYY-MM-DD.log
    ├── backend-YYYY-MM-DD.log
    └── nextjs-YYYY-MM-DD.log
```

**ambrosia.conf** (generado automáticamente):
```properties
http-bind-ip=127.0.0.1
http-bind-port=9154  # Dinámico en producción
secret=<BIP39 12-word mnemonic>  # 132 bits entropy
secret-hash=<SHA256 hash>
phoenixd-url=http://localhost:9740
```

**phoenix.conf** (generado automáticamente):
```properties
http-password=<random 64 hex chars>
http-password-limited-access=<random 64 hex chars>
webhook-secret=<random 64 hex chars>
webhook=http://127.0.0.1:9154/webhook/phoenixd
auto-liquidity=off
max-mining-fee-sat-vb=5000
```

### Seguridad de Secretos

- **BIP39 Mnemonic**: Usa estándar BIP39 para secretos (128 bits de entropía + 4 bits checksum)
- **Validación**: Checksums incluidos para detección de errores
- **Compatibilidad**: Compatible con wallets Bitcoin estándar

### Electron Builder

La configuración está en `package.json` bajo la clave `build`. Personalizar:
- `appId`: Identificador de la aplicación
- `productName`: Nombre visible
- `mac/win/linux`: Configuración por plataforma

## Troubleshooting

### Error: Aplicación no inicia (Modo Producción)

**Causa**: Phoenixd o Backend fallan al iniciar.

**Solución**:
1. Revisar logs en `~/.Ambrosia-POS/logs/`
2. Verificar que puertos dinámicos estén disponibles
3. Verificar permisos de ejecución en binarios
4. En el diálogo de error, seleccionar "Logs" para ver detalles

### Error: Backend no encontrado (Modo Desarrollo)

**Causa**: Backend externo no está corriendo.

**Solución**:
```bash
cd ../server
./gradlew run
```

### Error: Puerto 3000 en uso (Modo Desarrollo)

**Causa**: Otro proceso usa el puerto 3000.

**Solución**:
```bash
# Encontrar y detener el proceso
lsof -i :3000
kill <PID>
```

### Error: Servicios no se detienen correctamente

**Causa**: Procesos zombies de phoenixd/backend/nextjs.

**Solución**:
```bash
# Matar todos los procesos relacionados
pkill -f phoenixd
pkill -f "java.*ambrosia"
pkill -f "node.*next"
```

### Error: Build falla

**Causa**: Dependencias faltantes o build de Next.js incompleto.

**Solución**:
```bash
# Limpiar y reconstruir todo
cd ../client
rm -rf .next node_modules
npm install
npm run build:electron
cd ../electron
npm run clean
npm install
npm run build
```

### Error: Health check timeout

**Causa**: Servicio tarda mucho en iniciar o falla silenciosamente.

**Solución**:
1. Revisar logs del servicio específico en `~/.Ambrosia-POS/logs/`
2. Verificar que el servicio anterior en la cadena inició correctamente
3. Incrementar timeout en `utils/healthCheck.js` si es necesario

### Ver Logs de Servicios

Los logs se guardan por fecha en `~/.Ambrosia-POS/logs/`:
```bash
# Ver logs en tiempo real
tail -f ~/.Ambrosia-POS/logs/phoenixd-$(date +%Y-%m-%d).log
tail -f ~/.Ambrosia-POS/logs/backend-$(date +%Y-%m-%d).log
tail -f ~/.Ambrosia-POS/logs/nextjs-$(date +%Y-%m-%d).log
```

### Reinstalación Completa

Si todo lo demás falla:
```bash
# 1. Limpiar configuración existente (CUIDADO: borra la base de datos)
rm -rf ~/.Ambrosia-POS

# 2. Limpiar builds
cd electron
npm run clean

# 3. Reconstruir todo
cd ../client
npm install
npm run build:electron
cd ../electron
npm install
npm run build
```

## Iconos de la Aplicación

Los iconos deben estar en `build/`:
- `icon.icns` - macOS (512x512+)
- `icon.ico` - Windows (múltiples tamaños)
- `icon.png` - Linux (512x512)

Ver `build/ICONS_README.md` para instrucciones sobre cómo generar los iconos.

## Seguridad

La aplicación implementa las siguientes medidas de seguridad:

- ✅ `contextIsolation: true` - Aislamiento de contexto
- ✅ `nodeIntegration: false` - Node.js deshabilitado en renderer
- ✅ `sandbox: true` - Sandbox habilitado
- ✅ Preload script con whitelist de canales IPC
- ✅ Validación de configuración del backend

## Características

### Modo Desarrollo
- DevTools habilitados automáticamente
- Hot reload de Next.js
- Puerto fijo (3000)
- Logging detallado

### Modo Producción
- Bundle optimizado con `output: 'standalone'`
- Puerto dinámico (evita conflictos)
- Shutdown limpio del servidor Next.js
- Manejo robusto de errores con diálogos informativos

## Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar en modo desarrollo
npm run dev:inspect      # Con inspector de Node.js

# Build
npm run build            # Build completo
npm run build:client     # Solo build del cliente Next.js
npm run pack             # Empaquetar sin crear instalador
npm run dist             # Crear instalador para plataforma actual
npm run dist:mac:arm64   # Instalador macOS ARM64
npm run dist:mac:x64     # Instalador macOS x64
npm run dist:win:x64     # Instalador Windows x64
npm run dist:win:arm64   # Instalador Windows ARM64
npm run dist:linux:x64   # Instalador Linux x64 (.deb + .rpm)
npm run dist:linux:arm64 # Instalador Linux ARM64 (.deb + .rpm)
```

## Notas de Implementación

### Arquitectura de Servicios

Cada servicio (`PhoenixdService`, `BackendService`, `NextJsService`) implementa:
- `start(port, config)` - Inicia el servicio con configuración
- `stop()` - Detiene el servicio de forma limpia
- `getStatus()` - Retorna estado actual (`starting`, `running`, `stopped`, `error`)
- `getPort()` - Retorna puerto asignado

### Gestión del Ciclo de Vida

Cada servicio gestiona su proceso hijo:
1. **Startup**:
   - Spawn con `cross-spawn`
   - Redirección de stdout/stderr a logs
   - Health check con reintentos
2. **Runtime**:
   - Logging continuo a archivos diarios
   - Monitoreo de estado del proceso
3. **Shutdown**:
   - `tree-kill` con SIGTERM (graceful)
   - Timeout de 5-10s
   - Fallback a SIGKILL si es necesario

### ServiceManager - Orquestación

El `ServiceManager` coordina el inicio/parada de todos los servicios:
```javascript
async startAll() {
  // Modo desarrollo: solo Next.js
  // Modo producción: Phoenixd → Backend → Next.js (secuencial)

  // Emite eventos:
  // - 'service:started' → { service, port }
  // - 'service:error' → { service, error }
  // - 'all:started'
}
```

### IPC Handlers Disponibles

El renderer puede comunicarse con los servicios:
```javascript
// Obtener estado de todos los servicios
window.electron.invoke('services:get-statuses')
// → { statuses: {...}, ports: {...}, devMode: boolean }

// Reiniciar un servicio específico
window.electron.invoke('services:restart', 'backend')
// → { success: true } | { success: false, error: "..." }

// Obtener directorio de logs
window.electron.invoke('services:get-logs')
// → { logsDir: "/path/to/logs" }
```

### Detección de Entorno

La aplicación detecta automáticamente si está en desarrollo o producción:
```javascript
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
```

### Rutas de Recursos

Gestión inteligente de rutas según el modo:
- **Desarrollo**:
  - Client: `path.join(__dirname, '..', 'client')`
  - Backend JAR: Asume externo
  - Phoenixd: Asume externo
- **Producción**:
  - Client: `path.join(process.resourcesPath, 'client')`
  - Backend JAR: `path.join(process.resourcesPath, 'backend', 'ambrosia.jar')`
  - Phoenixd: `path.join(process.resourcesPath, 'phoenixd', 'bin', 'phoenixd')`
  - JRE: `path.join(process.resourcesPath, 'jre', platform-arch, 'bin', 'java')`

### Soporte Multi-Plataforma

Gestión específica por plataforma:
- **macOS**: Binarios nativos (ARM64 y x64)
- **Windows x64**: Binarios nativos
- **Windows ARM64**: Phoenixd JVM + JRE x64 (emulación), Backend con JRE ARM64
- **Linux x64**: Binarios nativos
- **Linux ARM64**: Phoenixd nativo ARM64, Backend con JRE ARM64

### Prevención de Instancias Múltiples

```javascript
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();
// Si segunda instancia se intenta abrir, enfoca la primera
```

## Recursos

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ambrosia POS Repository](https://github.com/olympus-btc/ambrosia)

## Licencia

MIT - Ver LICENSE en la raíz del proyecto
