# Keybindings Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Keybindings tab to the Settings modal (between Appearance and About) that lets users remap all 14 app commands using VS Code-style click-to-capture, with per-row reset and advisory conflict warnings.

**Architecture:** All command shortcuts are moved from Electron menu accelerators (`main.ts`) to a unified renderer-side capture-phase keydown handler (`renderer.ts`). The handler resolves each command's effective binding from an overlay in `settings.keybindings`, falling back to a new `defaultKey` field on each command. A `_pendingKeybindings` map tracks unsaved edits while the settings panel is open. Clearing it in `hideSettings()` ensures the dispatcher always sees the last-saved state during normal use.

**Tech Stack:** TypeScript, Electron, DOM APIs (`KeyboardEvent`, `e.code`), existing `saveSettings`/`getSettings` IPC — no new IPC channels.

---

## File Map

| File | Change |
|------|--------|
| `src/renderer/renderer.ts` | Extend `Settings` + `Command` interfaces; add `defaultKey` to commands array; add `_pendingKeybindings` field; add `eventToKey`, `keyToDisplay`, `getEffectiveKey` helpers; add `renderKeybindingsTable()` and `startKeybindCapture()`; update `showSettings()`, `saveSettings()`, `hideSettings()`, and the keydown dispatcher |
| `src/renderer/index.html` | Add CSS for keybindings UI; add Keybindings tab button; add `stab-keybindings` panel |
| `src/main/main.ts` | Remove `accelerator` from all custom menu items to prevent double-fire |

---

## Task 1: Extend types, add defaultKey to commands, add utility methods

**Files:**
- Modify: `src/renderer/renderer.ts`

- [ ] **Step 1: Add `keybindings` to the Settings interface**

Find the `Settings` interface (starts at line 8). Add `keybindings` as the last field:

```ts
interface Settings {
  fontFamily: string;
  fontSize: number;
  cursorStyle: string;
  cursorBlink: boolean;
  scrollback: number;
  shell: string;
  theme: string;
  titlebarStyle: string;
  opacity: number;
  hotkeyEnabled: boolean;
  hotkey: string;
  userName: string;
  keybindings: Record<string, string>;
}
```

- [ ] **Step 2: Add `defaultKey` to the Command interface**

Find the `Command` interface (around line 60). Add `defaultKey: string` after `shortcut`:

```ts
interface Command {
  id: string;
  title: string;
  shortcut: string;
  defaultKey: string;
  action: () => void;
}
```

- [ ] **Step 3: Add `keybindings: {}` to DEFAULT_SETTINGS**

Find `DEFAULT_SETTINGS` (around line 251). Add after `userName: ''`:

```ts
const DEFAULT_SETTINGS: Settings = {
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
```

- [ ] **Step 4: Add `defaultKey` to all 14 commands in the constructor**

Find the `this.commands = [...]` assignment (around line 287). Replace the entire array with:

