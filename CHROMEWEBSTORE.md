# Chrome Web Store Listing: Native Right-Click Menu for Chromium

## Basic Information
- **Title:** Native Right-Click Menu for Chromium
- **Summary / Short Description:** Authentic Chromium-styled right-click context menu that coexists smoothly with mouse gesture extensions.
- **Category:** Productivity / Workflow
- **Version:** 1.0.0

## Detailed Description
Get an authentic Chromium-styled context menu on right-click without breaking or disabling your favorite mouse gesture extension.

### Key Features
- **Chromium Native Design:** Pixel-perfect Chrome Refresh UI with quick navigation action buttons (Back, Forward, Reload, Bookmark), dark & light mode support, and keyboard shortcuts.
- **Gesture Extension Coexistence:** Uses smart distance detection. Quick stationary taps open the context menu immediately, while right-click drags pass through to your gesture extension.
- **Context-Aware:** Automatically adapts items based on what you clicked (text selections, web links, images, editable textboxes, or general pages).
- **Shadow DOM Isolation:** Renders in a dedicated Shadow Root so webpage CSS never distorts the context menu layout.
- **Customizable:** Choose between Quick Tap, Long-Press (250ms), or Double Right-Click trigger modes via the extension popup.

## Permissions Justification
- `tabs`: Required to open new tabs, duplicate tabs, reload tabs, and open search results requested from the context menu.
- `storage`: Required to sync user preferences (trigger mode, theme, top bar toggles) across browser sessions.
- `clipboardWrite`: Required to support "Copy", "Copy link address", and "Copy image address" actions.
- `downloads`: Required to support "Save link as..." and "Save image as..." actions.
- `bookmarks`: Required to allow bookmarking the active page directly from the context menu's star button.

## Version History
- **v1.0.0** (Initial Release): Complete native Chromium-style context menu with Shadow DOM encapsulation and mouse gesture coexistence support.
