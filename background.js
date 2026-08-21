// background.js - Optimized Background Service Worker for Quick Right Click

const DEFAULT_SETTINGS = {
  theme: 'dark',
  menuSize: 'compact',
  triggerMode: 'tap',
  longPressMs: 250,
  movementThreshold: 6,
  lockScrollWhenOpen: true,
  disableAnimations: true,
  aiProvider: 'chatgpt',
  aiOpenMode: 'sidepanel'
};

// Setup Declarative Net Request rules to unblock AI iframes in side panel
async function setupDnrRules() {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  const AI_DOMAINS = [
    'google.com',
    'chatgpt.com',
    'openai.com',
    'claude.ai',
    'anthropic.com',
    'perplexity.ai',
    'grok.com',
    'x.com'
  ];

  const RULES = [
    {
      id: 1001,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
          { header: 'frame-options', operation: 'remove' }
        ]
      },
      condition: {
        requestDomains: AI_DOMAINS,
        resourceTypes: ['sub_frame']
      }
    }
  ];

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1001],
      addRules: RULES
    });
  } catch (e) {
    console.warn('[Quick Right Click] Error setting up DNR rules:', e);
  }
}

// Initialize settings & DNR rules on installation
chrome.runtime.onInstalled.addListener(async () => {
  setupDnrRules().catch(() => {});
  try {
    const existing = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
    const toSet = {};
    let needsUpdate = false;

    for (const [key, defaultVal] of Object.entries(DEFAULT_SETTINGS)) {
      if (existing[key] === undefined) {
        toSet[key] = defaultVal;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await chrome.storage.sync.set(toSet);
    }
  } catch (err) {
    console.error('[Quick Right Click] Error initializing settings:', err);
  }
});

chrome.runtime.onStartup?.addListener(() => {
  setupDnrRules().catch(() => {});
});
setupDnrRules().catch(() => {});

// AI Provider URL Builder
function getAiUrl(provider, query) {
  const q = query ? encodeURIComponent(query.trim()) : '';
  switch (provider) {
    case 'chatgpt':
      return q ? `https://chatgpt.com/?q=${q}` : 'https://chatgpt.com/';
    case 'claude':
      return q ? `https://claude.ai/new?q=${q}` : 'https://claude.ai/';
    case 'gemini':
      return q ? `https://gemini.google.com/app?q=${q}` : 'https://gemini.google.com/app';
    case 'perplexity':
      return q ? `https://www.perplexity.ai/search?q=${q}` : 'https://www.perplexity.ai/';
    case 'grok':
      return q ? `https://grok.com/?q=${q}` : 'https://grok.com/';
    case 'google_ai':
    default:
      return q ? `https://www.google.com/search?q=${q}&udm=50&aep=11&atvm=2` : 'https://www.google.com/search?udm=50&aep=11&atvm=2';
  }
}

// Side-by-Side Split Window Creator
async function openSplitWindow(url, currentTab) {
  try {
    let currentWin = null;
    if (currentTab?.windowId) {
      try {
        currentWin = await chrome.windows.get(currentTab.windowId);
      } catch (e) {}
    }
    if (!currentWin) {
      currentWin = await chrome.windows.getCurrent();
    }

    const curWidth = currentWin?.width || 1280;
    const curHeight = currentWin?.height || 800;
    const curTop = currentWin?.top || 0;
    const curLeft = currentWin?.left || 0;
    const halfWidth = Math.max(480, Math.floor(curWidth / 2));

    if (currentWin?.id) {
      if (currentWin.state === 'maximized' || currentWin.state === 'fullscreen') {
        await chrome.windows.update(currentWin.id, {
          state: 'normal',
          left: curLeft,
          top: curTop,
          width: halfWidth,
          height: curHeight
        });
      } else {
        await chrome.windows.update(currentWin.id, {
          left: curLeft,
          top: curTop,
          width: halfWidth,
          height: curHeight
        });
      }
    }

    return chrome.windows.create({
      url: url,
      left: curLeft + halfWidth,
      top: curTop,
      width: halfWidth,
      height: curHeight,
      focused: true
    });
  } catch (err) {
    console.warn('[Quick Right Click] Split window fallback to window creation:', err);
    return chrome.windows.create({ url, focused: true });
  }
}

// Action Handlers Map for Clean Message Dispatching
const messageHandlers = {
  async OPEN_TAB(message, currentTab) {
    return chrome.tabs.create({
      url: message.url || undefined,
      active: message.active !== undefined ? message.active : true,
      openerTabId: currentTab?.id,
      index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
    });
  },

  async OPEN_DOWNLOADS(message, currentTab) {
    return chrome.tabs.create({
      url: 'chrome://downloads',
      active: true,
      openerTabId: currentTab?.id,
      index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
    });
  },

  async OPEN_WINDOW(message) {
    return chrome.windows.create({
      url: message.url ? [message.url] : undefined
    });
  },

  async OPEN_INCOGNITO(message) {
    return chrome.windows.create({
      incognito: true,
      url: message.url ? [message.url] : undefined
    });
  },

  async CLOSE_TAB(message, currentTab) {
    if (currentTab?.id) {
      await chrome.tabs.remove(currentTab.id);
    }
  },

  async DUPLICATE_TAB(message, currentTab) {
    if (currentTab?.id) {
      await chrome.tabs.duplicate(currentTab.id);
    }
  },

  async DOWNLOAD_URL(message) {
    if (message.url) {
      return chrome.downloads.download({
        url: message.url,
        saveAs: message.saveAs !== undefined ? Boolean(message.saveAs) : true
      });
    }
  },

  async SEARCH_GOOGLE(message, currentTab) {
    if (message.query) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(message.query.trim())}`;
      return chrome.tabs.create({
        url,
        active: true,
        openerTabId: currentTab?.id,
        index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
      });
    }
  },

  async OPEN_AI(message, currentTab) {
    const provider = message.provider || 'google_ai';
    const mode = message.openMode || 'sidepanel';
    const query = message.query || '';
    const url = message.url || getAiUrl(provider, query);

    if (mode === 'sidepanel') {
      if (chrome.sidePanel?.open && currentTab?.windowId) {
        // Save target URL & provider in storage asynchronously
        chrome.storage.local.set({
          pendingAiUrl: url,
          pendingAiProvider: provider,
          pendingAiQuery: query
        }).catch(() => {});

        try {
          // Open side panel synchronously within the user gesture window
          await chrome.sidePanel.open({ windowId: currentTab.windowId });
          chrome.runtime.sendMessage({
            type: 'SIDEPANEL_NAVIGATE',
            provider,
            query,
            url
          }).catch(() => {});
          return { success: true, mode: 'sidepanel' };
        } catch (err) {
          console.warn('[Quick Right Click] sidePanel.open failed:', err);
          // If sidePanel fails, open in a new tab instead of resizing windows
          return chrome.tabs.create({
            url,
            active: true,
            openerTabId: currentTab?.id,
            index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
          });
        }
      }

      // Fallback to new tab if sidePanel API is unsupported
      return chrome.tabs.create({
        url,
        active: true,
        openerTabId: currentTab?.id,
        index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
      });
    } else if (mode === 'split') {
      return openSplitWindow(url, currentTab);
    } else if (mode === 'window') {
      return chrome.windows.create({ url, focused: true });
    } else {
      return chrome.tabs.create({
        url,
        active: true,
        openerTabId: currentTab?.id,
        index: currentTab?.index !== undefined ? currentTab.index + 1 : undefined
      });
    }
  }
};

// Central Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message?.type];

  if (!handler) {
    sendResponse({ success: false, error: `Unknown message type: ${message?.type}` });
    return false;
  }

  handler(message, sender.tab)
    .then((result) => {
      sendResponse({ success: true, data: result });
    })
    .catch((err) => {
      console.error(`[Quick Right Click] Error handling ${message?.type}:`, err);
      sendResponse({ success: false, error: err.message });
    });

  return true; // Keep channel open for async response
});
