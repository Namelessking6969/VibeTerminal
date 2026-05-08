#!/bin/bash
# VibeTerminal Build Script for macOS
# Run this on a Mac with Xcode installed

set -e

PROJECT_NAME="VibeTerminal"
SCHEME="VibeTerminal"
CONFIGURATION="Release"
BUILD_DIR="./build"

echo "=== VibeTerminal Build Script ==="
echo ""

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "Error: Xcode not found. Please install Xcode from App Store."
    exit 1
fi

# Clean previous builds
echo "[1/4] Cleaning previous builds..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Generate Xcode project
echo "[2/4] Generating Xcode project..."
xcodegen generate

# Build the project
echo "[3/4] Building $SCHEME..."
xcodebuild -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -derivedDataPath "$BUILD_DIR/DerivedData" \
    -destination 'platform=macOS' \
    build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "[4/4] Build succeeded!"
    echo ""
    echo "Built app location: $BUILD_DIR/DerivedData/Build/Products/Release/$SCHEME.app"
else
    echo "Build failed!"
    exit 1
fi

echo ""
echo "=== Build Complete ==="
echo "App bundle: $BUILD_DIR/DerivedData/Build/Products/Release/$SCHEME.app"