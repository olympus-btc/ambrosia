# Ambrosia Electron

Electron desktop app for Ambrosia — a self-sovereign, local-first Bitcoin Point-of-Sale system. It bundles the entire stack (phoenixd daemon, Kotlin/Ktor backend, Next.js frontend) into a single installable application and manages the lifecycle of all three services.

This document is a map for contributors: how the app boots, how services are orchestrated, and where each concern lives.

## Commands

```bash
npm run dev              # start in development mode (only Next.js on :3000)
npm run dev:inspect      # development mode with Node.js inspector on port 5858
npm run lint             # ESLint check
npm run lint:fix         # auto-fix lint issues
npm run build            # full production build (prepare resources + electron-builder)
npm run clean            # clean dist/ and resources/

npm run dist:mac:arm64   # macOS Apple Silicon (.dmg, .zip)
npm run dist:mac:x64     # macOS Intel
npm run dist:win:x64     # Windows x64 (.exe NSIS)
npm run dist:win:arm64   # Windows ARM64
npm run dist:linux:x64   # Linux x64 (.deb, .rpm, .tar.gz)
npm run dist:linux:arm64 # Linux ARM64
```

**Pre-build requirement**: the client must be built before any `dist:*` command — `cd ../client && npm run build:electron`.

## Tech stack

- **Electron** (main process: CommonJS/Node.js, renderer: Chromium)
- **electron-builder** for cross-platform packaging and installers
- **electron-updater** for auto-updates
- **cross-spawn** + **tree-kill** for child process management
- **wait-on** for service health checks

## Two operation modes

**Development** (`!app.isPackaged`):

- Starts only Next.js on port 3000.
- Assumes an external backend on `:9154` and external phoenixd on `:9740`.
- DevTools open automatically.
- Uses the system `java` command — if the installed JDK is not Temurin 21, the backend will crash silently. Production builds are unaffected because they use the bundled JRE.

**Production** (packaged app):

- Starts services sequentially: **phoenixd → backend → Next.js**.
- Ports are allocated dynamically to avoid conflicts.
- Fully self-contained — no external services required.

## Startup flow

1. **`main.js`** — the Electron entry point. It:
   - acquires a single-instance lock; if the lock fails it quits and focuses the existing window
   - shows a splash screen that tracks startup progress
   - calls `ServiceManager.startAll()`, which emits `service:started` events at 33 % → 66 % → 100 % progress
   - creates a `BrowserWindow` pointing to the Next.js URL once `all:started` fires
   - on quit, calls `ServiceManager.stopAll()` (SIGTERM with a SIGKILL fallback via `tree-kill`)

2. **`services/ConfigurationBootstrap.js`** — on first run, generates `~/.Ambrosia-POS/ambrosia.conf` and `~/.phoenix/phoenix.conf` with `crypto.randomBytes(32)` secrets, a BIP39 12-word mnemonic as the backend secret, and phoenixd credentials.

3. **`services/ServiceManager.js`** — resolves dynamic ports via `portAllocator`, starts each service in order, and emits lifecycle events consumed by the splash screen and the main window.

Everything the app can do is reachable from the `ServiceManager` startup sequence and the IPC handlers registered in `main.js`.

## Service layer

Each service in `services/` implements a common interface:

| Method | Description |
| --- | --- |
| `start(port, config)` | Spawns the child process and begins health checks |
| `stop()` | Sends SIGTERM; falls back to SIGKILL after timeout |
| `getStatus()` | Returns `starting` \| `running` \| `stopped` \| `error` |
| `getPort()` | Returns the assigned port |

| File | Role |
| --- | --- |
| `ServiceManager.js` | Orchestrates startup/shutdown order and emits lifecycle events |
| `PhoenixdService.js` | Spawns the platform-specific phoenixd binary |
| `BackendService.js` | Spawns `java -jar ambrosia.jar` using the bundled JRE |
| `NextJsService.js` | Spawns the Next.js standalone server |
| `ConfigurationBootstrap.js` | First-run config generation |
| `AutoUpdater.js` | Auto-update checks and installation via electron-updater |