```ts
this.commands = [
  { id: 'newTab',        title: 'New Tab',                shortcut: '⌘T',   defaultKey: 'CmdOrCtrl+KeyT',               action: () => this.addTab() },
  { id: 'closeTab',      title: 'Close Tab',              shortcut: '⌘W',   defaultKey: 'CmdOrCtrl+KeyW',               action: () => this.closeActiveTab() },
  { id: 'splitH',        title: 'Split Horizontally',     shortcut: '⌘D',   defaultKey: 'CmdOrCtrl+KeyD',               action: () => this.splitActivePane('horizontal') },
  { id: 'splitV',        title: 'Split Vertically',       shortcut: '⌘⇧D',  defaultKey: 'CmdOrCtrl+Shift+KeyD',         action: () => this.splitActivePane('vertical') },
  { id: 'nextTab',       title: 'Next Tab',               shortcut: '⌘⇧]',  defaultKey: 'CmdOrCtrl+Shift+BracketRight', action: () => this.nextTab() },
  { id: 'prevTab',       title: 'Previous Tab',           shortcut: '⌘⇧[',  defaultKey: 'CmdOrCtrl+Shift+BracketLeft',  action: () => this.prevTab() },
  { id: 'newWorkspace',  title: 'New Workspace',          shortcut: '⌘⇧N',  defaultKey: 'CmdOrCtrl+Shift+KeyN',         action: () => this.addWorkspace() },
  { id: 'nextWorkspace', title: 'Next Workspace',         shortcut: '⌘⇧.',  defaultKey: 'CmdOrCtrl+Shift+Period',        action: () => this.nextWorkspace() },
  { id: 'prevWorkspace', title: 'Previous Workspace',     shortcut: '⌘⇧,',  defaultKey: 'CmdOrCtrl+Shift+Comma',        action: () => this.prevWorkspace() },
  { id: 'clear',         title: 'Clear Terminal',         shortcut: '⌘K',   defaultKey: 'CmdOrCtrl+KeyK',               action: () => this.clearActiveTerminal() },
  { id: 'search',        title: 'Search...',              shortcut: '⌘F',   defaultKey: 'CmdOrCtrl+KeyF',               action: () => this.showSearch() },
  { id: 'settings',      title: 'Settings',               shortcut: '⌘,',   defaultKey: 'CmdOrCtrl+Comma',              action: () => this.showSettings() },
  { id: 'pasteHistory',  title: 'Paste History',          shortcut: '⌃⇧H',  defaultKey: 'Ctrl+Shift+KeyH',              action: () => this.showPasteHistory() },
  { id: 'broadcast',     title: 'Toggle Broadcast Input', shortcut: '⌃⇧B',  defaultKey: 'Ctrl+Shift+KeyB',              action: () => this.toggleBroadcast() },
];
```

- [ ] **Step 5: Add `_pendingKeybindings` field to the class**

Find the class field declarations (around line 276, near `settings: Settings = ...`). Add after `broadcastInput`:

```ts
_pendingKeybindings: Record<string, string> = {};
```

- [ ] **Step 6: Add three utility methods to TerminalManager**

Add these three methods after `hideSettings()` (around line 1692). They must be added as class methods (inside the class body):

```ts
private eventToKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  const isMac = this.platform === 'darwin';
  if (isMac ? e.metaKey : e.ctrlKey) parts.push('CmdOrCtrl');
  else if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  const modCodes = ['ControlLeft','ControlRight','ShiftLeft','ShiftRight','MetaLeft','MetaRight','AltLeft','AltRight'];
  if (!modCodes.includes(e.code)) parts.push(e.code);
  return parts.join('+');
}

private keyToDisplay(key: string): string {
  const isMac = this.platform === 'darwin';
  const codeToChar: Record<string, string> = {
    KeyA:'A', KeyB:'B', KeyC:'C', KeyD:'D', KeyE:'E', KeyF:'F', KeyG:'G', KeyH:'H',
    KeyI:'I', KeyJ:'J', KeyK:'K', KeyL:'L', KeyM:'M', KeyN:'N', KeyO:'O', KeyP:'P',
    KeyQ:'Q', KeyR:'R', KeyS:'S', KeyT:'T', KeyU:'U', KeyV:'V', KeyW:'W', KeyX:'X',
    KeyY:'Y', KeyZ:'Z', Digit0:'0', Digit1:'1', Digit2:'2', Digit3:'3', Digit4:'4',
    Digit5:'5', Digit6:'6', Digit7:'7', Digit8:'8', Digit9:'9',
    Comma:',', Period:'.', Slash:'/', Backquote:'`', Minus:'-', Equal:'=',
    BracketLeft:'[', BracketRight:']', Backslash:'\\', Semicolon:';', Quote:"'",
    Space:'Space', Enter:'Enter', Backspace:'⌫', Delete:'⌦', Tab:'Tab',
    ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→',
    F1:'F1', F2:'F2', F3:'F3', F4:'F4', F5:'F5', F6:'F6',
    F7:'F7', F8:'F8', F9:'F9', F10:'F10', F11:'F11', F12:'F12',
  };
  return key.split('+').map(p => {
    if (p === 'CmdOrCtrl') return isMac ? '⌘' : '⌃';
    if (p === 'Ctrl') return '⌃';
    if (p === 'Shift') return '⇧';
    if (p === 'Alt') return isMac ? '⌥' : '⎇';
    return codeToChar[p] ?? p;
  }).join('');
}

