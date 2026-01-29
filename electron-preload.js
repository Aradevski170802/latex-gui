const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
});
