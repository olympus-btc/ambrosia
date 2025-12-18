# Ambrosia POS - Electron Desktop Application

Aplicación de escritorio para Ambrosia POS construida con Electron y Next.js.

## Arquitectura

Ambrosia POS Electron utiliza un **servidor Next.js embebido** que se ejecuta como proceso hijo dentro de Electron:

```
Electron Main Process
├── Ejecuta generate-env.cjs (lee ~/.Ambrosia-POS/ambrosia.conf)
├── Spawns Next.js Server como child process
├── Espera a que Next.js esté listo (wait-on)
├── Crea BrowserWindow
└── Carga http://localhost:[PORT]

Renderer Process
├── Next.js App Router (React 19)
├── API Proxy → Backend Kotlin (127.0.0.1:9154)
└── Interfaz completa del POS
```

## Requisitos Previos

- **Node.js 18+** y npm
- **Backend de Ambrosia** instalado y configurado
- **Archivo de configuración**: `~/.Ambrosia-POS/ambrosia.conf` debe existir

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

1. Verifica que Node.js esté instalado
2. Verifica que el archivo `~/.Ambrosia-POS/ambrosia.conf` exista
3. Instala dependencias si es necesario
4. Ejecuta `generate-env.cjs` para crear el archivo `.env`
5. Inicia el servidor Next.js en puerto 3000
6. Abre la ventana de Electron
7. Habilita DevTools automáticamente

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
npm run dist:mac
make electron-build-mac

# Windows
npm run dist:win
make electron-build-win

# Linux
npm run dist:linux
make electron-build-linux
```

### Salida del Build

Los instaladores se generan en `electron/dist/`:
- **macOS**: `Ambrosia POS-1.0.0.dmg`, `Ambrosia POS-1.0.0-mac.zip`
- **Windows**: `Ambrosia POS Setup 1.0.0.exe`, portable `.exe`
- **Linux**: `ambrosia-pos-1.0.0.AppImage`, `ambrosia-pos_1.0.0_amd64.deb`

## Estructura del Proyecto

```
electron/
├── main.js              # Proceso principal de Electron
├── preload.js           # Script de preload (APIs seguras)
├── package.json         # Configuración y dependencias
├── build/               # Assets para electron-builder
│   ├── icon.icns        # Icono macOS
│   ├── icon.ico         # Icono Windows
│   ├── icon.png         # Icono Linux
│   ├── entitlements.mac.plist
│   └── ICONS_README.md  # Instrucciones para generar iconos
├── scripts/             # Scripts de desarrollo y build
│   ├── dev.sh           # Script de desarrollo (Unix)
│   ├── dev.bat          # Script de desarrollo (Windows)
│   └── build.sh         # Script de build
└── dist/                # Salida de electron-builder (generado)
```

## Configuración

### Variables de Entorno

La aplicación lee automáticamente de `~/.Ambrosia-POS/ambrosia.conf`:
- `http-bind-ip` → `HOST` en .env
- `http-bind-port` → `NEXT_PUBLIC_PORT_API` en .env

El archivo `.env` se genera automáticamente al iniciar la aplicación.

### Electron Builder

La configuración está en `package.json` bajo la clave `build`. Personalizar:
- `appId`: Identificador de la aplicación
- `productName`: Nombre visible
- `mac/win/linux`: Configuración por plataforma

## Troubleshooting

### Error: Backend no encontrado

**Causa**: El archivo `~/.Ambrosia-POS/ambrosia.conf` no existe.

**Solución**: Iniciar el backend de Ambrosia primero:
```bash
cd ../server
./gradlew run
```

### Error: Puerto 3000 en uso

**Causa**: Otro proceso usa el puerto 3000.

**Solución**:
- En desarrollo: Detener el proceso que usa el puerto 3000
- En producción: La aplicación usa un puerto dinámico automáticamente

### Error: Build falla

**Causa**: Dependencias faltantes o build de Next.js incompleto.

**Solución**:
```bash
# Limpiar y reinstalar
cd ../client
rm -rf .next node_modules
npm install
npm run build:electron
cd ../electron
npm install
npm run build
```

### Error: Next.js no inicia

**Causa**: Archivo de configuración corrupto o dependencias faltantes.

**Solución**:
1. Verificar que `~/.Ambrosia-POS/ambrosia.conf` existe y es válido
2. Reinstalar dependencias del cliente: `cd ../client && npm install`
3. Verificar logs en la consola de Electron

### Error: La ventana no se abre

**Causa**: Next.js no pudo iniciar correctamente.

**Solución**:
1. Revisar logs en la terminal
2. Verificar que el puerto no esté bloqueado por firewall
3. Asegurar que todas las dependencias estén instaladas

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
npm run dist:mac         # Instalador macOS
npm run dist:win         # Instalador Windows
npm run dist:linux       # Instalador Linux
```

## Notas de Implementación

### Gestión del Ciclo de Vida

El proceso Next.js se gestiona cuidadosamente:
1. **Startup**: Spawn con `cross-spawn`, espera con `wait-on`
2. **Runtime**: Logging de stdout/stderr
3. **Shutdown**: `tree-kill` con SIGTERM, fallback a SIGKILL

### Detección de Entorno

La aplicación detecta automáticamente si está en desarrollo o producción:
```javascript
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
```

### Rutas de Recursos

- **Desarrollo**: `path.join(__dirname, '..', 'client')`
- **Producción**: `path.join(process.resourcesPath, 'client')`

## Recursos

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ambrosia POS Repository](https://github.com/olympus-btc/ambrosia)

## Licencia

MIT - Ver LICENSE en la raíz del proyecto