private getEffectiveKey(id: string): string {
  return this._pendingKeybindings[id]
    ?? this.settings.keybindings?.[id]
    ?? this.commands.find(c => c.id === id)!.defaultKey;
}
```

- [ ] **Step 7: Build and verify TypeScript compiles**

Run: `npm run build:ts`
Expected: exits with code 0, no errors in output.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/renderer.ts
git commit -m "feat: extend Settings/Command types and add keybind utility methods"
```

---

## Task 2: Add CSS for the keybindings UI

**Files:**
- Modify: `src/renderer/index.html`

- [ ] **Step 1: Add CSS for the keybindings table and chip components**

In `index.html`, find the `/* ─── About ─── */` comment (around line 522). Insert the following block immediately **before** that comment:

```css
/* ─── Keybindings ────────────────────────────────────────────────────── */
.kb-row { display: flex; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px; }
.kb-row:last-child { border-bottom: none; }
.kb-action { flex: 1; font-size: 13px; color: var(--fg-dim); }
.kb-shortcut-chip {
  min-width: 90px; padding: 3px 10px; border-radius: 4px; font-size: 12px;
  font-family: monospace; cursor: pointer; text-align: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: var(--fg); transition: border-color 0.15s; user-select: none;
}
.kb-shortcut-chip:hover { border-color: rgba(255,255,255,0.25); }
.kb-shortcut-chip.capturing {
  border-color: var(--accent); color: var(--accent); background: rgba(0,255,136,0.07);
}
.kb-reset-btn {
  background: none; border: none; cursor: pointer; font-size: 14px;
  color: var(--fg-dim); opacity: 0; padding: 2px 4px; border-radius: 3px;
  transition: opacity 0.15s, color 0.15s;
}
.kb-row:hover .kb-reset-btn { opacity: 0.5; }
.kb-reset-btn.active { opacity: 0.7 !important; }
.kb-reset-btn:hover { opacity: 1 !important; color: var(--accent); }
.kb-conflict { font-size: 11px; color: #FF6B6B; padding: 2px 0 4px 0; display: none; }
.kb-conflict.visible { display: block; }
```

- [ ] **Step 2: Build renderer to check for CSS syntax errors**

Run: `npm run build:renderer`
Expected: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/index.html
git commit -m "feat: add CSS for keybindings settings tab"
```

---

## Task 3: Add the Keybindings tab button and panel to the HTML

**Files:**
- Modify: `src/renderer/index.html`

- [ ] **Step 1: Insert the Keybindings tab button**

Find the settings tab nav (around line 847):
```html
        <button class="settings-tab-btn active" onclick="switchSettingsTab('appearance', this)">Appearance</button>
        <button class="settings-tab-btn" onclick="switchSettingsTab('about', this)">About</button>
```

Replace with:
```html
        <button class="settings-tab-btn active" onclick="switchSettingsTab('appearance', this)">Appearance</button>
        <button class="settings-tab-btn" onclick="switchSettingsTab('keybindings', this)">Keybindings</button>
        <button class="settings-tab-btn" onclick="switchSettingsTab('about', this)">About</button>
```

- [ ] **Step 2: Add the keybindings tab panel**

Find the closing `</div>` that ends the `stab-appearance` panel (around line 940) and the comment `<!-- About tab: ... -->` that starts `stab-about`. Insert the new panel between them:

```html
        <!-- Keybindings tab -->
        <div class="settings-tab-panel" id="stab-keybindings">
          <div class="settings-section-title">Keybindings</div>
          <div id="kbTableContainer"></div>
        </div>
