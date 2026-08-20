// popup.js - Modern settings synchronization for Native Right-Click

document.addEventListener('DOMContentLoaded', async () => {
  const radioInputs = document.querySelectorAll('input[name="triggerMode"]');
  const thresholdSlider = document.getElementById('dragThreshold');
  const thresholdValue = document.getElementById('thresholdValue');
  const themeCards = document.querySelectorAll('.theme-card');
  const savedIndicator = document.getElementById('savedIndicator');

  let saveTimeout = null;
  function notifySaved() {
    savedIndicator.classList.add('show');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      savedIndicator.classList.remove('show');
    }, 1400);
  }

  // Load existing settings
  const settings = await chrome.storage.sync.get({
    triggerMode: 'tap',
    theme: 'auto',
    movementThreshold: 5
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

  thresholdSlider.addEventListener('input', () => {
    thresholdValue.textContent = `${thresholdSlider.value}px`;
  });

  thresholdSlider.addEventListener('change', async () => {
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
});
