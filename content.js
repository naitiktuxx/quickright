// content.js - High-Performance Chromium Context Menu (Optimized & Hardened)

(() => {
  'use strict';

  if (window.__QUICK_RIGHT_CLICK_INJECTED__) return;
  window.__QUICK_RIGHT_CLICK_INJECTED__ = true;

  // Platform & Key Detection (Evaluated once)
  const IS_MAC = /Mac|iPod|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '') || /Macintosh|Mac OS X/.test(navigator.userAgent || '');
  const CMD_KEY = IS_MAC ? '⌘' : 'Ctrl+';
  const MOD_KEY = CMD_KEY;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Default Settings
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

  const AI_PROVIDERS = {
    google_ai: { name: 'AI Mode', label: 'Ask with AI Mode' },
    chatgpt: { name: 'ChatGPT', label: 'Ask with ChatGPT' },
    claude: { name: 'Claude', label: 'Ask with Claude' },
    gemini: { name: 'Gemini', label: 'Ask with Gemini' },
    perplexity: { name: 'Perplexity', label: 'Ask with Perplexity' },
    grok: { name: 'Grok', label: 'Ask with Grok' }
  };

  function getAiConfig(provider) {
    return AI_PROVIDERS[provider] || AI_PROVIDERS.google_ai;
  }

  let settings = { ...DEFAULT_SETTINGS };

  // Safe storage initialization & live synchronization
  try {
    chrome.storage?.sync?.get(null, (res) => {
      if (res && typeof res === 'object') {
        settings = { ...settings, ...res };
      }
    });

    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (area === 'sync') {
        for (const [key, val] of Object.entries(changes)) {
          settings[key] = val.newValue;
        }
        updateThemeClass();
      }
    });
  } catch (e) {
    console.warn('[Quick Right Click] Storage unavailable:', e);
  }

  // Safe background messaging helper
  function sendBgMessage(msg, callback) {
    try {
      if (!chrome.runtime?.id) {
        showToast('Please refresh the page');
        return;
      }
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Quick Right Click]', chrome.runtime.lastError.message);
        }
        if (callback) callback(response);
      });
    } catch (err) {
      console.warn('[Quick Right Click]', err);
      showToast('Please refresh the page');
    }
  }

  // Static SVG Icon Definitions (Allocated once at module scope)
  const MENU_ICONS = {
    openInNew: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59L7.76 14.83l1.41 1.41L19 6.41V10h2V3z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2z',
    save: 'M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5zM8 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
    copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    window: 'M19 3H5c-1.11 0-2 .89-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16H5V8h14v11zm0-13H5V5h14v1z',
    incognito: 'M9.5 13a3.5 3.5 0 1 0 .001 7.001A3.5 3.5 0 0 0 9.5 13zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM20.5 13a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM22 11l-2.5-5h-15L2 11h2l1-3h14l1 3h2z',
    share: 'M18 16c-.76 0-1.44.3-1.96.77l-7.13-4.15c.05-.2.09-.41.09-.62s-.04-.42-.09-.62l7.05-4.11A2.99 2.99 0 1 0 15 5c0 .21.04.42.09.62L8.04 9.73A2.99 2.99 0 1 0 6 15c.76 0 1.44-.3 1.96-.77l7.13 4.15c-.05.18-.09.38-.09.58a3 3 0 1 0 3-2.96z',
    search: 'M9.5 3a6.5 6.5 0 0 0 0 13c1.61 0 3.09-.59 4.23-1.57L19.29 20 20.7 18.59l-5.56-5.56A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 0 0 9.5 3zm0 2A4.5 4.5 0 1 1 5 9.5 4.5 4.5 0 0 1 9.5 5z',
    ai: 'm12 2 1.55 5.45L19 9l-5.45 1.55L12 16l-1.55-5.45L5 9l5.45-1.55L12 2zm7 12 .85 3.15L23 18l-3.15.85L19 22l-.85-3.15L15 18l3.15-.85L19 14zM5 14l.85 3.15L9 18l-3.15.85L5 22l-.85-3.15L1 18l3.15-.85L5 14z',
    cut: 'M9.64 7.64 12 10l6-6 1.41 1.41-6 6 6 6L18 18.82l-6-6-2.36 2.36A3.5 3.5 0 1 1 8.23 13.8L10.59 11 8.23 8.2A3.5 3.5 0 1 1 9.64 7.64zM6.5 5A1.5 1.5 0 1 0 6.5 8 1.5 1.5 0 0 0 6.5 5zm0 11A1.5 1.5 0 1 0 6.5 19 1.5 1.5 0 0 0 6.5 16z',
    paste: 'M19 4h-3.18C15.4 2.84 14.3 2 13 2h-2c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-7-1c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 17H5V6h2v2h10V6h2v14z',
    selectAll: 'M3 3h6V1H3C1.9 1 1 1.9 1 3v6h2V3zm0 18v-6H1v6c0 1.1.9 2 2 2h6v-2H3zm18-2h-6v2h6c1.1 0 2-.9 2-2v-6h-2v6zM21 1h-6v2h6v6h2V3c0-1.1-.9-2-2-2zM7 7h10v10H7z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    forward: 'm12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z',
    reload: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    newTab: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 10h-4v4h-2v-4H8v-2h4V7h2v4h4v2z',
    close: 'M18.3 5.71 16.89 4.3 12 9.17 7.11 4.3 5.7 5.71 10.59 10.59 5.7 15.48l1.41 1.41L12 12l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.88z',
    downloads: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2z',
    scrollTop: 'm7.41 15.59L12 11l4.59 4.59L18 14.17l-6-6-6 6 1.41 1.42zM5 4h14v2H5z',
    scrollBottom: 'm7.41 8.41L12 13l4.59-4.59L18 9.83l-6 6-6-6 1.41-1.42zM5 18h14v2H5z'
  };

  function getMenuIcon(label) {
    if (label === 'Open Image in New Tab' || label === 'Open Link in New Tab') return MENU_ICONS.openInNew;
    if (label === 'Download Image') return MENU_ICONS.download;
    if (label === 'Save Image As...') return MENU_ICONS.save;
    if (label === 'Copy Image') return MENU_ICONS.image;
    if (label === 'Copy Image Address' || label === 'Copy Link Address' || label === 'Copy Page URL' || label === 'Copy') return MENU_ICONS.copy;
    if (label === 'Open Link in New Window') return MENU_ICONS.window;
    if (label === 'Open Link in Incognito Window') return MENU_ICONS.incognito;
    if (label === 'Share...' || label === 'Share Link...') return MENU_ICONS.share;
    if (label.startsWith('Search Google')) return MENU_ICONS.search;
    if (label.startsWith('Ask with')) return MENU_ICONS.ai;
    if (label === 'Cut') return MENU_ICONS.cut;
    if (label === 'Paste' || label === 'Paste and Go') return MENU_ICONS.paste;
    if (label === 'Select All') return MENU_ICONS.selectAll;
    if (label === 'Back') return MENU_ICONS.back;
    if (label === 'Forward') return MENU_ICONS.forward;
    if (label === 'Reload') return MENU_ICONS.reload;
    if (label === 'New Tab') return MENU_ICONS.newTab;
    if (label === 'Close Tab') return MENU_ICONS.close;
    if (label === 'Downloads') return MENU_ICONS.downloads;
    if (label === 'Scroll to Top') return MENU_ICONS.scrollTop;
    if (label === 'Scroll to Bottom') return MENU_ICONS.scrollBottom;
    return MENU_ICONS.copy;
  }

  function getShortcutHint(label) {
    if (IS_MAC) {
      switch (label) {
        case 'Back': return '⌘[';
        case 'Forward': return '⌘]';
        case 'Reload': return '⌘R';
        case 'New Tab': return '⌘T';
        case 'Close Tab': return '⌘W';
        case 'Downloads': return '⌘⇧J';
        case 'Open Link in New Window': return '⌘N';
        case 'Open Link in Incognito Window': return '⌘⇧N';
        case 'Copy':
        case 'Copy Link Address':
        case 'Copy Image Address':
        case 'Copy Page URL': return '⌘C';
        case 'Cut': return '⌘X';
        case 'Paste': return '⌘V';
        case 'Select All': return '⌘A';
        case 'Scroll to Top': return '⌘↑';
        case 'Scroll to Bottom': return '⌘↓';
        default: return null;
      }
    } else {
      // Windows & Linux
      switch (label) {
        case 'Back': return 'Alt+←';
        case 'Forward': return 'Alt+→';
        case 'Reload': return 'Ctrl+R';
        case 'New Tab': return 'Ctrl+T';
        case 'Close Tab': return 'Ctrl+W';
        case 'Downloads': return 'Ctrl+J';
        case 'Open Link in New Window': return 'Ctrl+N';
        case 'Open Link in Incognito Window': return 'Ctrl+Shift+N';
        case 'Copy':
        case 'Copy Link Address':
        case 'Copy Image Address':
        case 'Copy Page URL': return 'Ctrl+C';
        case 'Cut': return 'Ctrl+X';
        case 'Paste': return 'Ctrl+V';
        case 'Select All': return 'Ctrl+A';
        case 'Scroll to Top': return 'Home';
        case 'Scroll to Bottom': return 'End';
        default: return null;
      }
    }
  }

  function createIconSvg(pathData) {
    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.classList.add('nrc-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    icon.appendChild(path);
    return icon;
  }

  // Mouse & gesture tracking states
  let isRmbDown = false;
  let downX = 0;
  let downY = 0;
  let isDragging = false;
  let longPressTimer = null;
  let lastRmbClickTime = 0;
  let lastTarget = null;

  // Shadow DOM elements
  let menuHost = null;
  let shadowRoot = null;
  let menuWrapper = null;
  let menuContainer = null;
  let toastElement = null;
  let isMenuOpen = false;
  let focusedIndex = -1;
  let currentMenuItems = [];

  function initShadowDOM() {
    if (menuHost && shadowRoot && menuContainer) {
      if (!menuHost.isConnected) {
        const mountTarget = document.documentElement || document.body;
        if (mountTarget) mountTarget.appendChild(menuHost);
      }
      return;
    }

    const mountTarget = document.documentElement || document.body;
    if (!mountTarget) return;

    // Create root host with fixed viewport positioning
    menuHost = document.createElement('div');
    menuHost.id = 'nrc-context-menu-host';
    menuHost.setAttribute('data-darkreader-ignore', 'true');
    menuHost.classList.add('darkreader-ignore');
    menuHost.style.cssText = 'all:initial!important;position:fixed!important;top:0!important;left:0!important;width:0!important;height:0!important;overflow:visible!important;z-index:2147483647!important;pointer-events:none!important;';

    shadowRoot = menuHost.attachShadow({ mode: 'open' });

    // Link stylesheet
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('menu.css');
    shadowRoot.appendChild(styleLink);

    // Wrapper
    menuWrapper = document.createElement('div');
    menuWrapper.className = 'nrc-menu-wrapper darkreader-ignore';
    menuWrapper.setAttribute('data-darkreader-ignore', 'true');
    shadowRoot.appendChild(menuWrapper);

    // Menu container
    menuContainer = document.createElement('div');
    menuContainer.className = 'nrc-menu darkreader-ignore';
    menuContainer.setAttribute('data-darkreader-ignore', 'true');
    menuContainer.tabIndex = -1;
    menuWrapper.appendChild(menuContainer);

    // Toast
    toastElement = document.createElement('div');
    toastElement.className = 'nrc-toast darkreader-ignore';
    toastElement.setAttribute('data-darkreader-ignore', 'true');
    menuWrapper.appendChild(toastElement);

    mountTarget.appendChild(menuHost);
    setupDarkReaderShield(shadowRoot);
    updateThemeClass();
  }

  function setupDarkReaderShield(root) {
    if (!root) return;
    const purgeDarkReader = () => {
      try {
        const injected = root.querySelectorAll('style[class*="darkreader"], style[data-darkreader], link[class*="darkreader"]');
        injected.forEach(el => el.remove());
        const inlineElements = root.querySelectorAll('[data-darkreader-inline-bgcolor], [data-darkreader-inline-color], [data-darkreader-inline-border]');
        inlineElements.forEach(el => {
          el.removeAttribute('data-darkreader-inline-bgcolor');
          el.removeAttribute('data-darkreader-inline-color');
          el.removeAttribute('data-darkreader-inline-border');
        });
      } catch (e) {}
    };

    purgeDarkReader();

    try {
      const observer = new MutationObserver((mutations) => {
        let dirty = false;
        for (const m of mutations) {
          if (m.addedNodes?.length) {
            for (const n of m.addedNodes) {
              if (n.nodeType === 1 && (
                n.className?.toString().includes('darkreader') ||
                n.hasAttribute?.('data-darkreader-inline-bgcolor') ||
                (n.tagName === 'STYLE' && n.textContent?.includes('darkreader'))
              )) {
                dirty = true;
                break;
              }
            }
          }
        }
        if (dirty) purgeDarkReader();
      });

      observer.observe(root, { childList: true, subtree: true });
    } catch (e) {}
  }

  function syncFilterImmunity() {
    if (!menuHost) return;
    try {
      const htmlEl = document.documentElement;
      const isFilterMode = htmlEl.hasAttribute('data-darkreader-mode') &&
        (htmlEl.getAttribute('data-darkreader-mode') === 'filter' || htmlEl.getAttribute('data-darkreader-mode') === 'filter+');

      if (isFilterMode) {
        menuHost.style.setProperty('filter', 'invert(100%) hue-rotate(180deg)', 'important');
      } else {
        menuHost.style.setProperty('filter', 'none', 'important');
      }
    } catch (e) {}
  }

  function updateThemeClass() {
    if (!menuWrapper) return;
    const menuSize = ['compact', 'medium', 'large'].includes(settings.menuSize) ? settings.menuSize : 'medium';
    const animClass = settings.disableAnimations ? 'no-animations' : '';
    menuWrapper.className = `nrc-menu-wrapper theme-${settings.theme || 'auto'} menu-size-${menuSize} ${animClass}`.trim();
    syncFilterImmunity();
  }

  let toastTimer = null;
  function showToast(message) {
    initShadowDOM();
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastElement?.classList.remove('show');
    }, 1800);
  }

  // --- Dynamic Active Listeners Management ---
  // When menu is open, we dynamically bind scroll-blocking & keyboard navigation.
  // When menu is closed (99.99% of browsing time), 0 scroll-blocking listeners exist on window.

  function handleScrollLock(e) {
    if (!isMenuOpen) return;
    if (settings.lockScrollWhenOpen !== false) {
      const path = e.composedPath ? e.composedPath() : [];
      if (menuContainer && path.includes(menuContainer)) {
        const isScrollable = menuContainer.scrollHeight > menuContainer.clientHeight;
        if (isScrollable) return;
      }
      e.preventDefault();
    }
  }

  function handleMenuKeydown(e) {
    if (!isMenuOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentMenuItems.length > 0) {
        focusedIndex = (focusedIndex + 1) % currentMenuItems.length;
        updateFocus();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentMenuItems.length > 0) {
        focusedIndex = (focusedIndex - 1 + currentMenuItems.length) % currentMenuItems.length;
        updateFocus();
      }
      return;
    }

    if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < currentMenuItems.length) {
        e.preventDefault();
        const action = currentMenuItems[focusedIndex].action;
        closeMenu();
        if (action) action();
      }
    }
  }

  function attachOpenListeners() {
    window.addEventListener('wheel', handleScrollLock, { capture: true, passive: false });
    window.addEventListener('touchmove', handleScrollLock, { capture: true, passive: false });
    window.addEventListener('keydown', handleMenuKeydown, { capture: true });
  }

  function detachOpenListeners() {
    window.removeEventListener('wheel', handleScrollLock, { capture: true });
    window.removeEventListener('touchmove', handleScrollLock, { capture: true });
    window.removeEventListener('keydown', handleMenuKeydown, { capture: true });
  }

  function closeMenu() {
    if (!isMenuOpen || !menuContainer) return;
    detachOpenListeners();
    menuContainer.classList.remove('visible');
    menuContainer.style.visibility = 'hidden';
    menuContainer.style.left = '-9999px';
    menuContainer.style.top = '-9999px';
    isMenuOpen = false;
    focusedIndex = -1;
    currentMenuItems = [];
  }

  function updateFocus() {
    currentMenuItems.forEach((item, index) => {
      if (index === focusedIndex) {
        item.element.classList.add('focused');
        item.element.scrollIntoView({ block: 'nearest' });
      } else {
        item.element.classList.remove('focused');
      }
    });
  }

  // --- Element & Image Detection ---

  function detectImage(el) {
    if (!el) return null;
    if (el.tagName === 'IMG') return el;
    if (el.closest) {
      const directImg = el.closest('img');
      if (directImg) return directImg;
      const pic = el.closest('picture');
      if (pic) {
        return pic.querySelector('img') || null;
      }
    }
    return null;
  }

  // Comprehensive paste handler for both Images and Text
  async function handlePaste(field) {
    if (!field) return;
    field.focus();

    try {
      // Attempt rich clipboard reading (Images, Files, Text)
      if (navigator.clipboard?.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imgType = item.types.find(t => t.startsWith('image/'));
            if (imgType) {
              const blob = await item.getType(imgType);
              const file = new File([blob], 'image.png', { type: imgType });

              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);

              const pasteEvt = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dataTransfer
              });

              const allowed = field.dispatchEvent(pasteEvt);

              if (allowed && (field.isContentEditable || field.closest?.('[contenteditable="true"]'))) {
                const reader = new FileReader();
                reader.onload = () => {
                  document.execCommand('insertImage', false, reader.result);
                };
                reader.readAsDataURL(blob);
              }

              showToast('Image pasted');
              return;
            }

            if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              const text = await blob.text();
              insertText(field, text);
              showToast('Pasted');
              return;
            }
          }
        } catch (clipErr) {
          console.warn('[Quick Right Click] clipboard.read fallback to readText:', clipErr);
        }
      }

      // Fallback to text reading
      const text = await navigator.clipboard.readText();
      if (text) {
        insertText(field, text);
        showToast('Pasted');
      } else {
        showToast('Clipboard is empty');
      }
    } catch (err) {
      console.warn('[Quick Right Click] Paste failed:', err);
      showToast(`Press ${MOD_KEY}V to paste`);
    }
  }

  function insertText(el, text) {
    el.focus();
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const start = el.selectionStart !== undefined ? el.selectionStart : el.value.length;
      const end = el.selectionEnd !== undefined ? el.selectionEnd : el.value.length;
      el.setRangeText(text, start, end, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      const pasteEvt = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });
      const allowed = el.dispatchEvent(pasteEvt);
      if (allowed) {
        document.execCommand('insertText', false, text);
      }
    }
  }

  function findScrollableContainer(target) {
    let el = target;
    while (el && el !== document.body && el !== document.documentElement) {
      try {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY || style.overflow;
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && el.scrollHeight > el.clientHeight + 10) {
          return el;
        }
      } catch (e) {}
      el = el.parentElement;
    }
    return null;
  }

  function scrollToTopAction(target) {
    const container = findScrollableContainer(target);
    if (container) {
      container.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function scrollToBottomAction(target) {
    const container = findScrollableContainer(target);
    if (container) {
      container.scrollTo({ top: container.scrollHeight, left: 0, behavior: 'smooth' });
    }
    const maxScroll = Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
      document.scrollingElement?.scrollHeight || 0
    );
    if (document.scrollingElement) {
      document.scrollingElement.scrollTo({ top: maxScroll, left: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: maxScroll, left: 0, behavior: 'smooth' });
  }

  async function copyImage(url, element) {
    try {
      let blob = null;
      if (element && element.tagName === 'IMG' && element.complete && element.naturalWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = element.naturalWidth;
          canvas.height = element.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(element, 0, 0);
          blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        } catch (e) {}
      }

      if (!blob) {
        const resp = await fetch(url, { mode: 'cors' });
        const rawBlob = await resp.blob();
        if (rawBlob.type === 'image/png') {
          blob = rawBlob;
        } else {
          const bitmap = await createImageBitmap(rawBlob);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        }
      }

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Image copied to clipboard');
        return;
      }
    } catch (err) {
      console.warn('[Quick Right Click] Image copy fallback:', err);
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Image address copied');
    } catch (e) {
      showToast('Failed to copy');
    }
  }

  // --- Context Menu Rendering Engine ---

  function renderMenu(x, y, target) {
    if (window.self !== window.top && (window.innerWidth < 220 || window.innerHeight < 180)) {
      return; // Skip rendering inside tiny iframes where the menu cannot fit
    }

    initShadowDOM();

    // Ensure menuHost mounts inside active modal dialog / top layer / fullscreen container
    const activeTopLayer = (target?.closest ? target.closest('dialog, [popover]') : null) ||
                           document.fullscreenElement ||
                           document.querySelector('dialog[open], [popover]:popover-open');
    const targetMount = activeTopLayer || document.body || document.documentElement;
    if (menuHost && targetMount) {
      if (menuHost.parentElement !== targetMount || menuHost !== targetMount.lastElementChild) {
        targetMount.appendChild(menuHost);
      }
    }

    updateThemeClass();

    // 1. Text Selection detection
    const selectedText = window.getSelection()?.toString().trim();

    // Active AI Configuration
    const aiConfig = getAiConfig(settings.aiProvider);
    const aiLabel = aiConfig.label;

    // 2. Link Detection
    const linkEl = target?.closest ? target.closest('a[href]') : null;
    let linkUrl = null;
    if (linkEl) {
      if (typeof linkEl.href === 'string') {
        linkUrl = linkEl.href;
      } else if (linkEl.href?.baseVal) {
        linkUrl = linkEl.href.baseVal;
      }
    }

    // 3. Image detection
    const imgEl = detectImage(target);
    const imgUrl = imgEl ? (imgEl.currentSrc || imgEl.src) : null;

    // 4. Editable Form Fields (<input>, <textarea>, [contenteditable], [role="textbox"])
    const editableTarget = target?.closest ? (target.closest('input, textarea, [contenteditable="true"], [role="textbox"]') || (target.isContentEditable ? target : null)) : null;
    const isInput = editableTarget && (editableTarget.tagName === 'INPUT' || editableTarget.tagName === 'TEXTAREA');
    const isEditable = Boolean(editableTarget);
    const activeField = editableTarget || target;

    menuContainer.innerHTML = '';
    currentMenuItems = [];
    focusedIndex = -1;

    const itemsList = document.createElement('div');
    itemsList.className = 'nrc-item-list';

    function addItem({ label, action, disabled, shortcut }) {
      const item = document.createElement('div');
      item.className = `nrc-item ${disabled ? 'disabled' : ''}`;

      const icon = createIconSvg(getMenuIcon(label));
      item.appendChild(icon);

      const labelEl = document.createElement('span');
      labelEl.className = 'nrc-item-label';
      labelEl.textContent = label;
      item.appendChild(labelEl);

      const shortcutText = shortcut !== undefined ? shortcut : getShortcutHint(label);
      if (shortcutText) {
        const shortcutEl = document.createElement('span');
        shortcutEl.className = 'nrc-shortcut';
        shortcutEl.textContent = shortcutText;
        item.appendChild(shortcutEl);
      }

      if (!disabled) {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          closeMenu();
          if (action) action();
        });
        currentMenuItems.push({ element: item, action });
      }

      itemsList.appendChild(item);
    }

    function addSeparator() {
      const sep = document.createElement('div');
      sep.className = 'nrc-separator';
      itemsList.appendChild(sep);
    }

    // --- Context Hierarchy Matching Chromium ---

    if (imgUrl) {
      // 1. IMAGE CONTEXT
      addItem({
        label: 'Open Image in New Tab',
        action: () => sendBgMessage({ type: 'OPEN_TAB', url: imgUrl, active: true })
      });
      addItem({
        label: 'Download Image',
        action: () => {
          sendBgMessage({ type: 'DOWNLOAD_URL', url: imgUrl, saveAs: false });
          showToast('Downloading image');
        }
      });
      addItem({
        label: 'Save Image As...',
        action: () => sendBgMessage({ type: 'DOWNLOAD_URL', url: imgUrl, saveAs: true })
      });
      addItem({
        label: 'Copy Image',
        action: () => copyImage(imgUrl, imgEl)
      });
      addItem({
        label: 'Copy Image Address',
        action: async () => {
          try {
            await navigator.clipboard.writeText(imgUrl);
            showToast('Image address copied');
          } catch (e) {
            showToast('Failed to copy');
          }
        }
      });
      addSeparator();
      addItem({
        label: aiLabel,
        action: () => {
          sendBgMessage({
            type: 'OPEN_AI',
            provider: settings.aiProvider || 'chatgpt',
            openMode: settings.aiOpenMode || 'sidepanel',
            query: linkUrl || imgUrl
          });
        }
      });

      if (linkUrl) {
        addSeparator();
        addItem({
          label: 'Open Link in New Tab',
          action: () => sendBgMessage({ type: 'OPEN_TAB', url: linkUrl, active: true })
        });
        addItem({
          label: 'Open Link in New Window',
          action: () => sendBgMessage({ type: 'OPEN_WINDOW', url: linkUrl })
        });
        addItem({
          label: 'Open Link in Incognito Window',
          action: () => sendBgMessage({ type: 'OPEN_INCOGNITO', url: linkUrl })
        });
        addItem({
          label: 'Copy Link Address',
          action: async () => {
            try {
              await navigator.clipboard.writeText(linkUrl);
              showToast('Link copied to clipboard');
            } catch (e) {
              showToast('Failed to copy');
            }
          }
        });
        addSeparator();
        addItem({
          label: 'Share Link...',
          action: async () => {
            if (navigator.share) {
              try {
                await navigator.share({
                  title: linkEl?.innerText?.trim() || document.title,
                  url: linkUrl
                });
              } catch (err) {
                if (err.name !== 'AbortError') {
                  await navigator.clipboard.writeText(linkUrl);
                  showToast('Link copied to clipboard');
                }
              }
            } else {
              await navigator.clipboard.writeText(linkUrl);
              showToast('Link copied to clipboard');
            }
          }
        });
      } else {
        addSeparator();
        addItem({
          label: 'Share...',
          action: async () => {
            if (navigator.share) {
              try {
                await navigator.share({
                  title: document.title,
                  url: imgUrl
                });
              } catch (err) {
                if (err.name !== 'AbortError') {
                  await navigator.clipboard.writeText(imgUrl);
                  showToast('Image address copied');
                }
              }
            } else {
              await navigator.clipboard.writeText(imgUrl);
              showToast('Image address copied');
            }
          }
        });
      }

    } else if (linkUrl) {
      // 2. STANDALONE LINK
      addItem({
        label: 'Open Link in New Tab',
        action: () => sendBgMessage({ type: 'OPEN_TAB', url: linkUrl, active: true })
      });
      addItem({
        label: 'Open Link in New Window',
        action: () => sendBgMessage({ type: 'OPEN_WINDOW', url: linkUrl })
      });
      addItem({
        label: 'Open Link in Incognito Window',
        action: () => sendBgMessage({ type: 'OPEN_INCOGNITO', url: linkUrl })
      });
      addItem({
        label: 'Copy Link Address',
        action: async () => {
          try {
            await navigator.clipboard.writeText(linkUrl);
            showToast('Link copied to clipboard');
          } catch (e) {
            showToast('Failed to copy');
          }
        }
      });
      addSeparator();
      addItem({
        label: aiLabel,
        action: () => {
          sendBgMessage({
            type: 'OPEN_AI',
            provider: settings.aiProvider || 'chatgpt',
            openMode: settings.aiOpenMode || 'sidepanel',
            query: linkUrl
          });
        }
      });
      addSeparator();
      addItem({
        label: 'Share Link...',
        action: async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: linkEl?.innerText?.trim() || document.title,
                url: linkUrl
              });
            } catch (err) {
              if (err.name !== 'AbortError') {
                await navigator.clipboard.writeText(linkUrl);
                showToast('Link copied to clipboard');
              }
            }
          } else {
            await navigator.clipboard.writeText(linkUrl);
            showToast('Link copied to clipboard');
          }
        }
      });

    } else if (selectedText && !isEditable) {
      // 3. TEXT SELECTION CONTEXT
      addItem({
        label: 'Copy',
        action: async () => {
          try {
            await navigator.clipboard.writeText(selectedText);
            showToast('Copied to clipboard');
          } catch (e) {
            showToast('Failed to copy');
          }
        }
      });
      addItem({
        label: `Search Google for "${selectedText.length > 20 ? selectedText.slice(0, 20) + '...' : selectedText}"`,
        action: () => sendBgMessage({ type: 'SEARCH_GOOGLE', query: selectedText })
      });
      addItem({
        label: aiLabel,
        action: () => {
          sendBgMessage({
            type: 'OPEN_AI',
            provider: settings.aiProvider || 'google_ai',
            openMode: settings.aiOpenMode || 'split',
            query: selectedText
          });
        }
      });

    } else if (isEditable) {
      // 4. EDITABLE TEXT INPUT CONTEXT
      let inputSelection = '';
      let hasInputSelection = false;

      if (isInput && target.selectionStart !== undefined && target.selectionStart !== target.selectionEnd) {
        inputSelection = (target.value || '').substring(target.selectionStart, target.selectionEnd);
        hasInputSelection = inputSelection.length > 0;
      } else if (editableTarget.isContentEditable) {
        inputSelection = selectedText;
        hasInputSelection = selectedText.length > 0;
      }

      addItem({
        label: 'Cut',
        disabled: !hasInputSelection,
        action: async () => {
          try {
            if (hasInputSelection) {
              await navigator.clipboard.writeText(inputSelection);
              if (isInput) {
                target.setRangeText('', target.selectionStart, target.selectionEnd, 'end');
                target.dispatchEvent(new Event('input', { bubbles: true }));
              } else {
                document.execCommand('delete');
              }
              showToast('Cut to clipboard');
            }
          } catch (e) {
            document.execCommand('cut');
          }
        }
      });

      addItem({
        label: 'Copy',
        disabled: !hasInputSelection,
        action: async () => {
          try {
            if (hasInputSelection) {
              await navigator.clipboard.writeText(inputSelection);
              showToast('Copied to clipboard');
            }
          } catch (e) {
            document.execCommand('copy');
          }
        }
      });

      if (hasInputSelection) {
        addItem({
          label: aiLabel,
          action: () => {
            sendBgMessage({
              type: 'OPEN_AI',
              provider: settings.aiProvider || 'google_ai',
              openMode: settings.aiOpenMode || 'split',
              query: inputSelection
            });
          }
        });
      }

      addItem({
        label: 'Paste',
        action: () => handlePaste(activeField)
      });

      addItem({
        label: 'Paste and Go',
        action: async () => {
          try {
            const text = (await navigator.clipboard.readText() || '').trim();
            if (!text) {
              showToast('Clipboard is empty');
              return;
            }
            const isUrl = /^https?:\/\//i.test(text) || /^www\./i.test(text) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(text);
            if (isUrl) {
              const fullUrl = /^https?:\/\//i.test(text) ? text : `https://${text}`;
              window.location.href = fullUrl;
            } else {
              window.location.href = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
            }
          } catch (e) {
            showToast('Unable to read clipboard');
          }
        }
      });

      addSeparator();
      addItem({
        label: 'Select All',
        action: () => {
          if (activeField && activeField.select) {
            activeField.focus();
            activeField.select();
          } else {
            activeField?.focus?.();
            document.execCommand('selectAll');
          }
        }
      });

    } else {
      // 5. GENERAL PAGE CONTEXT
      const canGoBack = window.navigation ? Boolean(window.navigation.canGoBack) : (window.history.length > 1);
      const canGoForward = window.navigation ? Boolean(window.navigation.canGoForward) : false;

      addItem({
        label: 'Back',
        disabled: !canGoBack,
        action: () => window.history.back()
      });
      addItem({
        label: 'Forward',
        disabled: !canGoForward,
        action: () => window.history.forward()
      });
      addItem({
        label: 'Reload',
        action: () => window.location.reload()
      });
      addSeparator();
      addItem({
        label: aiLabel,
        action: () => {
          sendBgMessage({
            type: 'OPEN_AI',
            provider: settings.aiProvider || 'google_ai',
            openMode: settings.aiOpenMode || 'split'
          });
        }
      });
      addSeparator();
      addItem({
        label: 'New Tab',
        action: () => sendBgMessage({ type: 'OPEN_TAB', active: true })
      });
      addItem({
        label: 'Close Tab',
        action: () => sendBgMessage({ type: 'CLOSE_TAB' })
      });
      addItem({
        label: 'Downloads',
        action: () => sendBgMessage({ type: 'OPEN_DOWNLOADS' })
      });
      addSeparator();
      addItem({
        label: 'Copy Page URL',
        action: async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Page URL copied to clipboard');
          } catch (e) {
            showToast('Failed to copy');
          }
        }
      });
      addItem({
        label: 'Share...',
        action: async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: document.title,
                url: window.location.href
              });
            } catch (err) {
              if (err.name !== 'AbortError') {
                await navigator.clipboard.writeText(window.location.href);
                showToast('Link copied to clipboard');
              }
            }
          } else {
            try {
              await navigator.clipboard.writeText(window.location.href);
              showToast('Link copied to clipboard');
            } catch (e) {
              showToast('Failed to share');
            }
          }
        }
      });
      addSeparator();
      addItem({
        label: 'Scroll to Top',
        action: () => scrollToTopAction(target)
      });
      addItem({
        label: 'Scroll to Bottom',
        action: () => scrollToBottomAction(target)
      });
    }

    menuContainer.appendChild(itemsList);

    // Prepare container for synchronous layout measurement
    menuContainer.classList.remove('visible');
    menuContainer.style.visibility = 'hidden';
    menuContainer.style.display = 'block';
    menuContainer.style.left = '-9999px';
    menuContainer.style.top = '-9999px';

    const menuWidth = menuContainer.offsetWidth || 210;
    const menuHeight = menuContainer.offsetHeight || 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const EDGE_PADDING = 8;
    const CURSOR_OFFSET = 2;

    let posX = x + CURSOR_OFFSET;
    let posY = y + CURSOR_OFFSET;
    let originX = 'left';
    let originY = 'top';

    // Horizontal adaptation (Right edge / Corner collision)
    const fitsRight = (x + CURSOR_OFFSET + menuWidth <= vw - EDGE_PADDING);
    const spaceLeft = x - EDGE_PADDING;
    const spaceRight = vw - x - EDGE_PADDING;

    if (!fitsRight) {
      if (spaceLeft >= menuWidth || spaceLeft > spaceRight) {
        // Open to the left of the cursor
        posX = x - menuWidth - CURSOR_OFFSET;
        originX = 'right';
      } else {
        // Clamp to right viewport edge
        posX = vw - menuWidth - EDGE_PADDING;
        originX = 'right';
      }
    }

    // Keep posX safely within viewport bounds
    posX = Math.max(EDGE_PADDING, Math.min(posX, vw - menuWidth - EDGE_PADDING));

    // Vertical adaptation (Bottom edge / Corner collision)
    const fitsBottom = (y + CURSOR_OFFSET + menuHeight <= vh - EDGE_PADDING);
    const spaceTop = y - EDGE_PADDING;
    const spaceBottom = vh - y - EDGE_PADDING;

    if (!fitsBottom) {
      if (spaceTop >= menuHeight || spaceTop > spaceBottom) {
        // Open upward from the cursor
        posY = y - menuHeight - CURSOR_OFFSET;
        originY = 'bottom';
      } else {
        // Clamp to bottom viewport edge
        posY = vh - menuHeight - EDGE_PADDING;
        originY = 'bottom';
      }
    }

    // Keep posY safely within viewport bounds
    posY = Math.max(EDGE_PADDING, Math.min(posY, vh - menuHeight - EDGE_PADDING));

    // Apply positions & dynamic transform origin for natural outward expansion
    menuContainer.style.transformOrigin = `${originY} ${originX}`;
    menuContainer.style.left = `${posX}px`;
    menuContainer.style.top = `${posY}px`;
    menuContainer.style.visibility = 'visible';
    menuContainer.classList.add('visible');
    isMenuOpen = true;

    // Attach active listeners only while menu is open
    attachOpenListeners();
  }

  // Fast-path point-inside-selection detection
  function isPointInsideSelection(x, y) {
    try {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;

      const range = selection.getRangeAt(0);
      const bbox = range.getBoundingClientRect();
      if (x < bbox.left - 1 || x > bbox.right + 1 || y < bbox.top - 1 || y > bbox.bottom + 1) {
        return false;
      }

      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  // Instant text selection drag state
  let isLmbDownOnSelection = false;
  let lmbDownX = 0;
  let lmbDownY = 0;
  let selectionAtMouseDown = '';
  let draggedEl = null;
  let originalDraggable = null;
  let activeGhostEl = null;

  function cleanupDraggable() {
    if (draggedEl) {
      try {
        if (originalDraggable === null) {
          draggedEl.removeAttribute('draggable');
        } else {
          draggedEl.setAttribute('draggable', originalDraggable);
        }
      } catch (err) {}
      draggedEl = null;
      originalDraggable = null;
    }
  }

  function createSelectionDragGhost(text) {
    cleanupGhost();
    const cleanText = text.trim();
    const isUrl = /^https?:\/\//i.test(cleanText) || /^www\./i.test(cleanText);
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    const displayText = cleanText.length > 32 ? cleanText.slice(0, 29) + '…' : cleanText;

    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position: fixed !important',
      'top: -9999px !important',
      'left: -9999px !important',
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 7px !important',
      'padding: 5px 12px 5px 8px !important',
      'background: rgba(24, 25, 29, 0.96) !important',
      'backdrop-filter: blur(16px) !important',
      '-webkit-backdrop-filter: blur(16px) !important',
      'color: #ffffff !important',
      'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important',
      'font-size: 12px !important',
      'font-weight: 500 !important',
      'line-height: 1.3 !important',
      'border-radius: 20px !important',
      'border: 1px solid rgba(255, 255, 255, 0.16) !important',
      'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25) !important',
      'pointer-events: none !important',
      'z-index: 2147483647 !important',
      'white-space: nowrap !important',
      'max-width: 320px !important',
      'overflow: hidden !important',
      'user-select: none !important'
    ].join(';');

    // Icon container
    const iconBg = isUrl ? '#059669' : '#2563eb';
    const iconSvg = isUrl
      ? '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>';

    const iconEl = document.createElement('span');
    iconEl.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${iconBg};color:#fff;flex-shrink:0;`;
    iconEl.innerHTML = iconSvg;
    ghost.appendChild(iconEl);

    // Text Label
    const textEl = document.createElement('span');
    textEl.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;';
    textEl.textContent = displayText;
    ghost.appendChild(textEl);

    // Word Count Tag (if multi-word)
    if (words > 1) {
      const tagEl = document.createElement('span');
      tagEl.style.cssText = 'font-size:10px;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:10px;color:rgba(255,255,255,0.85);font-weight:600;margin-left:2px;flex-shrink:0;';
      tagEl.textContent = `${words} words`;
      ghost.appendChild(tagEl);
    }

    (document.body || document.documentElement).appendChild(ghost);
    activeGhostEl = ghost;
    return ghost;
  }

  function cleanupGhost() {
    if (activeGhostEl) {
      try { activeGhostEl.remove(); } catch (e) {}
      activeGhostEl = null;
    }
  }

  // --- Mouse & Gesture Events ---

  window.addEventListener('mousedown', (e) => {
    // Left click handling: trigger immediate draggable on selection for 0ms drag response
    if (e.button === 0) {
      if (isPointInsideSelection(e.clientX, e.clientY)) {
        isLmbDownOnSelection = true;
        lmbDownX = e.clientX;
        lmbDownY = e.clientY;
        selectionAtMouseDown = window.getSelection()?.toString() || '';
        const targetEl = e.target && e.target.nodeType === 1 ? e.target : e.target?.parentElement;
        if (targetEl) {
          draggedEl = targetEl;
          originalDraggable = targetEl.getAttribute('draggable');
          if (originalDraggable !== 'true') {
            targetEl.setAttribute('draggable', 'true');
          }
        }
      } else {
        isLmbDownOnSelection = false;
        cleanupDraggable();
      }
    }

    // Left click outside closes open menu
    if (isMenuOpen && e.button !== 2) {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(menuHost)) {
        closeMenu();
      }
      return;
    }

    // Right click initiation
    if (e.button === 2) {
      isRmbDown = true;
      downX = e.clientX;
      downY = e.clientY;
      isDragging = false;
      lastTarget = e.target;

      if (isMenuOpen) {
        closeMenu();
      }

      if (settings.triggerMode === 'longpress') {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          if (isRmbDown && !isDragging) {
            renderMenu(downX, downY, lastTarget);
          }
        }, settings.longPressMs || 250);
      }
    }
  }, { capture: true, passive: true });

  // Prevent Chromium from delaying text drag on existing selection
  window.addEventListener('selectstart', (e) => {
    if (isLmbDownOnSelection) {
      e.preventDefault();
    }
  }, { capture: true });

  // Instant selection drag initialization with custom text-only ghost image
  window.addEventListener('dragstart', (e) => {
    if (isLmbDownOnSelection || draggedEl) {
      const text = (selectionAtMouseDown || window.getSelection()?.toString() || '').trim();
      if (text && e.dataTransfer) {
        try {
          e.dataTransfer.clearData();
          e.dataTransfer.setData('text/plain', text);
          e.dataTransfer.setData('text/html', text);
          if (/^https?:\/\//i.test(text)) {
            e.dataTransfer.setData('text/uri-list', text);
          }
          e.dataTransfer.effectAllowed = 'copyMove';

          // Override element ghost with precise highlighted text pill
          const ghost = createSelectionDragGhost(text);
          if (ghost && e.dataTransfer.setDragImage) {
            e.dataTransfer.setDragImage(ghost, 12, 12);
          }
        } catch (err) {}
      }
      isLmbDownOnSelection = false;
    }
  }, { capture: true });

  window.addEventListener('dragend', () => {
    isLmbDownOnSelection = false;
    cleanupDraggable();
    setTimeout(cleanupGhost, 100);
  }, { capture: true, passive: true });

  // Fast mousemove listener using squared distance check
  window.addEventListener('mousemove', (e) => {
    if (!isRmbDown || isDragging) return;

    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    const threshold = settings.movementThreshold || 5;

    if (dx * dx + dy * dy >= threshold * threshold) {
      isDragging = true;
      if (longPressTimer) clearTimeout(longPressTimer);
      if (isMenuOpen) closeMenu();
    }
  }, { capture: true, passive: true });

  window.addEventListener('mouseup', (e) => {
    // Left mouse release: clear selection if clicked without dragging
    if (e.button === 0) {
      if (isLmbDownOnSelection) {
        const dx = e.clientX - lmbDownX;
        const dy = e.clientY - lmbDownY;
        if (dx * dx + dy * dy < 16) {
          try {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
              sel.removeAllRanges();
            }
          } catch (err) {}
        }
        isLmbDownOnSelection = false;
      }
      cleanupDraggable();
    }

    if (e.button === 2) {
      const wasRmbDown = isRmbDown;
      isRmbDown = false;
      if (longPressTimer) clearTimeout(longPressTimer);

      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      const threshold = settings.movementThreshold || 5;
      const isDrag = isDragging || (dx * dx + dy * dy >= threshold * threshold);

      // If user dragged, do not open menu
      if (isDrag) {
        return;
      }

      // If stationary tap:
      if (wasRmbDown && !isDrag) {
        const clickX = (e.clientX || e.clientY) ? e.clientX : downX;
        const clickY = (e.clientX || e.clientY) ? e.clientY : downY;
        const activeTarget = (clickX && clickY ? document.elementFromPoint(clickX, clickY) : null) || lastTarget || e.target;
        const now = Date.now();

        if (settings.triggerMode === 'tap') {
          renderMenu(clickX, clickY, activeTarget);
        } else if (settings.triggerMode === 'double') {
          if (now - lastRmbClickTime < 350) {
            renderMenu(clickX, clickY, activeTarget);
            lastRmbClickTime = 0;
          } else {
            lastRmbClickTime = now;
          }
        }
      }
    }
  }, { capture: true, passive: true });

  // Suppress browser native menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, { capture: true });

  // Passive dismiss listeners
  window.addEventListener('scroll', () => {
    if (isMenuOpen && settings.lockScrollWhenOpen === false) {
      closeMenu();
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (isMenuOpen) closeMenu();
  }, { passive: true });

  window.addEventListener('blur', () => {
    if (isMenuOpen) closeMenu();
    isLmbDownOnSelection = false;
    cleanupDraggable();
    cleanupGhost();
  });

  // Pre-initialize Shadow DOM to ensure stylesheet is loaded and ready before any click
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initShadowDOM(), { once: true });
  } else {
    initShadowDOM();
  }
})();