stdout/stderr from each service is routed to daily log files under `~/.Ambrosia-POS/logs/`.

## IPC bridge

`preload.js` exposes a whitelist of IPC channels to the renderer. Components call `window.electron.invoke()`:

```js
window.electron.invoke('services:get-statuses')
window.electron.invoke('services:restart', 'backend')
window.electron.invoke('services:get-logs')
```

Any channel not on the whitelist is silently dropped. Arguments are sanitized by `sanitizeArg()` in `preload.js` before reaching the main process.

## Build pipeline

`npm run build` runs `scripts/prepare-resources-wrapper.js` before electron-builder. The wrapper calls:

| Script | What it does |
| --- | --- |
| `download-phoenixd.js` | Downloads the platform-specific phoenixd binary |
| `download-jre.js` | Downloads a JRE for the target platform |
| `download-node.js` | Downloads Node.js for the Next.js standalone server |
| `build-backend.js` | Builds the Kotlin JAR (detects the version dynamically) |
| `build-client.js` | Copies the Next.js standalone build from `client/.next/standalone` |

All resources land in `electron/resources/` and are bundled via electron-builder's `extraResources` key in `package.json`.

## Directory layout

```text
electron/
├── main.js                          # Electron main process: window, IPC handlers, app lifecycle
├── preload.js                       # IPC bridge: exposes whitelisted channels to renderer
├── services/
│   ├── ServiceManager.js            # Orchestrates service startup/shutdown and port allocation
│   ├── PhoenixdService.js           # phoenixd daemon lifecycle
│   ├── BackendService.js            # Kotlin backend (JRE + JAR) lifecycle
│   ├── NextJsService.js             # Next.js standalone server lifecycle
│   ├── ConfigurationBootstrap.js    # First-run config file generation
│   └── AutoUpdater.js               # Auto-update via electron-updater
├── utils/
│   ├── portAllocator.js             # Finds free ports dynamically
│   ├── healthCheck.js               # wait-on health checks with retries
│   ├── resourcePaths.js             # Resolves paths for dev vs production
│   ├── logger.js                    # Silent in production unless DEBUG=true; warn/error always print
│   └── constants.js                 # Timeouts, port ranges, version constants
├── scripts/
│   ├── prepare-resources-wrapper.js # Orchestrates the full pre-build pipeline
│   ├── download-phoenixd.js
│   ├── download-jre.js
│   ├── download-node.js
│   ├── build-backend.js
│   ├── build-client.js
│   ├── platform-utils.js            # Shared platform/arch detection helpers
│   ├── dev.sh / dev.bat             # Dev launcher scripts
│   └── clean-build.js
├── build/                           # electron-builder assets
│   ├── icon.icns / icon.ico / icon.png
│   ├── entitlements.mac.plist
│   └── postinst                     # Linux post-install: creates GTK 3 wrapper
├── resources/                       # Generated during build — bundled into the app
│   ├── phoenixd/
│   ├── backend/
│   └── client/
└── dist/                            # electron-builder output (generated)
```

## Platform notes

| Platform | Notes |
| --- | --- |
| macOS | Hardened runtime with `build/entitlements.mac.plist`; ARM64 and x64 native binaries |
| Windows x64 | Native phoenixd binary + Temurin 21 JRE |
| Windows ARM64 | No native phoenixd binary — uses phoenixd JVM + x64 JRE (emulation) |
| Linux x64/ARM64 | Post-install script (`build/postinst`) wraps the binary to force GTK 3 |
| Linux RPM | Declares `libxcrypt-compat` dependency for Fedora/RHEL compatibility |

## Where to go next

- [`../server/README.md`](../server/README.md) — Kotlin/Ktor backend architecture
- [`../client/README.md`](../client/README.md) — Next.js frontend architecture
- [Project root README](../README.md) — installation guide and contribution guidelines
