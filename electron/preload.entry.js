import { contextBridge, ipcRenderer } from 'electron';

const SEND_CHANNELS = ['ping', 'restart-server', 'notifications:admin-activity'];

const INVOKE_CHANNELS = [
  'services:get-statuses',
  'services:restart',
  'services:get-logs',
  'logs:open-folder',
  'logs:set-level',
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

const MAX_SANITIZE_DEPTH = 10;

function sanitizeArgument(argument, depth = 0) {
  if (argument === null || argument === undefined) return argument;
  const argumentType = typeof argument;
  if (argumentType === 'string' || argumentType === 'number' || argumentType === 'boolean') return argument;
  if (depth >= MAX_SANITIZE_DEPTH) return null;
  if (Array.isArray(argument)) return argument.map((nestedArgument) => sanitizeArgument(nestedArgument, depth + 1));
  if (argumentType === 'object') {
    return Object.fromEntries(
      Object.entries(argument).map(([propertyName, propertyValue]) => [
        propertyName,
        sanitizeArgument(propertyValue, depth + 1),
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
    send: (ipcChannel, ...ipcArguments) => {
      if (SEND_CHANNELS.includes(ipcChannel)) {
        ipcRenderer.send(ipcChannel, ...ipcArguments);
      }
    },
    invoke: (ipcChannel, ...ipcArguments) => {
      if (INVOKE_CHANNELS.includes(ipcChannel)) {
        return ipcRenderer.invoke(ipcChannel, ...ipcArguments.map(sanitizeArgument));
      }
      return Promise.reject(new Error(`Invalid channel: ${ipcChannel}`));
    },
    on: (ipcChannel, ipcListener) => {
      if (RECEIVE_CHANNELS.includes(ipcChannel)) {
        ipcRenderer.on(ipcChannel, (_ipcEvent, ...ipcArguments) => ipcListener(...ipcArguments));
      }
    },
    once: (ipcChannel, ipcListener) => {
      if (RECEIVE_CHANNELS.includes(ipcChannel)) {
        ipcRenderer.once(ipcChannel, (_ipcEvent, ...ipcArguments) => ipcListener(...ipcArguments));
      }
    },
    removeListener: (ipcChannel, ipcListener) => {
      if (RECEIVE_CHANNELS.includes(ipcChannel)) {
        ipcRenderer.removeListener(ipcChannel, ipcListener);
      }
    },
  },
});
