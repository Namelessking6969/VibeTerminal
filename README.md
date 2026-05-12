# VibeTerminal

A feature-rich terminal emulator for macOS, Windows, and Linux. Built on Electron, xterm.js, and node-pty. Also ships a native Swift/SwiftUI build for macOS.

**Platform:** macOS · Windows · Linux  
**Version:** 3.0.14  
**License:** MIT

---

## Features

### Workspaces
- Multiple named workspaces shown in a bar at the top of the window
- **Rename** — double-click a workspace name to edit it inline
- **Undock** — pop any workspace into its own window with the ↗ button or right-click menu
- **Close** — cleanly terminates all PTY processes in the workspace
- Navigate workspaces with `Ctrl/Cmd+Shift+.` (next) and `Ctrl/Cmd+Shift+,` (previous)
- Add a workspace with `Ctrl/Cmd+Shift+N`

### Tabs
- Unlimited tabs per workspace; tabs open with the active shell name as the default title
- **Rename** — right-click a tab to rename it inline
- **Tab colors** — right-click any tab → Set Color; pick from 8 accent colors; colored tabs show a tinted background and top border
- **Activity indicator** — background tabs pulse with a dot when they receive new output
- Close with `Ctrl/Cmd+W`; navigate with `Ctrl/Cmd+Shift+]` / `Ctrl/Cmd+Shift+[`

### Split Panes
- **Split horizontally** — `Ctrl/Cmd+D` or the ⊟ button in the tab bar
- **Split vertically** — `Ctrl/Cmd+Shift+D` or the ⊞ button
- Draggable divider — click and drag to resize panes freely
- Closing a pane collapses the split and returns the remaining pane to full width/height
- **Broadcast Input** — `Ctrl/Cmd+Shift+B` or the `⊕ BC` button types the same input to every split pane at once; a toast notification confirms when it toggles on or off

### Paste History
Press `Ctrl/Cmd+Shift+H` to open the Paste History panel. Stores the last 50 copied or pasted items, deduplicated (re-pasting an item moves it to the top). Click any entry to paste it into the active terminal. One-click clear button to wipe the history.

