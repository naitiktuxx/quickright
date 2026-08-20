// background.js - Background Service Worker for Quick Right Click

chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    theme: 'auto',
    menuSize: 'medium',
    triggerMode: 'tap',
    longPressMs: 250,
    movementThreshold: 6,
    showTopBar: true
  };
  const existing = await chrome.storage.sync.get(Object.keys(defaults));
  await chrome.storage.sync.set({ ...defaults, ...existing });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const currentTab = sender.tab;

  (async () => {
    try {
      switch (message.type) {
        case 'OPEN_TAB': {
          await chrome.tabs.create({
            url: message.url || undefined,
            active: message.active !== undefined ? message.active : true,
            openerTabId: currentTab?.id,
            index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
          });
          sendResponse({ success: true });
          break;
        }

        case 'OPEN_DOWNLOADS': {
          await chrome.tabs.create({
            url: 'chrome://downloads',
            active: true,
            openerTabId: currentTab?.id,
            index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
          });
          sendResponse({ success: true });
          break;
        }

        case 'OPEN_WINDOW': {
          await chrome.windows.create({
            url: message.url ? [message.url] : undefined
          });
          sendResponse({ success: true });
          break;
        }

        case 'OPEN_INCOGNITO': {
          await chrome.windows.create({
            incognito: true,
            url: message.url ? [message.url] : undefined
          });
          sendResponse({ success: true });
          break;
        }

        case 'CLOSE_TAB': {
          if (currentTab?.id) {
            await chrome.tabs.remove(currentTab.id);
          }
          sendResponse({ success: true });
          break;
        }

        case 'DUPLICATE_TAB': {
          if (currentTab?.id) {
            await chrome.tabs.duplicate(currentTab.id);
          }
          sendResponse({ success: true });
          break;
        }

        case 'DOWNLOAD_URL': {
          if (message.url) {
            await chrome.downloads.download({
              url: message.url,
              saveAs: message.saveAs !== undefined ? Boolean(message.saveAs) : true
            });
          }
          sendResponse({ success: true });
          break;
        }

        case 'SEARCH_GOOGLE': {
          if (message.query) {
            const url = `https://www.google.com/search?q=${encodeURIComponent(message.query.trim())}`;
            await chrome.tabs.create({
              url,
              active: true,
              openerTabId: currentTab?.id,
              index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
            });
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message' });
      }
    } catch (err) {
      console.error('[Quick Right Click]', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
