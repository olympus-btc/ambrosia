const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const spawn = require('cross-spawn');
const waitOn = require('wait-on');
const findFreePort = require('find-free-port');
const treeKill = require('tree-kill');
const fs = require('fs');
const os = require('os');

// Estado global
let mainWindow = null;
let nextServerProcess = null;
let nextServerPort = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Rutas
const getClientPath = () => {
  if (isDev) {
    return path.join(__dirname, '..', 'client');
  }
  // En producción, el cliente está en resources/client
  return path.join(process.resourcesPath, 'client');
};

// Función para ejecutar generate-env.cjs
async function generateEnvFile() {
  return new Promise((resolve, reject) => {
    const clientPath = getClientPath();
    const generateEnvPath = path.join(clientPath, 'generate-env.cjs');

    console.log('[Electron] Ejecutando generate-env.cjs desde:', generateEnvPath);

    const proc = spawn('node', [generateEnvPath], {
      cwd: clientPath,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[Electron] generate-env.cjs completado exitosamente');
        resolve();
      } else {
        reject(new Error(`generate-env.cjs falló con código ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Error ejecutando generate-env.cjs: ${err.message}`));
    });
  });
}

// Función para iniciar el servidor Next.js
async function startNextServer() {
  return new Promise(async (resolve, reject) => {
    const clientPath = getClientPath();

    try {
      // 1. Ejecutar generate-env.cjs
      console.log('[Electron] Generando archivo .env...');
      await generateEnvFile();

      // 2. Determinar puerto
      if (isDev) {
        nextServerPort = 3000;
      } else {
        // En producción, buscar puerto libre
        const [freePort] = await findFreePort(3000, 3100);
        nextServerPort = freePort;
      }

      console.log(`[Electron] Iniciando servidor Next.js en puerto ${nextServerPort}...`);

      // 3. Preparar comando
      const command = isDev ? 'npm' : 'node';
      const args = isDev
        ? ['run', 'dev', '--', '-p', String(nextServerPort)]
        : [
            path.join(clientPath, 'node_modules', 'next', 'dist', 'bin', 'next'),
            'start',
            '-p',
            String(nextServerPort)
          ];

      // 4. Spawn proceso
      nextServerProcess = spawn(command, args, {
        cwd: clientPath,
        stdio: 'pipe',
        env: {
          ...process.env,
          PORT: String(nextServerPort),
          NODE_ENV: isDev ? 'development' : 'production'
        }
      });

      // 5. Logging
      nextServerProcess.stdout.on('data', (data) => {
        console.log(`[Next.js] ${data.toString()}`);
      });

      nextServerProcess.stderr.on('data', (data) => {
        console.error(`[Next.js Error] ${data.toString()}`);
      });

      nextServerProcess.on('error', (err) => {
        console.error('[Electron] Error spawning Next.js:', err);
        reject(err);
      });

      nextServerProcess.on('close', (code) => {
        console.log(`[Electron] Next.js process cerrado con código ${code}`);
        nextServerProcess = null;
      });

      // 6. Esperar a que esté listo
      const url = `http://localhost:${nextServerPort}`;
      console.log(`[Electron] Esperando a que Next.js esté listo en ${url}...`);

      waitOn({
        resources: [url],
        timeout: 60000, // 60 segundos
        interval: 1000,
        verbose: isDev
      })
        .then(() => {
          console.log(`[Electron] Servidor Next.js listo en ${url}`);
          resolve(url);
        })
        .catch((err) => {
          console.error('[Electron] Timeout esperando Next.js:', err);
          reject(new Error('Next.js no inició a tiempo'));
        });

    } catch (err) {
      console.error('[Electron] Error en startNextServer:', err);
      reject(err);
    }
  });
}

// Función para detener el servidor Next.js
function stopNextServer() {
  return new Promise((resolve) => {
    if (!nextServerProcess) {
      resolve();
      return;
    }

    console.log('[Electron] Deteniendo servidor Next.js...');

    treeKill(nextServerProcess.pid, 'SIGTERM', (err) => {
      if (err) {
        console.error('[Electron] Error matando proceso Next.js:', err);
        // Intentar SIGKILL como último recurso
        try {
          treeKill(nextServerProcess.pid, 'SIGKILL');
        } catch (killErr) {
          console.error('[Electron] Error con SIGKILL:', killErr);
        }
      }
      nextServerProcess = null;
      resolve();
    });

    // Timeout de seguridad
    setTimeout(() => {
      if (nextServerProcess) {
        nextServerProcess.kill('SIGKILL');
        nextServerProcess = null;
      }
      resolve();
    }, 5000);
  });
}

// Crear ventana principal
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    title: 'Ambrosia POS',
    show: false // No mostrar hasta que esté listo
  });

  mainWindow.loadURL(url);

  // Mostrar cuando esté listo para evitar flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // DevTools en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Manejo de errores de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Error cargando página:', errorCode, errorDescription);

    dialog.showErrorBox(
      'Error de Carga',
      `No se pudo cargar la aplicación:\n${errorDescription}\n\nCódigo: ${errorCode}`
    );
  });
}

// Manejo de errores global
async function handleStartupError(error) {
  console.error('[Electron] Error en startup:', error);

  const response = await dialog.showMessageBox({
    type: 'error',
    title: 'Error al Iniciar',
    message: 'No se pudo iniciar la aplicación Ambrosia POS',
    detail: error.message,
    buttons: ['Reintentar', 'Ver Logs', 'Salir'],
    defaultId: 0,
    cancelId: 2
  });

  if (response.response === 0) {
    // Reintentar
    app.relaunch();
    app.quit();
  } else if (response.response === 1) {
    // Ver logs (abrir carpeta de logs)
    const { shell } = require('electron');
    shell.openPath(app.getPath('logs'));
  } else {
    // Salir
    app.quit();
  }
}

// Verificar backend disponible
async function checkBackendAvailable() {
  const confPath = path.join(os.homedir(), '.Ambrosia-POS', 'ambrosia.conf');

  if (!fs.existsSync(confPath)) {
    throw new Error(
      'No se encontró el archivo de configuración de Ambrosia.\n' +
      `Esperado en: ${confPath}\n\n` +
      'Por favor, asegúrese de que el backend de Ambrosia esté instalado y configurado.'
    );
  }

  console.log('[Electron] Archivo de configuración encontrado:', confPath);
}

// Inicialización de la app
app.whenReady().then(async () => {
  try {
    // 1. Verificar backend
    await checkBackendAvailable();

    // 2. Iniciar Next.js
    const url = await startNextServer();

    // 3. Crear ventana
    createWindow(url);

  } catch (error) {
    await handleStartupError(error);
  }
});

// Manejo de activación (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && nextServerPort) {
    createWindow(`http://localhost:${nextServerPort}`);
  }
});

// Shutdown limpio
app.on('before-quit', async (event) => {
  if (nextServerProcess) {
    event.preventDefault();
    await stopNextServer();
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  await stopNextServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manejo de crashes
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught Exception:', error);
  dialog.showErrorBox('Error Inesperado', error.message);
});
