import { contextBridge, ipcRenderer } from 'electron';

const SPLASH_CHANNELS = ['splash:update', 'splash:complete', 'splash:close', 'splash:error'];

contextBridge.exposeInMainWorld('splashBridge', {
  on: (channel, callback) => {
    if (!SPLASH_CHANNELS.includes(channel)) return () => {};
    const listener = (_event, channelPayload) => callback(channelPayload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
