# Ambrosia POS - Electron Desktop Application

Complete and standalone desktop application for Ambrosia POS built with Electron.

## Architecture

Ambrosia POS Electron is a **complete standalone application** that integrates the entire stack:

```
Electron Main Process
├── ServiceManager (orchestrator)
│   ├── PhoenixdService → phoenixd daemon (Bitcoin/Lightning)
│   ├── BackendService  → Kotlin/Ktor API server
│   └── NextJsService   → Next.js web server
├── ConfigurationBootstrap (auto-config with BIP39)
├── Port Allocator (dynamic port assignment)
├── Health Checks (wait-on with retries)
└── BrowserWindow → http://localhost:[DYNAMIC_PORT]

Renderer Process
├── Next.js App Router (React 19)
├── API calls → Internal Backend (127.0.0.1:[BACKEND_PORT])
└── Complete POS interface
```

### Two Operation Modes

**Development** (`NODE_ENV=development` or `!app.isPackaged`):
- Only starts **Next.js** on port 3000
- Assumes external phoenixd (9740) and backend (9154)
- DevTools automatically enabled
- Ideal for frontend development

**Production** (packaged app):
- Starts sequentially: **Phoenixd → Backend → Next.js**
- Dynamic ports (avoids conflicts)
- Completely standalone application
- No external services required

## Prerequisites

- **Node.js 18+** and npm
- **Java Runtime** (included in production bundle)
- For development only: Backend running externally on 9154

## Installing Dependencies

```bash
# From the electron/ folder
npm install

# Install client dependencies
cd ../client
npm install
cd ../electron
```

## Development

### Development Prerequisites

Before running Electron in development mode, make sure you have:

1. **Backend running**:
   ```bash
   cd server && ./gradlew run
   ```

2. **Phoenixd running** (optional, only if you need payments):
   ```bash
   # See phoenixd documentation
   ```

### Using the Development Script

**macOS/Linux:**
```bash
./scripts/dev.sh
```

**Windows:**
```bash
scripts\dev.bat
```

### Using npm directly

```bash
npm run dev
```

### Using Make (from project root)

```bash
make electron-dev
```

### What happens when running in development mode?

1. **ServiceManager detects development mode**
2. **Only starts Next.js** on port 3000
3. Assumes external backend at `http://localhost:9154`
4. Assumes external phoenixd at `http://localhost:9740`
5. Creates BrowserWindow and loads `http://localhost:3000`
6. Automatically enables DevTools
7. Next.js hot reload working

## Production Build

### Complete Build

```bash
# Using the script
./scripts/build.sh

# Or using npm
npm run build

# Or using Make
make electron-build
```

### Build by Platform

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

### Build Output

Installers are generated in `electron/dist/`:
- **macOS**: `Ambrosia POS-1.0.0.dmg`, `Ambrosia POS-1.0.0-mac.zip`
- **Windows**: `Ambrosia POS Setup 1.0.0.exe`, portable `.exe`
- **Linux**:
  - `.deb` (Debian/Ubuntu/Mint/Pop!_OS): `ambrosia-pos-electron_1.0.0_amd64.deb`, `ambrosia-pos-electron_1.0.0_arm64.deb`
  - `.rpm` (Fedora/RHEL/CentOS/openSUSE): `ambrosia-pos-electron-1.0.0.x86_64.rpm`, `ambrosia-pos-electron-1.0.0.aarch64.rpm`

### Linux Installation

#### Debian/Ubuntu and derivatives

```bash
# x64
sudo apt install ./ambrosia-pos-electron_1.0.0_amd64.deb

# ARM64
sudo apt install ./ambrosia-pos-electron_1.0.0_arm64.deb
```

#### Fedora/RHEL/CentOS and derivatives

```bash
# x64
sudo dnf install ambrosia-pos-electron-1.0.0.x86_64.rpm

# ARM64
sudo dnf install ambrosia-pos-electron-1.0.0.aarch64.rpm
```

