// content.js - Robust Chromium Native Context Menu (Bug-Free & Hardened)

(() => {
  'use strict';

  if (window.__QUICK_RIGHT_CLICK_INJECTED__) return;
  window.__QUICK_RIGHT_CLICK_INJECTED__ = true;

  // Settings
  let settings = {
    theme: 'auto',
    menuSize: 'medium',
    triggerMode: 'tap',
    longPressMs: 250,
    movementThreshold: 5,
    disableAnimations: false
  };

  // Safe storage sync
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
  let menuContainer = null;
  let toastElement = null;
  let isMenuOpen = false;
  let focusedIndex = -1;
  let currentMenuItems = [];

  function initShadowDOM() {
    if (menuHost && shadowRoot && menuContainer) return;

    // Create root host
    menuHost = document.createElement('div');
    menuHost.id = 'nrc-context-menu-host';
    menuHost.style.cssText = 'all:initial!important;position:absolute!important;top:0!important;left:0!important;z-index:2147483647!important;';

    shadowRoot = menuHost.attachShadow({ mode: 'open' });

    // Link stylesheet
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('menu.css');
    shadowRoot.appendChild(styleLink);

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'nrc-menu-wrapper';
    shadowRoot.appendChild(wrapper);

    // Menu container
    menuContainer = document.createElement('div');
    menuContainer.className = 'nrc-menu';
    menuContainer.tabIndex = -1;
    wrapper.appendChild(menuContainer);

    // Toast
    toastElement = document.createElement('div');
    toastElement.className = 'nrc-toast';
    wrapper.appendChild(toastElement);

    const mountTarget = document.body || document.documentElement;
    if (mountTarget) {
      mountTarget.appendChild(menuHost);
    }
    updateThemeClass();
  }

  function updateThemeClass() {
    if (!shadowRoot) return;
    const wrapper = shadowRoot.querySelector('.nrc-menu-wrapper');
    if (!wrapper) return;
    const menuSize = ['compact', 'medium', 'large'].includes(settings.menuSize) ? settings.menuSize : 'medium';
    const animClass = settings.disableAnimations ? 'no-animations' : '';
    wrapper.className = `nrc-menu-wrapper theme-${settings.theme || 'auto'} menu-size-${menuSize} ${animClass}`.trim();
  }

  let toastTimer = null;
  function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('show');
    }, 1800);
  }

  function closeMenu() {
    if (!isMenuOpen || !menuContainer) return;
    menuContainer.classList.remove('visible');
    menuContainer.style.visibility = 'hidden';
    menuContainer.style.left = '-9999px';
    menuContainer.style.top = '-9999px';
    isMenuOpen = false;
    focusedIndex = -1;
    currentMenuItems = [];
  }

  function renderMenu(x, y, target) {
    initShadowDOM();
    updateThemeClass();

    // 1. Text Selection detection (Standard HTML text)
    const selectedText = window.getSelection()?.toString().trim();

    // 2. Link Detection (handles HTML <a> and SVG <a> animated strings)
    const linkEl = target?.closest ? target.closest('a[href]') : null;
    let linkUrl = null;
    if (linkEl) {
      if (typeof linkEl.href === 'string') {
        linkUrl = linkEl.href;
      } else if (linkEl.href?.baseVal) {
        linkUrl = linkEl.href.baseVal;
      }
    }

    // 3. Image detection (strictly for actual <img> or <picture> tags)
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

    const menuIcons = {
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
      if (label === 'Open Image in New Tab' || label === 'Open Link in New Tab') return menuIcons.openInNew;
      if (label === 'Download Image') return menuIcons.download;
      if (label === 'Save Image As...') return menuIcons.save;
      if (label === 'Copy Image') return menuIcons.image;
      if (label === 'Copy Image Address' || label === 'Copy Link Address' || label === 'Copy Page URL' || label === 'Copy') return menuIcons.copy;
      if (label === 'Open Link in New Window') return menuIcons.window;
      if (label === 'Open Link in Incognito Window') return menuIcons.incognito;
      if (label === 'Share...' || label === 'Share Link...') return menuIcons.share;
      if (label.startsWith('Search Google')) return menuIcons.search;
      if (label === 'Ask with AI Mode') return menuIcons.ai;
      if (label === 'Cut') return menuIcons.cut;
      if (label === 'Paste' || label === 'Paste and Go') return menuIcons.paste;
      if (label === 'Select All') return menuIcons.selectAll;
      if (label === 'Back') return menuIcons.back;
      if (label === 'Forward') return menuIcons.forward;
      if (label === 'Reload') return menuIcons.reload;
      if (label === 'New Tab') return menuIcons.newTab;
      if (label === 'Close Tab') return menuIcons.close;
      if (label === 'Downloads') return menuIcons.downloads;
      if (label === 'Scroll to Top') return menuIcons.scrollTop;
      if (label === 'Scroll to Bottom') return menuIcons.scrollBottom;
      return menuIcons.copy;
    }

    const isMac = (navigator.userAgentData?.platform || navigator.platform || '').toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? '⌘' : 'Ctrl+';

    function getShortcutHint(label) {
      if (label === 'Reload') return `${cmdKey}R`;
      if (label === 'New Tab') return `${cmdKey}T`;
      if (label === 'Close Tab') return `${cmdKey}W`;
      if (label === 'Downloads') return `${cmdKey}J`;
      if (label === 'Copy' || label === 'Copy Link Address' || label === 'Copy Page URL') return `${cmdKey}C`;
      if (label === 'Cut') return `${cmdKey}X`;
      if (label === 'Paste') return `${cmdKey}V`;
      if (label === 'Select All') return `${cmdKey}A`;
      if (label === 'Scroll to Top') return 'Home';
      if (label === 'Scroll to Bottom') return 'End';
      return null;
    }

    function addItem({ label, action, disabled, shortcut }) {
      const item = document.createElement('div');
      item.className = `nrc-item ${disabled ? 'disabled' : ''}`;

      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.classList.add('nrc-icon');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', getMenuIcon(label));
      icon.appendChild(path);
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

    // Comprehensive paste handler for both Images and Text
    async function handlePaste(field) {
      if (!field) return;
      field.focus();

      try {
        // Attempt rich clipboard reading (Images, Files, Text)
        if (navigator.clipboard.read) {
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

                // If contenteditable and event wasn't handled, insert image element
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
        showToast('Press ' + modKey + 'V to paste');
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

    function performUniversalScroll(toTop, target) {
      // 1. Direct ancestor scrollable containers
      let el = target;
      while (el && el !== document.body && el !== document.documentElement) {
        try {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY || style.overflow;
          if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && el.scrollHeight > el.clientHeight + 4) {
            const dest = toTop ? 0 : el.scrollHeight;
            if (el.scrollTo) el.scrollTo({ top: dest, behavior: 'smooth' });
            el.scrollTop = dest;
          }
        } catch (e) {}
        el = el.parentElement;
      }

      // 2. Query major layout containers (SPAs, React/Vue root, feeds, chat logs)
      const majorContainers = document.querySelectorAll('main, [role="main"], [role="feed"], #app, #root, #__next, .main, .content, .container, body > div');
      for (const container of majorContainers) {
        try {
          if (container.scrollHeight > container.clientHeight + 30 && container.clientHeight > 150) {
            const style = window.getComputedStyle(container);
            const overflowY = style.overflowY || style.overflow;
            if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
              const dest = toTop ? 0 : container.scrollHeight;
              if (container.scrollTo) container.scrollTo({ top: dest, behavior: 'smooth' });
              container.scrollTop = dest;
            }
          }
        } catch (e) {}
      }

      // 3. Document-level roots
      const maxScroll = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0,
        document.scrollingElement ? document.scrollingElement.scrollHeight : 0,
        9999999
      );
      const docDest = toTop ? 0 : maxScroll;

      try {
        window.scrollTo({ top: docDest, left: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, docDest);
      }

      if (document.scrollingElement) {
        try { document.scrollingElement.scrollTo({ top: docDest, left: 0, behavior: 'smooth' }); } catch (e) {}
        document.scrollingElement.scrollTop = docDest;
      }
      if (document.documentElement) {
        try { document.documentElement.scrollTo({ top: docDest, left: 0, behavior: 'smooth' }); } catch (e) {}
        document.documentElement.scrollTop = docDest;
      }
      if (document.body) {
        try { document.body.scrollTo({ top: docDest, left: 0, behavior: 'smooth' }); } catch (e) {}
        document.body.scrollTop = docDest;
      }

      // 4. Dispatch virtual list / accessibility keyboard events (for Twitter/Discord/Reddit feeds)
      try {
        const keyName = toTop ? 'Home' : 'End';
        const keyEvt = new KeyboardEvent('keydown', {
          key: keyName,
          code: keyName,
          keyCode: toTop ? 36 : 35,
          which: toTop ? 36 : 35,
          bubbles: true,
          cancelable: true
        });
        (target || document.activeElement || document.body).dispatchEvent(keyEvt);
      } catch (e) {}
    }

    function scrollToTopAction(target) {
      performUniversalScroll(true, target);
    }

    function scrollToBottomAction(target) {
      performUniversalScroll(false, target);
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

    // --- Context Hierarchy Matching Chromium ---

    if (imgUrl) {
      // 1. IMAGE CONTEXT (Prioritized at the top whenever an image is right-clicked)
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

      // If image is inside a link, display link options below separator
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
      // 2. STANDALONE LINK (No image)
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
        label: 'Ask with AI Mode',
        action: () => {
          const aiUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}&udm=50&aep=11&atvm=2`;
          sendBgMessage({ type: 'OPEN_TAB', url: aiUrl, active: true });
        }
      });

    } else if (isEditable) {
      // 4. EDITABLE TEXT INPUT CONTEXT (Robust selection & clipboard handling)
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
          label: 'Ask with AI Mode',
          action: () => {
            const aiUrl = `https://www.google.com/search?q=${encodeURIComponent(inputSelection)}&udm=50&aep=11&atvm=2`;
            sendBgMessage({ type: 'OPEN_TAB', url: aiUrl, active: true });
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
      // 5. GENERAL PAGE CONTEXT (Global Menu)
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
        label: 'Ask with AI Mode',
        action: () => {
          sendBgMessage({
            type: 'OPEN_TAB',
            url: 'https://www.google.com/search?udm=50&aep=11&atvm=2',
            active: true
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

    // Prepare container for synchronous layout measurement without visual jump
    menuContainer.classList.remove('visible');
    menuContainer.style.visibility = 'hidden';
    menuContainer.style.display = 'block';
    menuContainer.style.left = '-9999px';
    menuContainer.style.top = '-9999px';

    // Measure exact dimensions
    const menuWidth = menuContainer.offsetWidth || 210;
    const menuHeight = menuContainer.offsetHeight || 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const EDGE_PADDING = 6;
    const CURSOR_OFFSET = 2;

    let posX = x + CURSOR_OFFSET;
    let posY = y + CURSOR_OFFSET;
    let originX = 'left';
    let originY = 'top';

    // Horizontal positioning & smart flip
    if (posX + menuWidth > vw - EDGE_PADDING) {
      if (x - menuWidth >= EDGE_PADDING) {
        posX = x - menuWidth - CURSOR_OFFSET;
        originX = 'right';
      } else {
        posX = Math.max(EDGE_PADDING, vw - menuWidth - EDGE_PADDING);
        originX = 'right';
      }
    } else {
      posX = Math.max(EDGE_PADDING, posX);
    }

    // Vertical positioning & smart flip
    if (posY + menuHeight > vh - EDGE_PADDING) {
      if (y - menuHeight >= EDGE_PADDING) {
        posY = y - menuHeight - CURSOR_OFFSET;
        originY = 'bottom';
      } else {
        posY = Math.max(EDGE_PADDING, vh - menuHeight - EDGE_PADDING);
        originY = 'bottom';
      }
    } else {
      posY = Math.max(EDGE_PADDING, posY);
    }

    // Apply calculated positions and dynamic transform origin
    menuContainer.style.transformOrigin = `${originY} ${originX}`;
    menuContainer.style.left = `${posX}px`;
    menuContainer.style.top = `${posY}px`;
    menuContainer.style.visibility = 'visible';
    menuContainer.classList.add('visible');
    isMenuOpen = true;
  }

  // --- Mouse & Gesture Events ---

  window.addEventListener('mousedown', (e) => {
    // Left click outside closes open menu
    if (isMenuOpen && e.button !== 2) {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(menuHost)) {
        closeMenu();
      }
      return;
    }

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

  window.addEventListener('mousemove', (e) => {
    if (!isRmbDown) return;

    const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (dist >= (settings.movementThreshold || 5)) {
      isDragging = true;
      if (longPressTimer) clearTimeout(longPressTimer);
      if (isMenuOpen) closeMenu();
    }
  }, { capture: true, passive: true });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
      const wasRmbDown = isRmbDown;
      isRmbDown = false;
      if (longPressTimer) clearTimeout(longPressTimer);

      const now = Date.now();
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const isDrag = isDragging || dist >= (settings.movementThreshold || 5);

      // If user dragged, DO NOT open menu under any circumstance
      if (isDrag) {
        return;
      }

      // If user tapped without moving:
      if (wasRmbDown && !isDrag) {
        const activeTarget = (e.clientX && e.clientY ? document.elementFromPoint(e.clientX, e.clientY) : null) || lastTarget || e.target;
        if (settings.triggerMode === 'tap') {
          renderMenu(e.clientX, e.clientY, activeTarget);
        } else if (settings.triggerMode === 'double') {
          if (now - lastRmbClickTime < 350) {
            renderMenu(e.clientX, e.clientY, activeTarget);
            lastRmbClickTime = 0;
          } else {
            lastRmbClickTime = now;
          }
        }
      }
    }
  }, { capture: true, passive: true });

  // Suppress browser native menu in bubble phase so gesture extensions receive prior capture phase
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, { capture: false });

  // Dismiss listeners
  window.addEventListener('scroll', () => {
    if (isMenuOpen) closeMenu();
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (isMenuOpen) closeMenu();
  }, { passive: true });

  window.addEventListener('blur', () => {
    if (isMenuOpen) closeMenu();
  });

  // Keyboard navigation & accessibility
  window.addEventListener('keydown', (e) => {
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
  }, { capture: true });

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
})();
