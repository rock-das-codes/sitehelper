const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  exportPDF: (filename) => ipcRenderer.invoke('export-pdf', filename)
});
