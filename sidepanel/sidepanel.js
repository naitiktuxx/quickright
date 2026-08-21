// sidepanel.js - Live Direct Embedded AI Website Controller

document.addEventListener('DOMContentLoaded', async () => {
  const aiFrame = document.getElementById('aiFrame');
  const activeAiName = document.getElementById('activeAiName');
  const providerSelectorBtn = document.getElementById('providerSelectorBtn');
  const providerDropdownWrapper = document.querySelector('.provider-dropdown-wrapper');
  const providerMenu = document.getElementById('providerMenu');
  const menuItems = document.querySelectorAll('.menu-item');
  const reloadBtn = document.getElementById('reloadBtn');
  const popoutBtn = document.getElementById('popoutBtn');
  const closeBtn = document.getElementById('closeBtn');
  const loadingBar = document.getElementById('loadingBar');

  const PROVIDER_NAMES = {
    google_ai: 'AI Mode',
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    grok: 'Grok'
  };

  let currentProvider = 'google_ai';
  let currentQuery = '';
  let currentUrl = '';

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

  function startLoading() {
    if (!loadingBar) return;
    loadingBar.className = 'loading-bar active';
  }

  function finishLoading() {
    if (!loadingBar) return;
    loadingBar.className = 'loading-bar done';
    setTimeout(() => {
      loadingBar.className = 'loading-bar';
    }, 400);
  }

  function navigateTo(provider, query, customUrl) {
    currentProvider = provider || 'google_ai';
    currentQuery = query !== undefined ? query : currentQuery;
    const url = customUrl || getAiUrl(currentProvider, currentQuery);
    currentUrl = url;

    if (activeAiName) {
      activeAiName.textContent = PROVIDER_NAMES[currentProvider] || 'AI Assistant';
    }

    menuItems.forEach(item => {
      item.classList.toggle('active', item.dataset.ai === currentProvider);
    });

    startLoading();
    aiFrame.src = url;
  }

  aiFrame.addEventListener('load', () => {
    finishLoading();
  });

  // Load initial provider & pending navigation from storage
  try {
    const syncData = await chrome.storage.sync.get({ aiProvider: 'chatgpt' });
    currentProvider = syncData.aiProvider || 'chatgpt';

    const localData = await chrome.storage.local.get(['pendingAiUrl', 'pendingAiProvider', 'pendingAiQuery']);
    if (localData.pendingAiUrl) {
      navigateTo(localData.pendingAiProvider || currentProvider, localData.pendingAiQuery || '', localData.pendingAiUrl);
      chrome.storage.local.remove(['pendingAiUrl', 'pendingAiProvider', 'pendingAiQuery']);
    } else {
      navigateTo(currentProvider, '');
    }
  } catch (err) {
    console.warn('[Quick Right Click SidePanel]', err);
    navigateTo('chatgpt', '');
  }

  // Listen for live navigation commands from background or context menu
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'SIDEPANEL_NAVIGATE' || message?.type === 'SIDEPANEL_QUERY') {
      navigateTo(message.provider, message.query, message.url);
    }
  });

  // Dropdown toggle
  providerSelectorBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    providerDropdownWrapper?.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    providerDropdownWrapper?.classList.remove('open');
  });

  // Menu item selection
  menuItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      providerDropdownWrapper?.classList.remove('open');
      const newProvider = item.dataset.ai;
      if (newProvider) {
        navigateTo(newProvider, currentQuery);
        await chrome.storage.sync.set({ aiProvider: newProvider });
      }
    });
  });

  // Reload action
  reloadBtn?.addEventListener('click', () => {
    startLoading();
    try {
      aiFrame.src = currentUrl || aiFrame.src;
    } catch (e) {
      navigateTo(currentProvider, currentQuery);
    }
  });

  // Pop-out action (open in full browser tab and close side panel)
  popoutBtn?.addEventListener('click', () => {
    const url = currentUrl || getAiUrl(currentProvider, currentQuery);
    chrome.tabs.create({ url, active: true }, () => {
      window.close();
    });
  });

  // Close side panel
  closeBtn?.addEventListener('click', () => {
    window.close();
  });
});
