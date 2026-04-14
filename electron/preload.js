const { contextBridge, ipcRenderer } = require('electron');

const logger = require('./utils/logger');

const SEND_CHANNELS = ['ping', 'restart-server'];

const INVOKE_CHANNELS = [
  'services:get-statuses',
  'services:restart',
  'services:get-logs',
  'update:install',
  'update:open-release',
  'phoenixd:get-auto-liquidity',
  'phoenixd:set-auto-liquidity',
];

const RECEIVE_CHANNELS = [
  'pong',
  'server-status',
  'update:available',
  'update:downloaded',
];

function sanitizeArg(arg) {
  if (arg === null || arg === undefined) return arg;
  const type = typeof arg;
  if (type === 'string' || type === 'number' || type === 'boolean') return arg;
  if (Array.isArray(arg)) return arg.map(sanitizeArg);
  if (type === 'object') {
    return Object.fromEntries(
      Object.entries(arg).map(([k, v]) => [k, sanitizeArg(v)]),
    );
  }
  return null; // drop functions, symbols, circular refs
}

// Expose APIs securely to the renderer
contextBridge.exposeInMainWorld('electron', {
  // System information API
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // API for communication with main process
  ipc: {
    send: (channel, ...args) => {
      if (SEND_CHANNELS.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    invoke: (channel, ...args) => {
      if (INVOKE_CHANNELS.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args.map(sanitizeArg));
      }
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    },
    on: (channel, callback) => {
      if (RECEIVE_CHANNELS.includes(channel)) {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args));
      }
    },
    once: (channel, callback) => {
      if (RECEIVE_CHANNELS.includes(channel)) {
        ipcRenderer.once(channel, (_event, ...args) => callback(...args));
      }
    },
    removeListener: (channel, callback) => {
      if (RECEIVE_CHANNELS.includes(channel)) {
        ipcRenderer.removeListener(channel, callback);
      }
    },
  },
});

logger.log('[Preload] Electron APIs exposed successfully');
