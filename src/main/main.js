"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const pty = __importStar(require("node-pty"));
const electron_log_1 = __importDefault(require("electron-log"));
if (process.platform === 'linux') {
    electron_1.app.commandLine.appendSwitch('no-sandbox');
}
electron_log_1.default.transports.file.level = 'info';
electron_log_1.default.transports.console.level = 'debug';
function getIconPath() {
    return electron_1.app.isPackaged
        ? path_1.default.join(process.resourcesPath, 'icon.png')
        : path_1.default.join(__dirname, '../../build/icon.png');
}
let mainWindow = null;
const terminals = new Map();
let terminalIdCounter = 0;
const pendingTransfers = new Map();
const DEFAULT_SETTINGS = {
    fontFamily: '"MesloLGS NF", monospace',
    fontSize: 13,
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 10000,
    shell: '',
    theme: 'vibe',
    titlebarStyle: 'auto',
    opacity: 1.0,
    hotkeyEnabled: false,
    hotkey: 'CommandOrControl+`',
    userName: '',
    keybindings: {},
};
function getSettingsPath() {
    return path_1.default.join(electron_1.app.getPath('userData'), 'settings.json');
}
function loadSettings() {
    try {
        const data = fs_1.default.readFileSync(getSettingsPath(), 'utf8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
    catch {
        return { ...DEFAULT_SETTINGS };
    }
}
function saveSettingsToDisk(settings) {
    try {
        fs_1.default.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
        return true;
    }
    catch (e) {
        electron_log_1.default.error('Failed to save settings:', e);
        return false;
    }
}
let registeredHotkey = null;
function registerHotkey(accelerator) {
    if (registeredHotkey) {
        try {
            electron_1.globalShortcut.unregister(registeredHotkey);
        }
        catch { }
        registeredHotkey = null;
    }
    if (!accelerator)
        return;
    try {
        const ok = electron_1.globalShortcut.register(accelerator, () => {
            const win = mainWindow;
            if (!win)
                return;
            if (win.isVisible() && win.isFocused()) {
                win.hide();
            }
            else {
                win.show();
                win.focus();
            }
        });
        if (ok)
            registeredHotkey = accelerator;
        else
            electron_log_1.default.warn('Hotkey registration failed (already in use?):', accelerator);
    }
    catch (e) {
        electron_log_1.default.error('Failed to register hotkey:', e);
    }
}
let autoUpdaterInstance = null;
function initUpdater() {
    if (autoUpdaterInstance)
        return autoUpdaterInstance;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { autoUpdater } = require('electron-updater');
        autoUpdater.logger = electron_log_1.default;
        autoUpdater.autoDownload = true;
        autoUpdater.on('update-available', (info) => {
            electron_log_1.default.info('Update available:', info.version);
            mainWindow?.webContents.send('update-available', { version: info.version });
        });
        autoUpdater.on('update-downloaded', (info) => {
            electron_log_1.default.info('Update downloaded:', info.version);
            mainWindow?.webContents.send('update-downloaded', { version: info.version });
        });
        autoUpdater.on('update-not-available', () => {
            mainWindow?.webContents.send('update-status', { message: 'You are on the latest version.' });
        });
        autoUpdater.on('error', (err) => {
            electron_log_1.default.error('Updater error:', err.message);
            mainWindow?.webContents.send('update-status', { message: 'Update error: ' + err.message });
        });
        autoUpdaterInstance = autoUpdater;
        return autoUpdater;
    }
    catch (e) {
        electron_log_1.default.error('Failed to init updater:', e);
        return null;
    }
}
function checkForUpdates() {
    if (!electron_1.app.isPackaged) {
        mainWindow?.webContents.send('update-status', { message: 'Auto-updates only available in packaged app.' });
        return;
    }
    const updater = initUpdater();
    if (!updater) {
        mainWindow?.webContents.send('update-status', { message: 'Update check failed: updater could not be initialized.' });
        return;
    }
    const timeout = setTimeout(() => {
        mainWindow?.webContents.send('update-status', { message: 'Update check timed out. Check your connection.' });
    }, 15000);
    updater.once('update-available', () => clearTimeout(timeout));
    updater.once('update-not-available', () => clearTimeout(timeout));
    updater.once('error', () => clearTimeout(timeout));
    updater.checkForUpdates();
}
const SHELL = process.platform === 'win32'
    ? 'powershell.exe'
    : (process.env.SHELL ?? '/bin/zsh');
function resolveShell(preferred) {
    const candidates = process.platform === 'win32'
        ? [preferred]
        : [preferred, '/bin/zsh', '/bin/bash', '/bin/sh'];
    for (const sh of candidates) {
        if (!sh)
            continue;
        try {
            fs_1.default.accessSync(sh, fs_1.default.constants.X_OK);
            return sh;
        }
        catch {
            electron_log_1.default.warn(`Shell not executable, skipping: ${sh}`);
        }
    }
    return preferred; // hand the original to pty so its error message is clear
}
function resolveCwd(requested) {
    try {
        fs_1.default.accessSync(requested, fs_1.default.constants.X_OK);
        return requested;
    }
    catch {
        electron_log_1.default.warn(`cwd not accessible (${requested}), falling back to home`);
        return os_1.default.homedir();
    }
}
function createWindow(opts = {}) {
    const win = new electron_1.BrowserWindow({
        width: opts.width ?? 1200,
        height: opts.height ?? 800,
        minWidth: 600,
        minHeight: 400,
        frame: false,
        titleBarStyle: 'hidden',
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
        icon: getIconPath(),
    });
    const hashParts = [];
    if (opts.workspaceName)
        hashParts.push(`ws=${encodeURIComponent(opts.workspaceName)}`);
    if (opts.transferToken)
        hashParts.push(`transfer=${encodeURIComponent(opts.transferToken)}`);
    const loadOptions = hashParts.length > 0 ? { hash: hashParts.join('&') } : {};
    win.loadFile(path_1.default.join(__dirname, '../renderer/index.html'), loadOptions);
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//.test(url))
            electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Prevent Electron from showing a native context menu on Linux that would
    // overlap the renderer's custom HTML context menu
    win.webContents.on('context-menu', (e) => e.preventDefault());
    const wcId = win.webContents.id;
    win.on('closed', () => {
        if (win === mainWindow)
            mainWindow = null;
        terminals.forEach((term, id) => {
            if (term.webContentsId === wcId) {
                term.process.kill();
                terminals.delete(id);
            }
        });
    });
    if (!mainWindow) {
        mainWindow = win;
        createMenu();
        if (electron_1.app.isPackaged) {
            setTimeout(() => checkForUpdates(), 5000);
        }
        electron_log_1.default.info('Main window created');
    }
    else {
        electron_log_1.default.info('Detached window created');
    }
    return win;
}
function getFocusedWindow() {
    return electron_1.BrowserWindow.getFocusedWindow() ?? mainWindow;
}
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Tab',
                    click: () => getFocusedWindow()?.webContents.send('new-tab'),
                },
                {
                    label: 'Close Tab',
                    click: () => getFocusedWindow()?.webContents.send('close-tab'),
                },
                { type: 'separator' },
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => createWindow(),
                },
                { type: 'separator' },
                { role: 'quit' },
            ],
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
                    click: () => getFocusedWindow()?.webContents.send('clear-terminal'),
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Split Horizontally',
                    click: () => getFocusedWindow()?.webContents.send('split-horizontal'),
                },
                {
                    label: 'Split Vertically',
                    click: () => getFocusedWindow()?.webContents.send('split-vertical'),
                },
                { type: 'separator' },
                {
                    label: 'Next Tab',
                    click: () => getFocusedWindow()?.webContents.send('next-tab'),
                },
                {
                    label: 'Previous Tab',
                    click: () => getFocusedWindow()?.webContents.send('prev-tab'),
                },
                { type: 'separator' },
                {
                    label: 'Search',
                    click: () => getFocusedWindow()?.webContents.send('show-search'),
                },
                {
                    label: 'Command Palette',
                    click: () => getFocusedWindow()?.webContents.send('show-command-palette'),
                },
                { type: 'separator' },
                {
                    label: 'Settings',
                    click: () => getFocusedWindow()?.webContents.send('show-settings'),
                },
                { type: 'separator' },
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Check for Updates',
                    click: () => checkForUpdates(),
                },
                { type: 'separator' },
                {
                    label: 'About VibeTerminal',
                    click: () => {
                        if (mainWindow) {
                            electron_1.dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'About VibeTerminal',
                                message: `VibeTerminal v${electron_1.app.getVersion()}`,
                                detail: 'A beautiful, feature-rich terminal emulator.\n\nBuilt with Electron, xterm.js, and node-pty.',
                            });
                        }
                    },
                },
            ],
        },
    ];
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
// IPC Handlers
electron_1.ipcMain.handle('get-settings', () => loadSettings());
electron_1.ipcMain.handle('save-settings', (_event, settings) => {
    return { success: saveSettingsToDisk(settings) };
});
electron_1.ipcMain.on('check-for-updates', () => checkForUpdates());
electron_1.ipcMain.on('install-update', () => {
    autoUpdaterInstance?.quitAndInstall();
});
electron_1.ipcMain.handle('create-terminal', async (event, options = {}) => {
    const settings = loadSettings();
    const id = ++terminalIdCounter;
    const rawShell = options.shell || (settings.shell && settings.shell.trim()) || SHELL;
    const resolvedShell = resolveShell(rawShell);
    const cwd = resolveCwd(options.cwd ?? os_1.default.homedir());
    const senderWcId = event.sender.id;
    const env = { ...process.env };
    env.TERM = 'xterm-256color';
    env.COLORTERM = 'truecolor';
    env.TERM_PROGRAM = 'VibeTerminal';
    electron_log_1.default.info(`Spawning terminal ${id}: shell=${resolvedShell} cwd=${cwd} platform=${process.platform}`);
    try {
        const ptyProcess = pty.spawn(resolvedShell, [], {
            name: 'xterm-256color',
            cols: options.cols ?? 80,
            rows: options.rows ?? 24,
            cwd,
            env,
        });
        ptyProcess.onData((data) => {
            const entry = terminals.get(id);
            if (!entry)
                return;
            const wc = electron_1.webContents.fromId(entry.webContentsId);
            if (wc && !wc.isDestroyed()) {
                wc.send('terminal-data', { id, data });
            }
        });
        ptyProcess.onExit(({ exitCode, signal }) => {
            const entry = terminals.get(id);
            const wcId = entry?.webContentsId ?? senderWcId;
            const wc = electron_1.webContents.fromId(wcId);
            if (wc && !wc.isDestroyed()) {
                wc.send('terminal-exit', { id, exitCode, signal });
            }
            terminals.delete(id);
            electron_log_1.default.info(`Terminal ${id} exited with code ${exitCode}`);
        });
        terminals.set(id, { process: ptyProcess, shell: resolvedShell, webContentsId: senderWcId });
        electron_log_1.default.info(`Created terminal ${id} with shell ${resolvedShell}`);
        return { success: true, id };
    }
    catch (error) {
        electron_log_1.default.error(`Failed to create terminal (shell=${resolvedShell} cwd=${cwd} SHELL_env=${process.env.SHELL ?? 'unset'}):`, error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.on('terminal-input', (_event, { id, data }) => {
    terminals.get(id)?.process.write(data);
});
electron_1.ipcMain.on('terminal-resize', (_event, { id, cols, rows }) => {
    terminals.get(id)?.process.resize(cols, rows);
});
electron_1.ipcMain.on('terminal-kill', (_event, { id }) => {
    const terminal = terminals.get(id);
    if (terminal) {
        terminal.process.kill();
        terminals.delete(id);
    }
});
electron_1.ipcMain.on('window-minimize', (event) => {
    electron_1.BrowserWindow.fromWebContents(event.sender)?.minimize();
});
electron_1.ipcMain.on('window-maximize', (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized())
        win.unmaximize();
    else
        win?.maximize();
});
electron_1.ipcMain.on('window-close', (event) => {
    electron_1.BrowserWindow.fromWebContents(event.sender)?.close();
});
electron_1.ipcMain.handle('window-is-maximized', (event) => {
    return electron_1.BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});
electron_1.ipcMain.handle('create-window', (_event, { workspaceName, transferToken } = {}) => {
    createWindow({ workspaceName, transferToken, width: 900, height: 700 });
    return {};
});
electron_1.ipcMain.handle('stage-transfer', (_event, { token, terminalIds, payload }) => {
    pendingTransfers.set(token, { allTerminalIds: terminalIds, payload });
    return { success: true };
});
electron_1.ipcMain.handle('claim-transfer', (event, { token }) => {
    const transfer = pendingTransfers.get(token);
    if (!transfer)
        return { payload: null };
    pendingTransfers.delete(token);
    const newWcId = event.sender.id;
    for (const id of transfer.allTerminalIds) {
        const term = terminals.get(id);
        if (term)
            term.webContentsId = newWcId;
    }
    return { payload: transfer.payload };
});
electron_1.ipcMain.handle('get-shell-path', () => SHELL);
electron_1.ipcMain.handle('get-platform', () => process.platform);
electron_1.ipcMain.handle('get-app-version', () => electron_1.app.getVersion());
electron_1.ipcMain.handle('set-hotkey', (_event, { enabled, hotkey }) => {
    if (enabled && hotkey) {
        registerHotkey(hotkey);
    }
    else {
        if (registeredHotkey) {
            try {
                electron_1.globalShortcut.unregister(registeredHotkey);
            }
            catch { }
            registeredHotkey = null;
        }
    }
    return { success: true };
});
electron_1.ipcMain.on('open-external', (_event, url) => {
    if (/^https?:\/\//.test(url))
        electron_1.shell.openExternal(url);
});
electron_1.ipcMain.handle('send-feedback', async (_event, text, name) => {
    const PROXY_URL = 'https://discord-webhook-proxy.vibeterm.workers.dev/report';
    const PROXY_KEY = 'fuckitall';
    const from = name?.trim() || 'Anonymous';
    const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Secret-Key': PROXY_KEY },
        body: JSON.stringify({ content: `**VibeTerminal Feedback** — from **${from}**\n${text}` }),
    });
    return res.ok;
});
// SSH Config
const SSH_CONFIG_PATH = path_1.default.join(os_1.default.homedir(), '.ssh', 'config');
function parseSshConfig(content) {
    const hosts = [];
    let current = null;
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const m = trimmed.match(/^(\S+)\s+(.+)$/);
        if (!m)
            continue;
        const key = m[1].toLowerCase();
        const value = m[2].trim();
        if (key === 'host') {
            if (current && !current.host.includes('*'))
                hosts.push(current);
            current = { host: value, hostname: '', user: '', port: '22' };
        }
        else if (current) {
            if (key === 'hostname')
                current.hostname = value;
            else if (key === 'user')
                current.user = value;
            else if (key === 'port')
                current.port = value;
        }
    }
    if (current && !current.host.includes('*'))
        hosts.push(current);
    return hosts;
}
electron_1.ipcMain.handle('ssh-read-config', () => {
    try {
        if (!fs_1.default.existsSync(SSH_CONFIG_PATH))
            return { hosts: [] };
        return { hosts: parseSshConfig(fs_1.default.readFileSync(SSH_CONFIG_PATH, 'utf8')) };
    }
    catch (e) {
        electron_log_1.default.error('ssh-read-config error:', e);
        return { hosts: [] };
    }
});
electron_1.ipcMain.handle('ssh-write-config', (_event, { alias, hostname, user, port }) => {
    try {
        const sshDir = path_1.default.join(os_1.default.homedir(), '.ssh');
        if (!fs_1.default.existsSync(sshDir))
            fs_1.default.mkdirSync(sshDir, { mode: 0o700 });
        let entry = `\nHost ${alias}\n    HostName ${hostname}\n`;
        if (user)
            entry += `    User ${user}\n`;
        if (port && port !== '22')
            entry += `    Port ${port}\n`;
        fs_1.default.appendFileSync(SSH_CONFIG_PATH, entry, 'utf8');
        return { success: true };
    }
    catch (e) {
        electron_log_1.default.error('ssh-write-config error:', e);
        return { success: false, error: e.message };
    }
});
// SSH Groups
const SSH_GROUPS_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'ssh-groups.json');
electron_1.ipcMain.handle('ssh-read-groups', () => {
    try {
        if (!fs_1.default.existsSync(SSH_GROUPS_PATH))
            return { groups: [] };
        return { groups: JSON.parse(fs_1.default.readFileSync(SSH_GROUPS_PATH, 'utf8')) };
    }
    catch {
        return { groups: [] };
    }
});
electron_1.ipcMain.handle('ssh-write-groups', (_event, groups) => {
    try {
        fs_1.default.writeFileSync(SSH_GROUPS_PATH, JSON.stringify(groups, null, 2));
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
// App events
electron_1.app.whenReady().then(() => {
    electron_log_1.default.info('App ready, creating window');
    createWindow();
    const settings = loadSettings();
    if (settings.hotkeyEnabled && settings.hotkey) {
        registerHotkey(settings.hotkey);
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    terminals.forEach((term) => term.process.kill());
    terminals.clear();
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('before-quit', () => {
    terminals.forEach((term) => term.process.kill());
    terminals.clear();
    electron_1.globalShortcut.unregisterAll();
    electron_log_1.default.info('App quitting');
});
process.on('uncaughtException', (error) => electron_log_1.default.error('Uncaught exception:', error));
process.on('unhandledRejection', (reason) => electron_log_1.default.error('Unhandled rejection:', reason));
//# sourceMappingURL=main.js.map