**Features:**
- Includes all dependencies automatically
- GTK 3 forced (compatible with GTK 4 systems)
- RPM includes `libxcrypt-compat` for Fedora compatibility
- Installs to `/opt/AmbrosiaPos/`

## Project Structure

```
electron/
├── main.js                          # Electron main process
├── preload.js                       # Preload script (secure APIs)
├── package.json                     # Configuration and dependencies
├── services/                        # Embedded services management
│   ├── ServiceManager.js            # Main orchestrator
│   ├── PhoenixdService.js           # Phoenixd management
│   ├── BackendService.js            # Kotlin backend management
│   ├── NextJsService.js             # Next.js management
│   └── ConfigurationBootstrap.js    # Automatic config generation
├── utils/                           # Utilities
│   ├── portAllocator.js             # Dynamic port assignment
│   ├── healthCheck.js               # Health checks with retries
│   └── resourcePaths.js             # Resource paths and mode detection
├── build/                           # Assets for electron-builder
│   ├── icon.icns                    # macOS icon
│   ├── icon.ico                     # Windows icon
│   ├── icon.png                     # Linux icon
│   ├── entitlements.mac.plist
│   └── ICONS_README.md              # Instructions for generating icons
├── scripts/                         # Development and build scripts
│   ├── dev.sh                       # Development script (Unix)
│   ├── dev.bat                      # Development script (Windows)
│   ├── build.sh                     # Build script
│   ├── prepare-resources-wrapper.js # Resource preparation for build
│   └── clean-build.js               # Build cleanup
├── resources/                       # Embedded resources (generated during build)
│   ├── phoenixd/                    # Phoenixd binaries per platform
│   ├── backend/                     # Backend JAR + JRE
│   └── client/                      # Next.js standalone build
└── dist/                            # electron-builder output (generated)
```

## Configuration

### Automatic Configuration Generation

The application automatically generates all necessary configuration on first startup:

**Generated files**:
```
~/.Ambrosia-POS/
├── ambrosia.conf              # Backend configuration
├── ambrosia.db                # SQLite database
├── phoenix/
│   └── phoenix.conf           # Phoenixd configuration
└── logs/
    ├── phoenixd-YYYY-MM-DD.log
    ├── backend-YYYY-MM-DD.log
    └── nextjs-YYYY-MM-DD.log
```

**ambrosia.conf** (automatically generated):
```properties
http-bind-ip=127.0.0.1
http-bind-port=9154  # Dynamic in production
secret=<BIP39 12-word mnemonic>  # 132 bits entropy
secret-hash=<SHA256 hash>
phoenixd-url=http://localhost:9740
```

**phoenix.conf** (automatically generated):
```properties
http-password=<random 64 hex chars>
http-password-limited-access=<random 64 hex chars>
webhook-secret=<random 64 hex chars>
webhook=http://127.0.0.1:9154/webhook/phoenixd
auto-liquidity=off
max-mining-fee=5000
```

### Secret Security

- **BIP39 Mnemonic**: Uses BIP39 standard for secrets (128 bits of entropy + 4 bits checksum)
- **Validation**: Checksums included for error detection
- **Compatibility**: Compatible with standard Bitcoin wallets

### Electron Builder

Configuration is in `package.json` under the `build` key. Customize:
- `appId`: Application identifier
- `productName`: Visible name
- `mac/win/linux`: Per-platform configuration

## Troubleshooting

### Error: Application doesn't start (Production Mode)

**Cause**: Phoenixd or Backend fail to start.

**Solution**:
1. Check logs in `~/.Ambrosia-POS/logs/`
2. Verify dynamic ports are available
3. Verify execution permissions on binaries
4. In the error dialog, select "Logs" to see details

### Error: Backend not found (Development Mode)

**Cause**: External backend is not running.

**Solution**:
```bash
cd ../server
./gradlew run
```

### Error: Port 3000 in use (Development Mode)

**Cause**: Another process is using port 3000.

