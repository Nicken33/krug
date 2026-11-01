const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  onMaximizedState: (callback) => {
    ipcRenderer.on('window-maximized-state', (event, isMaximized) => callback(isMaximized));
  },

  // Desktop screen & window capture sources
  getDesktopSources: async () => {
    return await ipcRenderer.invoke('get-desktop-sources');
  },

  // Push-to-talk global event
  onGlobalPttChange: (callback) => {
    ipcRenderer.on('global-ptt-change', (event, data) => callback(data));
  }
});
