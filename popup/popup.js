// popup.js - Modern settings synchronization for Native Right-Click

document.addEventListener('DOMContentLoaded', async () => {
  const radioInputs = document.querySelectorAll('input[name="triggerMode"]');
  const thresholdSlider = document.getElementById('dragThreshold');
  const thresholdValue = document.getElementById('thresholdValue');
  const themeCards = document.querySelectorAll('.theme-card');
  const sizeCards = document.querySelectorAll('.size-card');
  const aiCards = document.querySelectorAll('.ai-card');
  const targetCards = document.querySelectorAll('.target-card');
  const lockScrollCheckbox = document.getElementById('lockScrollWhenOpen');
  const disableAnimationsCheckbox = document.getElementById('disableAnimations');
  const savedIndicator = document.getElementById('savedIndicator');

  let saveTimeout = null;
  function notifySaved() {
    savedIndicator.classList.add('show');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      savedIndicator.classList.remove('show');
    }, 1400);
  }

  // Load existing settings safely
  const settings = await chrome.storage.sync.get({
    triggerMode: 'tap',
    theme: 'dark',
    menuSize: 'compact',
    aiProvider: 'chatgpt',
    aiOpenMode: 'sidepanel',
    movementThreshold: 6,
    lockScrollWhenOpen: true,
    disableAnimations: true
  });

  // 1. Trigger mode
  radioInputs.forEach(input => {
    input.checked = (input.value === settings.triggerMode);
    input.addEventListener('change', async () => {
      if (input.checked) {
        await chrome.storage.sync.set({ triggerMode: input.value });
        notifySaved();
      }
    });
  });

  // 2. Drag threshold slider
  const initialThreshold = settings.movementThreshold || 5;
  thresholdSlider.value = initialThreshold;
  thresholdValue.textContent = `${initialThreshold}px`;

  let sliderSaveDebounce = null;
  thresholdSlider.addEventListener('input', () => {
    thresholdValue.textContent = `${thresholdSlider.value}px`;
    clearTimeout(sliderSaveDebounce);
    sliderSaveDebounce = setTimeout(async () => {
      const val = parseInt(thresholdSlider.value, 10);
      await chrome.storage.sync.set({ movementThreshold: val });
      notifySaved();
    }, 300);
  });

  thresholdSlider.addEventListener('change', async () => {
    clearTimeout(sliderSaveDebounce);
    const val = parseInt(thresholdSlider.value, 10);
    await chrome.storage.sync.set({ movementThreshold: val });
    notifySaved();
  });

  // 3. Theme selection
  function updateThemeUI(theme) {
    themeCards.forEach(card => {
      card.classList.toggle('active', card.dataset.theme === theme);
    });
  }

  updateThemeUI(settings.theme || 'auto');

  themeCards.forEach(card => {
    card.addEventListener('click', async () => {
      const theme = card.dataset.theme;
      updateThemeUI(theme);
      await chrome.storage.sync.set({ theme });
      notifySaved();
    });
  });

  // 4. Menu Size selection
  function updateSizeUI(size) {
    sizeCards.forEach(card => {
      card.classList.toggle('active', card.dataset.size === size);
    });
  }

  updateSizeUI(settings.menuSize || 'medium');

  sizeCards.forEach(card => {
    card.addEventListener('click', async () => {
      const menuSize = card.dataset.size;
      updateSizeUI(menuSize);
      await chrome.storage.sync.set({ menuSize });
      notifySaved();
    });
  });

  // 5. AI Assistant selection
  function updateAiUI(ai) {
    aiCards.forEach(card => {
      card.classList.toggle('active', card.dataset.ai === ai);
    });
  }

  updateAiUI(settings.aiProvider || 'google_ai');

  aiCards.forEach(card => {
    card.addEventListener('click', async () => {
      const aiProvider = card.dataset.ai;
      updateAiUI(aiProvider);
      await chrome.storage.sync.set({ aiProvider });
      notifySaved();
    });
  });

  // 6. AI Launch Target selection
  function updateTargetUI(target) {
    targetCards.forEach(card => {
      card.classList.toggle('active', card.dataset.target === target);
    });
  }

  updateTargetUI(settings.aiOpenMode || 'split');

  targetCards.forEach(card => {
    card.addEventListener('click', async () => {
      const aiOpenMode = card.dataset.target;
      updateTargetUI(aiOpenMode);
      await chrome.storage.sync.set({ aiOpenMode });
      notifySaved();
    });
  });

  // 7. Lock background scroll toggle
  lockScrollCheckbox.checked = settings.lockScrollWhenOpen !== false;
  lockScrollCheckbox.addEventListener('change', async () => {
    await chrome.storage.sync.set({ lockScrollWhenOpen: lockScrollCheckbox.checked });
    notifySaved();
  });

  // 8. Disable animations toggle
  disableAnimationsCheckbox.checked = Boolean(settings.disableAnimations);
  disableAnimationsCheckbox.addEventListener('change', async () => {
    await chrome.storage.sync.set({ disableAnimations: disableAnimationsCheckbox.checked });
    notifySaved();
  });
});
