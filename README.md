# Quick Right Click

<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="Quick Right Click Logo" />
</p>

<p align="center">
  <strong>A clean, customizable context menu for Chromium browsers that coexists smoothly with mouse gesture extensions.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue.svg" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Platform-Chrome%20%7C%20Brave%20%7C%20Edge%20%7C%20Arc-brightgreen.svg" alt="Chromium" />
  <img src="https://img.shields.io/badge/Dependencies-None-orange.svg" alt="No Dependencies" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License" />
</p>

---

## Why I Made This

In Chromium browsers (Chrome, Brave, Edge, Arc), mouse gesture extensions need to intercept right-clicks to track mouse movement. This often creates a frustrating conflict:
- Right-click dragging for gestures can accidentally trigger the browser's default context menu.
- Or, gesture extensions suppress the right-click menu entirely, making it hard to access normal context actions.

**Quick Right Click** solves this by listening for mouse movement:
- **Stationary Click / Tap:** Opens a clean, responsive context menu.
- **Mouse Drag ($\ge 5\text{px}$):** Suppresses the menu immediately, allowing your gesture extension to execute gestures without interference.

---

## Key Features

- **Gesture Extension Friendly:** Dragging with the right mouse button lets your mouse gestures trigger freely without opening a menu over your gesture.
- **Context-Aware Actions:** Shows relevant options based on what was clicked (images, links, selected text, editable fields, or open page area).
- **Image Tools:** Direct 1-click download, "Save Image As...", image copying, and "Open Image in New Tab" (placed next to current tab).
- **Clipboard & Pasting:** Supports standard text pasting and pasting images/screenshots into web chat inputs (Discord, WhatsApp, Slack, GitHub).
- **Search & AI Mode:** Quick Google search and direct link to Google AI Mode search for selected text or general queries.
- **Multi-Container Page Scrolling:** Smoothly scrolls the page or nested scroll containers in Single Page Applications (Discord, Reddit, Twitter/X, Slack).
- **Lock Background Scroll Toggle:** Option to prevent background webpage scrolling while the menu is open.
- **Dark Reader Compatible:** Protected against external filter inversions and stylesheet modifications.
- **Shadow DOM Encapsulation:** Isolated styles that do not interfere with webpage styling.
- **Keyboard Navigation:** Navigate with <kbd>↑</kbd> / <kbd>↓</kbd> arrows, press <kbd>Enter</kbd> to execute, and <kbd>Esc</kbd> to close.

---

## Context Menu Actions

### Images
- Open Image in New Tab *(adjacent to current tab)*
- Download Image *(direct 1-click download)*
- Save Image As...
- Copy Image *(copies PNG data to clipboard)*
- Copy Image Address
- Link options *(if the image is inside a link)*

### Links
- Open Link in New Tab *(adjacent to current tab)*
- Open Link in New Window
- Open Link in Incognito Window
- Copy Link Address
- Share Link...

### Text Selection
- Copy (`⌘C` / `Ctrl+C`)
- Search Google for selected text
- Ask with AI Mode

### Text Inputs & Editable Fields
- Cut / Copy / Paste *(supports both text and image pasting)*
- Paste and Go *(navigates in current tab)*
- Select All

### Page Area
- Back / Forward *(disabled when no history exists)*
- Reload
- Ask with AI Mode
- New Tab / Close Tab / Downloads
- Copy Page URL / Share
- Scroll to Top / Scroll to Bottom

---

## Installation

### Load Unpacked in Chrome / Chromium

1. Clone or download this repository:
   ```bash
   git clone https://github.com/naitiktuxx/quickright.git
   ```
2. Open your browser and go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right corner).
4. Click **Load unpacked** and select the `quick-right-click` folder.

Or download the pre-packaged `.zip` from the [Releases](https://github.com/naitiktuxx/quickright/releases) page, extract it, and load unpacked.

---

## Options & Customization

Click the extension icon in the browser toolbar to configure:

- **Trigger Mode:**
  - *Stationary Tap (Default):* Opens on click; dragging allows gestures.
  - *Hold / Long Press:* Hold right-click for 250ms.
  - *Double Right-Click:* Rapid double right-click.
- **Gesture Drag Sensitivity:** Adjust movement tolerance between `2px` and `16px`.
- **Theme:** Choose between System Auto, Dark Glass, or Light Glass.
- **Lock Background Scroll:** Prevent background page scrolling while the menu is open.
- **Disable Animations:** Instant menu opening with zero transitions.

---

## License

[MIT](LICENSE)
