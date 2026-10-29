const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, isolated desktop APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
});
