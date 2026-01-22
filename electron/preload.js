const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs securely to the renderer
contextBridge.exposeInMainWorld('electron', {
  // System information API
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // API for communication with main process (future)
  ipc: {
    send: (channel, ...args) => {
      // Whitelist of allowed channels
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

console.log('[Preload] Electron APIs exposed successfully');
