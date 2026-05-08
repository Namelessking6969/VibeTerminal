# Building VibeTerminal

## macOS (Primary Platform)

### Prerequisites
- macOS 12.0 or later
- Xcode 15.0 or later

### Build Steps

```bash
# Navigate to project directory
cd /path/to/VibeTerminal

# Run the build script
chmod +x scripts/build.sh
./scripts/build.sh

# Create DMG installer
chmod +x scripts/create-dmg.sh
./scripts/create-dmg.sh

# Or create PKG installer
chmod +x scripts/create-pkg.sh
./scripts/create-pkg.sh
```

### Output Files (macOS)
- **DMG**: `dist/VibeTerminal.dmg` - Disk image for distribution
- **PKG**: `dist/VibeTerminal.pkg` - Installer package
- **APP**: `build/DerivedData/Build/Products/Release/VibeTerminal.app` - Direct app bundle

---

## Linux (.deb) & Windows (.msi)

This SwiftUI app **cannot** be built for Linux or Windows from macOS. Native Swift doesn't support cross-compilation to these platforms.

### Option 1: Flutter (Recommended for Cross-Platform)
To build for Linux and Windows, you would need to rewrite using Flutter:

```bash
# Create new Flutter project
flutter create --platforms=linux,windows,macos vibe_terminal

# Dependencies in pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  xterm: ^4.0.0        # Terminal emulator
  process_run: ^1.0.0  # Process handling

# Build commands
flutter build linux    # .deb equivalent
flutter build windows  # .exe/.msi equivalent
flutter build macos    # .dmg
```

### Option 2: Electron (Alternative)
Using JavaScript/TypeScript:

```bash
# Create Electron app
npm init -y
npm install electron electron-builder

# Build for different platforms
electron-builder --linux deb    # .deb
electron-builder --win msi      # .msi
electron-builder --mac dmg     # .dmg
```

### Option 3: Tauri (Rust-based, Lightweight)
```bash
# Create Tauri app
npm create tauri-app@latest

# Build
npm run tauri build -- --target x86_64-unknown-linux-gnu  # Linux
npm run tauri build -- --target x86_64-pc-windows-msvc    # Windows
npm run tauri build -- --target x86_64-apple-darwin       # macOS
```

---

## Summary

| Platform | Installer | Can Build on Mac? |
|----------|-----------|-------------------|
| macOS | .dmg, .pkg | ✅ Yes |
| Linux | .deb | ❌ No (requires rewrite) |
| Windows | .msi | ❌ No (requires rewrite) |

**Recommendation**: If you need Linux and Windows support, consider rewriting the terminal using Flutter with the `xterm` package, which provides similar terminal emulation capabilities.