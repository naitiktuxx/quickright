#!/usr/bin/env bash
set -e

# scripts/build-zip.sh - Generate installable Chrome extension ZIP

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Extract version from manifest.json
VERSION=$(node -p "require('./manifest.json').version")
DIST_DIR="$ROOT_DIR/dist"
ZIP_NAME="quick-right-click-v${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

mkdir -p "$DIST_DIR"
rm -f "$ZIP_PATH"

echo "Building installable extension package: $ZIP_NAME"

# Files to include in the extension distribution
zip -r "$ZIP_PATH" \
  manifest.json \
  background.js \
  content.js \
  menu.css \
  popup \
  sidepanel \
  icons \
  -x "*.DS_Store*" -x "*__MACOSX*"

echo "Successfully built: $ZIP_PATH"
ls -lh "$ZIP_PATH"