```

- [ ] **Step 3: Build and visually verify the tab appears**

Run: `npm run build:all && electron . --no-sandbox`

Open Settings (`Ctrl+,` or `Cmd+,`). Confirm:
- Three tabs are visible: Appearance | Keybindings | About
- Clicking Keybindings shows an empty panel (the table renders in the next task)
- Appearance and About tabs still work

- [ ] **Step 4: Commit**

```bash
git add src/renderer/index.html
git commit -m "feat: add Keybindings tab to settings modal"
```

---

## Task 4: Implement renderKeybindingsTable()

**Files:**
- Modify: `src/renderer/renderer.ts`

- [ ] **Step 1: Add `renderKeybindingsTable()` to TerminalManager**

Add this method after `hideSettings()` (around line 1692):

```ts
renderKeybindingsTable(): void {
  const container = document.getElementById('kbTableContainer')!;
  container.innerHTML = '';

  this.commands.forEach(cmd => {
    const effectiveKey = this.getEffectiveKey(cmd.id);
    const isOverridden = !!(this._pendingKeybindings[cmd.id] ?? this.settings.keybindings?.[cmd.id]);

    const wrapper = document.createElement('div');

    const row = document.createElement('div');
    row.className = 'kb-row';
    row.dataset.id = cmd.id;

    const action = document.createElement('span');
    action.className = 'kb-action';
    action.textContent = cmd.title;

    const conflictEl = document.createElement('div');
    conflictEl.className = 'kb-conflict';

    const chip = document.createElement('button');
    chip.className = 'kb-shortcut-chip';
    chip.textContent = this.keyToDisplay(effectiveKey);
    chip.onclick = () => this.startKeybindCapture(cmd.id, chip, conflictEl);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'kb-reset-btn' + (isOverridden ? ' active' : '');
    resetBtn.title = 'Reset to default';
    resetBtn.textContent = '↺';
    resetBtn.onclick = () => {
      delete this._pendingKeybindings[cmd.id];
      this.renderKeybindingsTable();
    };

    row.appendChild(action);
    row.appendChild(chip);
    row.appendChild(resetBtn);
    wrapper.appendChild(row);
    wrapper.appendChild(conflictEl);
    container.appendChild(wrapper);
  });
}
```

- [ ] **Step 2: Build and verify TypeScript compiles**

Run: `npm run build:ts`
Expected: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/renderer.ts
git commit -m "feat: implement renderKeybindingsTable"
```

---

## Task 5: Implement startKeybindCapture()

**Files:**
- Modify: `src/renderer/renderer.ts`

- [ ] **Step 1: Add `startKeybindCapture()` to TerminalManager**

Add this method directly after `renderKeybindingsTable()`:

```ts
private startKeybindCapture(id: string, chip: HTMLButtonElement, conflictEl: HTMLDivElement): void {
  if (document.querySelector('.kb-shortcut-chip.capturing')) return;

  chip.classList.add('capturing');
  chip.textContent = 'Press keys…';

  const onKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.code === 'Escape') {
      cancel();
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey) return;

    const modCodes = ['ControlLeft','ControlRight','ShiftLeft','ShiftRight','MetaLeft','MetaRight','AltLeft','AltRight'];
    if (modCodes.includes(e.code)) return;

    const newKey = this.eventToKey(e);
    document.removeEventListener('keydown', onKeyDown, true);

    const conflict = this.commands.find(cmd => cmd.id !== id && this.getEffectiveKey(cmd.id) === newKey);

    this._pendingKeybindings[id] = newKey;
    chip.classList.remove('capturing');
    chip.textContent = this.keyToDisplay(newKey);

    const row = chip.closest('.kb-row') as HTMLElement;
    row?.querySelector('.kb-reset-btn')?.classList.add('active');

    if (conflict) {
      conflictEl.textContent = `Already used by "${conflict.title}"`;
      conflictEl.classList.add('visible');
    } else {
      conflictEl.classList.remove('visible');
      conflictEl.textContent = '';
    }
  };

  const cancel = () => {
    chip.classList.remove('capturing');
    chip.textContent = this.keyToDisplay(this.getEffectiveKey(id));
    document.removeEventListener('keydown', onKeyDown, true);
  };

  document.addEventListener('keydown', onKeyDown, true);
}
```