**Solution**:
```bash
# Find and stop the process
lsof -i :3000
kill <PID>
```

### Error: Services don't stop correctly

**Cause**: Zombie processes from phoenixd/backend/nextjs.

**Solution**:
```bash
# Kill all related processes
pkill -f phoenixd
pkill -f "java.*ambrosia"
pkill -f "node.*next"
```

### Error: Build fails

**Cause**: Missing dependencies or incomplete Next.js build.

**Solution**:
```bash
# Clean and rebuild everything
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

**Cause**: Service takes too long to start or fails silently.

**Solution**:
1. Check logs for the specific service in `~/.Ambrosia-POS/logs/`
2. Verify that the previous service in the chain started correctly
3. Increase timeout in `utils/healthCheck.js` if necessary

### Linux-Specific Issues

#### Error: GTK 2/3 symbols detected

**Symptoms**:
```
Gtk-ERROR **: GTK 2/3 symbols detected. Using GTK 2/3 and GTK 4 in the same process is not supported
Trace/breakpoint trap
```

**Cause**: System has GTK 4 but Electron tries to load multiple GTK versions.

**Solution**: The `.deb` and `.rpm` packages automatically include a wrapper that forces GTK 3. If you installed manually, run:
```bash
/opt/AmbrosiaPos/ambrosia-pos-electron --gtk-version=3
```

#### Error: libcrypt.so.1 not found (Fedora/RHEL)

**Symptoms**:
```
error while loading shared libraries: libcrypt.so.1: cannot open shared object file
```

**Cause**: Fedora/RHEL migrated to libcrypt.so.2 but phoenixd requires libcrypt.so.1.

**Solution**: The `.rpm` packages automatically include the `libxcrypt-compat` dependency. If you installed manually:
```bash
sudo dnf install libxcrypt-compat
```

#### Build Dependencies for Ubuntu/Debian

To build `.rpm` packages from Ubuntu/Debian:
```bash
sudo apt install rpm
```

### Viewing Service Logs

Logs are saved by date in `~/.Ambrosia-POS/logs/`:
```bash
# View logs in real-time
tail -f ~/.Ambrosia-POS/logs/phoenixd-$(date +%Y-%m-%d).log
tail -f ~/.Ambrosia-POS/logs/backend-$(date +%Y-%m-%d).log
tail -f ~/.Ambrosia-POS/logs/nextjs-$(date +%Y-%m-%d).log
```

### Complete Reinstallation

If all else fails:
```bash
# 1. Clean existing configuration (WARNING: deletes the database)
rm -rf ~/.Ambrosia-POS

# 2. Clean builds
cd electron
npm run clean

# 3. Rebuild everything
cd ../client
npm install
npm run build:electron
cd ../electron
npm install
npm run build
```

## Application Icons

Icons should be in `build/`:
- `icon.icns` - macOS (512x512+)
- `icon.ico` - Windows (multiple sizes)
- `icon.png` - Linux (512x512)

See `build/ICONS_README.md` for instructions on how to generate icons.

## Security

The application implements the following security measures:

- ✅ `contextIsolation: true` - Context isolation
- ✅ `nodeIntegration: false` - Node.js disabled in renderer
- ✅ `sandbox: true` - Sandbox enabled
- ✅ Preload script with IPC channel whitelist
- ✅ Backend configuration validation

## Features

### Development Mode
- DevTools automatically enabled
- Next.js hot reload
- Fixed port (3000)
- Detailed logging

### Production Mode
- Optimized bundle with `output: 'standalone'`
- Dynamic port (avoids conflicts)
- Clean Next.js server shutdown
- Robust error handling with informative dialogs

### Linux Multi-Platform Support
- **Distribution formats**: `.deb` and `.rpm` for maximum compatibility
- **Supported distributions**:
  - Debian, Ubuntu, Linux Mint, Pop!_OS (`.deb`)
  - Fedora, RHEL, CentOS, openSUSE (`.rpm`)
- **Architectures**: x64 (amd64/x86_64) and ARM64 (arm64/aarch64)
- **GTK Compatibility**: Automatic wrapper forces GTK 3 (compatible with GTK 4)
- **Dependencies included**: RPM includes `libxcrypt-compat` for Fedora/RHEL
- **Complete installation**: phoenixd, Kotlin backend and Next.js frontend bundled

## Available Commands

```bash
# Development
npm run dev              # Start in development mode
npm run dev:inspect      # With Node.js inspector

