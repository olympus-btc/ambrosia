import { contextBridge, ipcRenderer } from 'electron';

const SEND_CHANNELS = ['ping', 'restart-server', 'notifications:admin-activity'];

const INVOKE_CHANNELS = [
  'services:get-statuses',
  'services:restart',
  'services:get-logs',
  'update:install',
  'update:open-release',
  'phoenixd:get-auto-liquidity',
  'phoenixd:set-auto-liquidity',
  'app:relaunch',
  'secrets:get-storage-backend',
  'secrets:save-unlock-password',
  'secrets:clear-unlock-password',
];

const RECEIVE_CHANNELS = [
  'pong',
  'server-status',
  'update:available',
  'update:downloaded',
];

function sanitizeArgument(argument) {
  if (argument === null || argument === undefined) return argument;
  const type = typeof argument;
  if (type === 'string' || type === 'number' || type === 'boolean') return argument;
  if (Array.isArray(argument)) return argument.map(sanitizeArgument);
  if (type === 'object') {
    return Object.fromEntries(
      Object.entries(argument).map(([propertyName, propertyValue]) => [
        propertyName,
        sanitizeArgument(propertyValue),
      ]),
    );
  }
  return null;
}

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  ipc: {
    send: (channel, ...args) => {
      if (SEND_CHANNELS.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    invoke: (channel, ...args) => {
      if (INVOKE_CHANNELS.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args.map(sanitizeArgument));
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
