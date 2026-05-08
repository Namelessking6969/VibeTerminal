const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terminalAPI', {
  createTerminal: (options) => ipcRenderer.invoke('create-terminal', options),
  write: (id, data) => ipcRenderer.send('terminal-input', { id, data }),
  resize: (id, cols, rows) => ipcRenderer.send('terminal-resize', { id, cols, rows }),
  kill: (id) => ipcRenderer.send('terminal-kill', { id }),
  
  onData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  },
  
  onExit: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal-exit', handler);
    return () => ipcRenderer.removeListener('terminal-exit', handler);
  },
  
  // Menu events
  onNewTab: (callback) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback) => ipcRenderer.on('close-tab', callback),
  onClearTerminal: (callback) => ipcRenderer.on('clear-terminal', callback),
  onNextTab: (callback) => ipcRenderer.on('next-tab', callback),
  onPrevTab: (callback) => ipcRenderer.on('prev-tab', callback),
  onSplitHorizontal: (callback) => ipcRenderer.on('split-horizontal', callback),
  onSplitVertical: (callback) => ipcRenderer.on('split-vertical', callback),
  onShowSearch: (callback) => ipcRenderer.on('show-search', callback),
  onShowCommandPalette: (callback) => ipcRenderer.on('show-command-palette', callback),
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  getShellPath: () => ipcRenderer.invoke('get-shell-path'),
  getCwd: () => ipcRenderer.invoke('get-cwd')
});