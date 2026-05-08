const { app, BrowserWindow, ipcMain, Menu, shell, dialog, nativeTheme } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');
const log = require('electron-log');

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow = null;
const terminals = new Map();
let terminalIdCounter = 0;

const SHELL = process.platform === 'win32' ? 
  (process.env.COMSPEC || 'cmd.exe') : 
  (process.env.SHELL || '/bin/zsh');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0D0D',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, '../build/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    terminals.forEach((term) => term.process.kill());
    terminals.clear();
  });

  createMenu();
  log.info('Main window created');
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('new-tab')
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow?.webContents.send('close-tab')
        },
        { type: 'separator' },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Clear Terminal',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.send('clear-terminal')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Split Horizontally',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow?.webContents.send('split-horizontal')
        },
        {
          label: 'Split Vertically',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.send('split-vertical')
        },
        { type: 'separator' },
        {
          label: 'Next Tab',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => mainWindow?.webContents.send('next-tab')
        },
        {
          label: 'Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => mainWindow?.webContents.send('prev-tab')
        },
        { type: 'separator' },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('show-search')
        },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('show-command-palette')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About VibeTerminal',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About VibeTerminal',
              message: 'VibeTerminal v1.0.0',
              detail: 'A beautiful, feature-rich terminal emulator.\n\nBuilt with Electron, xterm.js, and node-pty.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('create-terminal', async (event, options = {}) => {
  const id = ++terminalIdCounter;
  const shell = options.shell || SHELL;
  const cwd = options.cwd || os.homedir();
  
  const env = { ...process.env };
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  env.TERM_PROGRAM = 'VibeTerminal';
  
  try {
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: cwd,
      env: env
    });

    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', { id, data });
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-exit', { id, exitCode, signal });
      }
      terminals.delete(id);
      log.info(`Terminal ${id} exited with code ${exitCode}`);
    });

    terminals.set(id, { process: ptyProcess, shell });
    log.info(`Created terminal ${id} with shell ${shell}`);
    
    return { success: true, id };
  } catch (error) {
    log.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('terminal-input', (event, { id, data }) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.write(data);
  }
});

ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.resize(cols, rows);
  }
});

ipcMain.on('terminal-kill', (event, { id }) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.kill();
    terminals.delete(id);
  }
});

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

ipcMain.handle('get-shell-path', () => {
  return SHELL;
});

ipcMain.handle('get-cwd', () => {
  return os.homedir();
});

// App events
app.whenReady().then(() => {
  log.info('App ready, creating window');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  terminals.forEach((term) => term.process.kill());
  terminals.clear();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  terminals.forEach((term) => term.process.kill());
  terminals.clear();
  log.info('App quitting');
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});