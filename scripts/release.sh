#!/usr/bin/env bash
set -e

# scripts/release.sh - Version bumper and release tagger

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NEW_VERSION="$1"

if [ -z "$NEW_VERSION" ]; then
  CURRENT_VERSION=$(node -p "require('./manifest.json').version")
  echo "Current version is: $CURRENT_VERSION"
  read -p "Enter new version (e.g. 1.0.1): " NEW_VERSION
fi

if [ -z "$NEW_VERSION" ]; then
  echo "Error: Version cannot be empty."
  exit 1
fi

# Remove leading 'v' if provided
NEW_VERSION="${NEW_VERSION#v}"

echo "Preparing release for version: v$NEW_VERSION"

# 1. Update manifest.json
node -e "
  const fs = require('fs');
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  manifest.version = '$NEW_VERSION';
  fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"

# 2. Update package.json
if [ -f "package.json" ]; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

# 3. Update popup.html badge if present
if [ -f "popup/popup.html" ]; then
  sed -i '' "s|<span class=\"badge\">v[0-9.]*</span>|<span class=\"badge\">v$NEW_VERSION</span>|g" popup/popup.html
fi

# 4. Build the zip locally
bash scripts/build-zip.sh

# 5. Commit and tag
git add manifest.json package.json popup/popup.html
git commit -m "chore: release v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "==========================================================="
echo " Release v$NEW_VERSION created successfully!"
echo " Package created at: dist/quick-right-click-v$NEW_VERSION.zip"
echo " Git tag created: v$NEW_VERSION"
echo "==========================================================="
echo ""
echo "To publish to GitHub and trigger the automated Release workflow, run:"
echo "  git push origin main --tags"
echo ""
