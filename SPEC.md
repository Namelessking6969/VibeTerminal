# VibeTerminal - Specification

## Project Overview
- **Name**: VibeTerminal
- **Type**: macOS Terminal Emulator
- **Core Functionality**: A beautiful, feature-rich terminal emulator with modern UI, glow effects, tabs, split panes, and extensive customization
- **Target Users**: Developers and power users who want a visually stunning terminal experience

## UI/UX Specification

### Window Structure
- **Main Window**: NSWindow with custom titlebar
- **Tab Bar**: Custom tab strip at top (like modern terminals)
- **Content Area**: Terminal view with optional split panes
- **Toolbar**: Custom toolbar with quick actions
- **Bottom Bar**: Status bar showing current directory, git branch, etc.

### Visual Design

#### Color Palette (Default "Neon Night" Theme)
- **Background**: #0D0D0D (near black)
- **Foreground**: #E0E0E0 (light gray)
- **Cursor**: #00FF88 (neon green) with glow
- **Selection**: #00FF8833 (transparent green)
- **ANSI Colors**:
  - Black: #1A1A2E
  - Red: #FF6B6B
  - Green: #4ADE80
  - Yellow: #FACC15
  - Blue: #60A5FA
  - Magenta: #C084FC
  - Cyan: #22D3EE
  - White: #E0E0E0
- **Glow Effect**: 0 0 10px rgba(0, 255, 136, 0.5)

#### Typography
- **Terminal Font**: JetBrains Mono (bundled fallback: SF Mono)
- **Font Size**: 13pt default (adjustable 10-24pt)
- **Line Height**: 1.2
- **Letter Spacing**: 0

#### Spacing System
- **Window Padding**: 0 (terminal fills window)
- **Tab Bar Height**: 38px
- **Status Bar Height**: 24px
- **Cursor Blink**: 530ms interval

### Views & Components

#### Tab Bar
- Tab items with icon + title
- Active tab indicator (bottom border, neon green)
- Close button on hover
- "+" button to add new tab
- Tab overflow menu for many tabs
- Drag to reorder tabs

#### Terminal View
- Custom rendered text with glow support
- Block cursor (configurable: block, underline, bar)
- Cursor blink animation
- Selection with highlight color
- Link detection (URLs, file paths)
- Image preview support (inline)
- Scrollback buffer: 10,000 lines

#### Split Panes
- Horizontal/Vertical splits
- Drag to resize
- Double-click divider to equalize
- Keyboard navigation (Cmd+Shift+[ or ])

#### Status Bar
- Current working directory (truncated with ~)
- Git branch name (if in repo)
- Git status indicators (modified, staged, etc.)
- SSH indicator if remote
- Timer/stopwatch option

#### Command Palette (Cmd+Shift+P)
- Fuzzy search for commands
- Recent commands
- Settings shortcuts

#### Search Overlay (Cmd+F)
- Regex support
- Case sensitivity toggle
- Match highlighting in terminal
- Navigate between matches

### Interactive Behaviors
- **Tab switching**: Click or Cmd+1-9
- **Pane navigation**: Cmd+Shift+[ ] or Cmd+Alt+Arrows
- **Copy**: Cmd+C (if selection) or auto-copy on selection
- **Paste**: Cmd+V or middle-click
- **Scroll**: PgUp/PgDn or trackpad
- **Clear**: Cmd+K or clear command

## Functionality Specification

### Core Features
1. **Shell Integration**: Support for zsh, bash, fish, sh
2. **Multiple Tabs**: Unlimited tabs with Cmd+T
3. **Split Panes**: Up to 4 panes per tab
4. **Session Management**: Restore tabs on launch
5. **Profiles**: Different shell configs, colors, fonts
6. **Environment Variables**: Custom env vars per profile

### Shell Features
- PTY-based terminal emulation
- Proper signal handling (SIGINT, SIGTSTP, etc.)
- Job control support
- TTY resize handling

### Advanced Features
- **Paste history**: Last 50 pastes
- **Command history**: Searchable (up arrow)
- **Broadcast input**: Type in all panes simultaneously
- **Jump to marker**: Mark positions and jump back
- **Unicode support**: Full UTF-8 including emoji

### Settings
- Theme selection (built-in + custom)
- Font size slider
- Cursor style
- Bell style (visual, audio, none)
- Scrollback lines
- Shell path customization

## Technical Architecture

### Structure
```
VibeTerminal/
├── App/
│   ├── VibeTerminalApp.swift      # App entry point
│   └── AppDelegate.swift          # AppKit delegate
├── Views/
│   ├── MainWindow.swift           # Main window controller
│   ├── TerminalView.swift         # Terminal rendering
│   ├── TabBar.swift               # Tab bar
│   ├── StatusBar.swift            # Bottom status
│   ├── CommandPalette.swift       # Cmd+Shift+P
│   └── SearchOverlay.swift        # Search UI
├── Terminal/
│   ├── TerminalSession.swift      # Shell process
│   ├── TerminalBuffer.swift       # Text buffer
│   ├── TerminalRenderer.swift     # Text drawing
│   └── ANSI Parser.swift          # Escape sequence parsing
├── Models/
│   ├── TerminalTheme.swift        # Color themes
│   ├── TerminalProfile.swift      # Shell profiles
│   └── Settings.swift             # App settings
└── Resources/
    └── Assets.xcassets            # Icons, fonts
```

### Dependencies
- **SwiftTerm**: For terminal emulation (or implement custom PTY)
- No other external dependencies - keep it native

## Acceptance Criteria
1. App launches with terminal window
2. Shell runs and responds to input
3. Multiple tabs work correctly
4. Split panes function properly
5. Theme colors render correctly
6. Cursor blinks and shows glow
7. Selection works with visual feedback
8. Search finds and highlights text
9. Settings persist across launches
10. Keyboard shortcuts all work