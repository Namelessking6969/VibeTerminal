# VibeTerminal

A beautiful, feature-rich terminal emulator built with Electron, xterm.js, and node-pty. Designed for developers and power users who want a visually stunning terminal experience without sacrificing speed or flexibility.
 
**Platform:** macOS · Windows · Linux  
**License:** MIT

---

## Features

### Workspaces & Tabs
- **Multiple workspaces** — organize your terminal sessions into named workspaces, visible in the workspace bar at the top
- **Unlimited tabs** per workspace — open as many terminal sessions as you need side by side
- **Rename tabs and workspaces** — double-click or right-click to rename inline
- **Right-click context menus** on both tabs and workspace items for quick actions
- **Undock workspaces** — pop any workspace out into its own window with the ↗ button or via right-click
- **Close workspaces** — cleanly terminates all PTY processes associated with the workspace

### Split Panes
- **Horizontal splits** — `Ctrl/Cmd+D`
- **Vertical splits** — `Ctrl/Cmd+Shift+D`
- Multiple terminals inside a single tab for side-by-side workflows

### Themes
Five built-in themes, switchable live from Settings with instant preview:

| Theme | Accent Color | Style |
|---|---|---|
| **Vibe** (default) | Neon Green `#00FF88` | Dark, glowing, cyberpunk |
| **Dracula** | Purple `#BD93F9` | Classic dark purple |
| **Nord** | Ice Blue `#88C0D0` | Arctic, muted |
| **Monokai** | Lime Green `#A6E22E` | Warm dark |
| **Catppuccin Mocha** | Lavender `#CBA6F7` | Pastel dark |

Each theme fully styles the titlebar, tab bar, workspace bar, status bar, and the xterm.js terminal canvas.

### Neon Cursor Glow
The cursor renders with a CSS `box-shadow` glow matching the active theme accent color. Three cursor shapes available: **block**, **bar**, and **underline** — all with optional blink.

### Fonts
Choose from a curated list of popular Nerd Fonts or enter any custom font string:

- MesloLGS NF (default)
- JetBrainsMono Nerd Font
- FiraCode Nerd Font
- Hack Nerd Font
- CaskaydiaCove Nerd Font
- Iosevka Nerd Font
- UbuntuMono Nerd Font
- Custom (any font family string)

Font size is adjustable from 8–32px.

### Command Palette
Press `Ctrl/Cmd+Shift+P` to open a fuzzy-searchable command palette. Every action in the app is accessible here with its keyboard shortcut displayed inline.

Available commands:
- New Tab / Close Tab
- Split Horizontally / Vertically
- Next Tab / Previous Tab
- New Workspace / Next Workspace / Previous Workspace
- Clear Terminal
- Search
- Settings

### Terminal Search
Press `Ctrl/Cmd+F` to open the search overlay, anchored above the status bar:
- **Case-sensitive** toggle (`Aa` button)
- **Regex** toggle (`.*` button)
- Match count display
- Navigate between matches with Enter / Shift+Enter
- Powered by xterm.js `SearchAddon`

### Status Bar
A slim bar at the bottom of the window shows:
- Current working directory (left side)
- Active shell name and a green status indicator (right side)
- Terminal dimensions in columns × rows (right side), updated live on resize

### Clickable Links
URLs and file paths in the terminal output are auto-detected and made clickable via xterm.js `WebLinksAddon`.

### Copy / Paste
- **Copy:** `Ctrl+Shift+C` (or `Cmd+Shift+C` on macOS) — copies the current selection
- **Paste:** `Ctrl+Shift+V` / `Ctrl+V` / `Cmd+V` — pastes from clipboard
- **Right-click:** copies selection if text is selected; pastes from clipboard if nothing is selected

### Cross-Platform Titlebar
The titlebar adapts to the OS automatically, or can be forced to a specific style in Settings:
- **macOS style** — traffic-light buttons (close/minimize/maximize) on the left, title centered
- **Windows style** — app name on the left, minimize/maximize/close buttons on the right (Windows hover styles)
- **Linux style** — circular icon buttons on the right

