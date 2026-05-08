# VibeTerminal Build Guide

This directory contains the Electron version of VibeTerminal which can build for **macOS**, **Linux**, and **Windows**.

## Quick Start (macOS)

```bash
cd /path/to/VibeTerminal

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for macOS (creates .dmg)
npm run build:mac
```

## Build Commands

| Platform | Command | Output |
|----------|---------|--------|
| macOS | `npm run build:mac` | `.dmg`, `.zip` |
| Linux | `npm run build:linux` | `.deb` |
| Windows | `npm run build:win` | `.exe` (NSIS), `.msi` |

## Requirements

### macOS
- macOS 10.15+
- Node.js 18+
- Xcode Command Line Tools

### Linux
- Ubuntu 20.04+ or similar
- Node.js 18+
- libnss3, libatk-bridge2.0-0, libdrm2, libxkbcommon0, libgbm1, libasound2

### Windows
- Windows 10+
- Node.js 18+
- Visual Studio Build Tools

## Cross-Platform Builds with GitHub Actions

The `.github/workflows/build.yml` file automatically builds for all platforms when you push a tag:

```bash
# Create a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will create:
- **macOS**: `VibeTerminal-1.0.0.dmg`
- **Windows**: `VibeTerminal-1.0.0-setup.exe`, `VibeTerminal-1.0.0.msi`
- **Linux**: `vibeterminal_1.0.0_amd64.deb`

## Local Build Without GitHub

### Building on Linux (for Linux .deb)

```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2

# Build
npm install
npx electron-builder --linux deb
```

### Building on Windows (for .exe/.msi)

```powershell
# In PowerShell
npm install
npm run build:win
```

### Building on macOS (for .dmg)

```bash
npm install
npm run build:mac
```

## Output Files

Built installers are placed in the `dist/` folder:
- `dist/VibeTerminal-1.0.0.dmg` - macOS disk image
- `dist/VibeTerminal-1.0.0-setup.exe` - Windows installer
- `dist/VibeTerminal-1.0.0.msi` - Windows MSI
- `dist/vibeterminal_1.0.0_amd64.deb` - Linux package

## Troubleshooting

### node-pty build failure
If node-pty fails to build, try:
```bash
npm rebuild node-pty
```

### Icon conversion errors
If you see icon conversion errors, ensure you have the required graphics libraries or remove the icon configuration from package.json.

### Missing libraries on Linux
```bash
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libgbm1 \
  libasound2 \
  libx11-xcb1 \
  libcups2
```