- [ ] **Step 2: Build and verify TypeScript compiles**

Run: `npm run build:ts`
Expected: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/renderer.ts
git commit -m "feat: implement VS Code-style keybind capture with conflict detection"
```

---

## Task 6: Wire showSettings(), saveSettings(), and hideSettings() to keybindings

**Files:**
- Modify: `src/renderer/renderer.ts`

- [ ] **Step 1: Update `showSettings()` to seed pending keybindings and render the table**

In `showSettings()`, find the lines that set `settingsHotkeyEnabled` and `settingsHotkey` (around line 1631–1633). Add these two lines immediately after the `hotkeyHint` display logic (around line 1634), before `document.getElementById('settingsOverlay')`:

```ts
this._pendingKeybindings = { ...(this.settings.keybindings ?? {}) };
this.renderKeybindingsTable();
```

- [ ] **Step 2: Update `saveSettings()` to persist keybindings and preserve userName**

Find the `newSettings` object literal in `saveSettings()` (around line 1659). Replace it with:

```ts
const newSettings: Settings = {
  fontFamily: fontFamily || DEFAULT_SETTINGS.fontFamily,
  fontSize: parseInt((document.getElementById('settingsFontSize') as HTMLInputElement).value, 10) || 13,
  cursorStyle: (document.getElementById('settingsCursorStyle') as HTMLSelectElement).value,
  cursorBlink: (document.getElementById('settingsCursorBlink') as HTMLInputElement).checked,
  scrollback: parseInt((document.getElementById('settingsScrollback') as HTMLInputElement).value, 10) || 10000,
  shell: (document.getElementById('settingsShell') as HTMLInputElement).value.trim(),
  theme: (document.getElementById('settingsTheme') as HTMLSelectElement).value,
  titlebarStyle: (document.getElementById('settingsTitlebarStyle') as HTMLSelectElement).value,
  opacity,
  hotkeyEnabled,
  hotkey,
  userName: this.settings.userName,
  keybindings: { ...this._pendingKeybindings },
};
```

- [ ] **Step 3: Update `hideSettings()` to clear pending keybindings**

In `hideSettings()`, add this line at the very start of the method body (before the theme revert logic):

```ts
this._pendingKeybindings = {};
```

This ensures the keydown dispatcher always sees the last-saved state, not abandoned panel edits.

- [ ] **Step 4: Build and run the full flow manually**

Run: `npm run build:all && electron . --no-sandbox`

Test the end-to-end flow:
1. Open Settings → click Keybindings tab → 14 rows appear with default shortcuts
2. Click the chip for "New Tab" → chip shows `Press keys…`
3. Press `Ctrl+Shift+G` → chip updates to `⌃⇧G` (or `⌘⇧G` on Mac)
4. Click ↺ on that row → shortcut reverts to `⌘T` / `⌃T`
5. Remap "New Tab" to `Ctrl+K` (same as "Clear Terminal") → red warning appears under the row
6. Click Save → settings close; open again → remapped shortcut is still shown

- [ ] **Step 5: Commit**

```bash
git add src/renderer/renderer.ts
git commit -m "feat: wire keybindings into showSettings, saveSettings, and hideSettings"
```

---

## Task 7: Replace the hard-coded keydown dispatcher with a unified command handler

**Files:**
- Modify: `src/renderer/renderer.ts:416-434`

- [ ] **Step 1: Replace the hard-coded capture-phase keydown block**

In `setupEventListeners()`, find the block that starts around line 419:
```ts
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  if (e.shiftKey && e.code === 'KeyD') {
    ...
  }
  ...
}, true);
```

Replace the **entire block** (the second `document.addEventListener('keydown', ...)` call, the one with `true` as the third argument) with:

```ts
document.addEventListener('keydown', (e) => {
  if (document.querySelector('.kb-shortcut-chip.capturing')) return;
  const pressed = this.eventToKey(e);
  const cmd = this.commands.find(c => this.getEffectiveKey(c.id) === pressed);
  if (!cmd) return;
  e.preventDefault();
  e.stopPropagation();
  cmd.action();
}, true);
```

Keep the first `document.addEventListener('keydown', ...)` (the one that handles `Escape` to close overlays) — only replace the second one.

- [ ] **Step 2: Build and verify TypeScript compiles**

Run: `npm run build:ts`
Expected: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/renderer.ts
git commit -m "feat: unify all command shortcuts under renderer keydown dispatcher"
```

