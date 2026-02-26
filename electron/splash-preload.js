const { contextBridge, ipcRenderer } = require('electron');

const SPLASH_CHANNELS = ['splash:update', 'splash:complete', 'splash:close'];

contextBridge.exposeInMainWorld('splashBridge', {
  on: (channel, callback) => {
    if (!SPLASH_CHANNELS.includes(channel)) return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