# Build
npm run build            # Complete build
npm run build:client     # Only Next.js client build
npm run pack             # Package without creating installer
npm run dist             # Create installer for current platform
npm run dist:mac:arm64   # macOS ARM64 installer
npm run dist:mac:x64     # macOS x64 installer
npm run dist:win:x64     # Windows x64 installer
npm run dist:win:arm64   # Windows ARM64 installer
npm run dist:linux:x64   # Linux x64 installer (.deb + .rpm)
npm run dist:linux:arm64 # Linux ARM64 installer (.deb + .rpm)
```

## Implementation Notes

### Services Architecture

Each service (`PhoenixdService`, `BackendService`, `NextJsService`) implements:
- `start(port, config)` - Starts the service with configuration
- `stop()` - Stops the service cleanly
- `getStatus()` - Returns current state (`starting`, `running`, `stopped`, `error`)
- `getPort()` - Returns assigned port

### Lifecycle Management

Each service manages its child process:
1. **Startup**:
   - Spawn with `cross-spawn`
   - Redirect stdout/stderr to logs
   - Health check with retries
2. **Runtime**:
   - Continuous logging to daily files
   - Process state monitoring
3. **Shutdown**:
   - `tree-kill` with SIGTERM (graceful)
   - 5-10s timeout
   - Fallback to SIGKILL if necessary

### ServiceManager - Orchestration

The `ServiceManager` coordinates the start/stop of all services:
```javascript
async startAll() {
  // Development mode: only Next.js
  // Production mode: Phoenixd → Backend → Next.js (sequential)

  // Emits events:
  // - 'service:started' → { service, port }
  // - 'service:error' → { service, error }
  // - 'all:started'
}
```

### Available IPC Handlers

The renderer can communicate with services:
```javascript
// Get status of all services
window.electron.invoke('services:get-statuses')
// → { statuses: {...}, ports: {...}, devMode: boolean }

// Restart a specific service
window.electron.invoke('services:restart', 'backend')
// → { success: true } | { success: false, error: "..." }

// Get logs directory
window.electron.invoke('services:get-logs')
// → { logsDir: "/path/to/logs" }
```

### Environment Detection

The application automatically detects if it's in development or production:
```javascript
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
```

### Resource Paths

Smart path management based on mode:
- **Development**:
  - Client: `path.join(__dirname, '..', 'client')`
  - Backend JAR: Assumes external
  - Phoenixd: Assumes external
- **Production**:
  - Client: `path.join(process.resourcesPath, 'client')`
  - Backend JAR: `path.join(process.resourcesPath, 'backend', 'ambrosia.jar')`
  - Phoenixd: `path.join(process.resourcesPath, 'phoenixd', 'bin', 'phoenixd')`
  - JRE: `path.join(process.resourcesPath, 'jre', platform-arch, 'bin', 'java')`

### Multi-Platform Support

Platform-specific management:
- **macOS**: Native binaries (ARM64 and x64)
- **Windows x64**: Native binaries
- **Windows ARM64**: Phoenixd JVM + x64 JRE (emulation), Backend with ARM64 JRE
- **Linux x64**: Native binaries
- **Linux ARM64**: Native ARM64 Phoenixd, Backend with ARM64 JRE

### Multiple Instance Prevention

```javascript
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();
// If second instance tries to open, focus the first one
```

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ambrosia POS Repository](https://github.com/olympus-btc/ambrosia)

## License

MIT - See LICENSE in the project root