### Hotkey Window
Enable a global keyboard shortcut in **Settings → Hotkey Window** to summon and dismiss VibeTerminal from any application. The shortcut is fully configurable (default: `CommandOrControl+``).

### Themes
Five built-in themes, switchable live from Settings with an instant preview:

| Theme | Accent | Style |
|---|---|---|
| **Vibe** (default) | Neon green `#00FF88` | Dark cyberpunk |
| **Dracula** | Purple `#BD93F9` | Classic dark purple |
| **Nord** | Ice blue `#88C0D0` | Arctic, muted |
| **Monokai** | Lime `#A6E22E` | Warm dark |
| **Catppuccin Mocha** | Lavender `#CBA6F7` | Pastel dark |

Each theme fully styles the titlebar, workspace bar, tab bar, terminal canvas, and all UI chrome.

### Window Opacity
Adjust the terminal background transparency from 20% to 100% via **Settings → Appearance → Opacity**. The slider updates live so you can find the right balance before saving.

### Fonts
Choose from a curated list of popular Nerd Fonts or enter any custom font string:

| Preset |
|---|
| MesloLGS NF (default) |
| JetBrainsMono Nerd Font |
| FiraCode Nerd Font |
| Hack Nerd Font |
| CaskaydiaCove Nerd Font |
| IosevkaTerm Nerd Font |
| UbuntuMono Nerd Font |
| Custom (any font family string) |

Font size is adjustable from the Settings panel.

### Command Palette
Press `Ctrl/Cmd+Shift+P` to open a fuzzy-searchable command palette. Navigate with arrow keys, confirm with Return, dismiss with Escape.

Available commands:
- New Tab / Close Tab
- Split Horizontally / Vertically
- Next Tab / Previous Tab
- New Workspace / Next Workspace / Previous Workspace
- Clear Terminal
- Search
- Paste History
- Toggle Broadcast Input
- Settings

### Terminal Search
Press `Ctrl/Cmd+F` to open the search bar anchored at the top of the terminal:
- **Case-sensitive** toggle (`Aa` button)
- **Regex** toggle (`.*` button)
- Navigate matches forward with Enter, backward with Shift+Enter
- Powered by xterm.js `SearchAddon`

### Status Bar
A slim bar at the bottom of the window shows the terminal dimensions (columns × rows), updated live on resize.

### Clickable Links
URLs in terminal output are auto-detected and made clickable via xterm.js `WebLinksAddon`. Clicking opens them in the system default browser.

### Copy / Paste
- **Copy:** `Ctrl+Shift+C` / `Cmd+Shift+C` — copies the current terminal selection
- **Paste:** `Ctrl+Shift+V` / `Ctrl+V` / `Cmd+V` — pastes from clipboard and adds to Paste History
- **Right-click:** copies selection if text is selected; pastes from clipboard if nothing is selected

### SSH Manager
Click the **⌁ SSH** button in the tab bar to open the SSH panel:
- **Saved hosts** — reads `~/.ssh/config` and lists all configured hosts
- **Host groups** — create named groups to organize saved hosts; collapse/expand, rename, or delete groups; right-click any host to assign it to a group
- **Quick connect** — type `user@hostname` and hit Connect to open a new tab
- **Save & Connect** — fill in alias, hostname, user, and port to append a new entry to `~/.ssh/config` and connect immediately

### Titlebar
The titlebar adapts to the OS automatically, or can be forced to a specific style in Settings:
- **macOS style** — traffic-light buttons on the left, title centered
- **Windows style** — app name on the left, window controls on the right with Windows-style hover
- **Linux style** — app name on the left, circular icon buttons on the right

### Auto-Updater
VibeTerminal checks for updates on launch (packaged builds only) and shows an unobtrusive banner when an update is available or downloaded. Restart and install in one click. Manual check available from **Settings → Check for Updates**.

### Settings
Open with `Ctrl/Cmd+,` or the gear icon in the titlebar. Settings are persisted to disk.

| Setting | Options |
|---|---|
| Theme | Vibe, Dracula, Nord, Monokai, Catppuccin Mocha |
| Titlebar Style | Auto, macOS, Windows, Linux |
| Font Family | 7 Nerd Font presets or custom |
| Font Size | Adjustable in pt |
| Cursor Style | Block, Bar, Underline |
| Cursor Blink | On / Off |
| Scrollback | Up to 100,000 lines (default 10,000) |
| Opacity | 20%–100% background transparency |
| Shell Path | Any shell binary (empty = system default) |
| Hotkey Window | Global shortcut to show/hide the app from anywhere |

---

## macOS Native App

In addition to the Electron build, VibeTerminal ships a native macOS application built with **Swift 5.9 and SwiftUI**, targeting macOS 13.0 (Ventura) and later. It uses POSIX PTY APIs directly (`posix_openpt`, `fork`, `execv`) and includes a custom VT100/ANSI terminal emulator with a full CSI/SGR parser, 256-color support, and rich text attributes. The project file is generated with [XcodeGen](https://github.com/yonaskolb/XcodeGen).

---

## Tech Stack

### Electron (cross-platform)

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
| Language | TypeScript |

### macOS Native

| Component | Technology |
|---|---|
| Language | Swift 5.9 |
| UI framework | SwiftUI + AppKit |
| PTY / shell | POSIX (`posix_openpt`, `fork`, `execv`) |
| Terminal emulation | Custom VT100/ANSI engine |
| Project generation | XcodeGen |
| Deployment target | macOS 13.0+ |

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

### Build the macOS native app
Requires Xcode 15+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

```bash
./scripts/build.sh
```

Or manually:
```bash
xcodegen generate
open VibeTerminal.xcodeproj
```

---

## Versioning

The bump script updates `package.json`, `Resources/Info.plist`, `project.yml`, and `scripts/create-pkg.sh` in one shot, then commits and tags:

```bash
# Bump patch (3.0.14 → 3.0.15)
./scripts/bump-version.sh patch

# Bump minor (3.0.14 → 3.1.0)
./scripts/bump-version.sh minor

# Bump major (3.0.14 → 4.0.0)
./scripts/bump-version.sh major
```

Or via npm scripts:
```bash
npm run version:bump        # patch
npm run version:bump:minor  # minor
npm run version:bump:major  # major
```

Push the commit and tag to trigger a release:
```bash
git push origin main && git push origin vX.Y.Z
```

---

## Distribution Targets

| Platform | Format |
|---|---|
| macOS | `.dmg` and `.zip` (Intel x64 + Apple Silicon arm64) |
| Windows | `.exe` NSIS installer (x64) |
| Linux | `.deb` (x64) |

Releases are published to GitHub Releases via `electron-updater` / `electron-builder`.

---

## Project Structure

```
VibeTerminal/
├── src/
│   ├── main/
│   │   └── main.ts              # Electron main process: PTY management, IPC, auto-updater, SSH config
│   ├── preload/
│   │   └── preload.ts           # Context bridge — exposes safe IPC to renderer
│   └── renderer/
│       ├── index.html           # Full UI: workspaces, tabs, settings, search, command palette
│       ├── renderer.ts          # TerminalManager: all UI logic and state
│       └── xterm.css            # xterm.js styles
├── App/                         # Swift app entry point and AppDelegate
├── Views/                       # SwiftUI views (macOS native)
├── Terminal/                    # Swift PTY session and VT100 buffer (macOS native)
├── Models/                      # Swift settings and theme models (macOS native)
├── Resources/
│   ├── Info.plist
│   └── VibeTerminal.entitlements
├── scripts/
│   ├── build.sh                 # XcodeGen + xcodebuild
│   ├── bump-version.sh          # Bump version across all files and tag
│   ├── create-dmg.sh            # Package into a distributable DMG
│   └── create-pkg.sh            # Create macOS .pkg installer
├── project.yml                  # XcodeGen project specification
└── package.json                 # Electron build config and npm scripts
```