### Auto-Updater
VibeTerminal checks for updates on launch (packaged builds only) and shows an unobtrusive banner when an update is available or downloaded. Update, restart, and install in one click. You can also trigger a manual check from **Settings → Check for Updates**.

### Settings Panel
Open with `Ctrl/Cmd+,` or via the gear icon in the titlebar. Settings persist to disk across launches.

| Setting | Options |
|---|---|
| Theme | Vibe, Dracula, Nord, Monokai, Catppuccin Mocha |
| Titlebar Style | Auto, macOS, Windows, Linux |
| Font Family | 7 Nerd Font presets or custom |
| Font Size | 8–32px |
| Cursor Style | Block, Bar, Underline |
| Cursor Blink | On / Off |
| Scrollback | 100–100,000 lines (default 10,000) |
| Shell Path | Any shell binary (empty = system default) |

---

## Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|---|---|---|
| New Tab | `⌘T` | `Ctrl+T` |
| Close Tab | `⌘W` | `Ctrl+W` |
| New Window | `⌘N` | `Ctrl+N` |
| Next Tab | `⌘⇧]` | `Ctrl+Shift+]` |
| Previous Tab | `⌘⇧[` | `Ctrl+Shift+[` |
| Split Horizontally | `⌘D` | `Ctrl+D` |
| Split Vertically | `⌘⇧D` | `Ctrl+Shift+D` |
| New Workspace | `⌘⇧N` | `Ctrl+Shift+N` |
| Next Workspace | `⌘⇧.` | `Ctrl+Shift+.` |
| Previous Workspace | `⌘⇧,` | `Ctrl+Shift+,` |
| Clear Terminal | `⌘K` | `Ctrl+K` |
| Search | `⌘F` | `Ctrl+F` |
| Command Palette | `⌘⇧P` | `Ctrl+Shift+P` |
| Settings | `⌘,` | `Ctrl+,` |
| Copy | `⌘⇧C` | `Ctrl+Shift+C` |
| Paste | `⌘V` | `Ctrl+V` / `Ctrl+Shift+V` |

---

## Tech Stack

| Component | Library |
|---|---|
| App framework | [Electron](https://www.electronjs.org/) v28 |
| Terminal emulation | [xterm.js](https://xtermjs.org/) v5 |
| PTY / shell process | [node-pty](https://github.com/microsoft/node-pty) |
| Terminal fit | xterm-addon-fit |
| Search | xterm-addon-search |
| Clickable links | xterm-addon-web-links |
| Auto-updater | electron-updater |
| Logging | electron-log |

---

## Build & Install

### Prerequisites
- Node.js 18+
- npm

### Install dependencies
```bash
npm install
```

### Run in development
```bash
npm run dev
```

### Build distributables
```bash
# All platforms
npm run build

# Platform-specific
npm run build:mac
npm run build:win
npm run build:linux
```

Outputs land in the `dist/` directory.

### Bump version
```bash
# Patch (default)
npm run version:bump

# Minor
npm run version:bump:minor

# Major
npm run version:bump:major
```

---

## Distribution Targets

| Platform | Format |
|---|---|
| macOS | `.dmg` and `.zip` (Intel x64 + Apple Silicon arm64) |
| Windows | `.exe` NSIS installer (x64) |
| Linux | `.deb` (x64) |

Releases are published to GitHub Releases automatically via `electron-updater` / `electron-builder`.

---

## Project Structure

```
App/
├── src/
│   ├── main/
│   │   └── main.js          # Electron main process, PTY management, IPC, auto-updater
│   ├── preload/
│   │   └── preload.js       # Context bridge — exposes safe IPC to renderer
│   └── renderer/
│       ├── index.html       # Entire UI: tabs, workspaces, settings, search, command palette
│       ├── xterm.js         # xterm.js bundle
│       ├── xterm.css        # xterm.js styles
│       ├── xterm-addon-fit.js
│       ├── xterm-addon-search.js
│       └── xterm-addon-web-links.js
├── scripts/
│   ├── build.sh
│   ├── bump-version.sh
│   ├── create-dmg.sh
│   └── create-pkg.sh
├── package.json
└── SPEC.md
```
