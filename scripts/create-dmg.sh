#!/bin/bash
# Create DMG installer for VibeTerminal (macOS)
# Run this AFTER successful build

set -e

PROJECT_NAME="VibeTerminal"
BUILD_DIR="./build"
DMG_OUTPUT="./dist"

echo "=== Creating DMG Installer ==="

APP_PATH="$BUILD_DIR/DerivedData/Build/Products/Release/$PROJECT_NAME.app"

if [ ! -d "$APP_PATH" ]; then
    echo "Error: App not found at $APP_PATH"
    echo "Run build.sh first!"
    exit 1
fi

# Create output directory
mkdir -p "$DMG_OUTPUT"

# Create DMG
echo "Creating DMG..."
hdiutil create -volname "$PROJECT_NAME" \
    -srcfolder "$APP_PATH" \
    -ov \
    -format UDZO \
    "$DMG_OUTPUT/$PROJECT_NAME.dmg"

echo ""
echo "=== DMG Created ==="
echo "Location: $DMG_OUTPUT/$PROJECT_NAME.dmg"