---

## Task 8: Remove Electron menu accelerators to prevent double-fire

Without this step, pressing a default shortcut fires the action twice — once from the renderer handler (Task 7) and once from the Electron menu IPC. This task removes the accelerators from the menu; menu items remain clickable via mouse.

**Files:**
- Modify: `src/main/main.ts`

- [ ] **Step 1: Remove `accelerator` from all custom menu items in `createMenu()`**

In `src/main/main.ts`, find the `createMenu()` function (around line 312). Remove the `accelerator:` line from every menu item that has one (leave `role` items untouched — `role: 'undo'`, `role: 'quit'`, etc. are fine as-is).

The updated `createMenu()` function body should be:

```ts
function createMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Tab',    click: () => getFocusedWindow()?.webContents.send('new-tab') },
        { label: 'Close Tab',  click: () => getFocusedWindow()?.webContents.send('close-tab') },
        { type: 'separator' },
        { label: 'New Window', click: () => createWindow() },
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
        { label: 'Clear Terminal', click: () => getFocusedWindow()?.webContents.send('clear-terminal') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Split Horizontally', click: () => getFocusedWindow()?.webContents.send('split-horizontal') },
        { label: 'Split Vertically',   click: () => getFocusedWindow()?.webContents.send('split-vertical') },
        { type: 'separator' },
        { label: 'Next Tab',           click: () => getFocusedWindow()?.webContents.send('next-tab') },
        { label: 'Previous Tab',       click: () => getFocusedWindow()?.webContents.send('prev-tab') },
        { type: 'separator' },
        { label: 'Search',             click: () => getFocusedWindow()?.webContents.send('show-search') },
        { label: 'Command Palette',    click: () => getFocusedWindow()?.webContents.send('show-command-palette') },
        { type: 'separator' },
        { label: 'Settings',           click: () => getFocusedWindow()?.webContents.send('show-settings') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
```

Leave any remaining menu sections (Window, etc.) exactly as they were — only remove `accelerator:` lines from the three sections above.

- [ ] **Step 2: Build TypeScript and verify no errors**

Run: `npm run build:ts`
Expected: exits with code 0.

- [ ] **Step 3: Run the app and verify no double-fire and remapping works end-to-end**

Run: `npm run build:all && electron . --no-sandbox`

Test:
1. Press `Ctrl+T` (or `Cmd+T`) → exactly **one** new tab opens
2. Press `Ctrl+W` → exactly **one** tab closes
3. Open Settings → Keybindings → remap "New Tab" to `Ctrl+Shift+G` → Save
4. Press `Ctrl+T` → nothing happens (no longer bound)
5. Press `Ctrl+Shift+G` → one new tab opens
6. Open Settings → Keybindings → click ↺ on "New Tab" → Save
7. Press `Ctrl+T` → one new tab opens again (default restored)

- [ ] **Step 4: Commit**

```bash
git add src/main/main.ts
git commit -m "feat: remove Electron menu accelerators — shortcuts now handled in renderer"
```

---

## Done

All 14 commands are now remappable from Settings → Keybindings. Bindings persist via the existing `settings.json`. The Electron menu retains all items for mouse access; keyboard shortcuts live entirely in the renderer dispatcher.
