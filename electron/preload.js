const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs de forma segura al renderer
contextBridge.exposeInMainWorld('electron', {
  // API de información del sistema
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // API para comunicación con main process (futuro)
  ipc: {
    send: (channel, ...args) => {
      // Whitelist de canales permitidos
      const validChannels = ['ping', 'restart-server'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    on: (channel, callback) => {
      const validChannels = ['pong', 'server-status'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
      }
    },
    once: (channel, callback) => {
      const validChannels = ['pong', 'server-status'];
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (event, ...args) => callback(...args));
      }
    },
    removeListener: (channel, callback) => {
      const validChannels = ['pong', 'server-status'];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, callback);
      }
    },
  },
});

console.log('[Preload] Electron APIs expuestas correctamente');
