// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('theme', {
    get: () => ipcRenderer.invoke('theme:get'),
    setPreference: (preference) => ipcRenderer.invoke('theme:set', preference),
    onChange: (callback) => {
        const listener = (_event, themeState) => callback(themeState);
        ipcRenderer.on('theme:changed', listener);
        return () => {
            ipcRenderer.removeListener('theme:changed', listener);
        };
    },
});
