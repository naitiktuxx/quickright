// popup.js - Settings synchronization for Quick Right Click

document.addEventListener('DOMContentLoaded', async () => {
  const radioInputs = document.querySelectorAll('input[name="triggerMode"]');
  const themeSelect = document.getElementById('themeSelect');
  const menuSizeSelect = document.getElementById('menuSizeSelect');
  const savedIndicator = document.getElementById('savedIndicator');

  let saveTimeout = null;
  function notifySaved() {
    savedIndicator.classList.add('show');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      savedIndicator.classList.remove('show');
    }, 1500);
  }

  const settings = await chrome.storage.sync.get({
    triggerMode: 'tap',
    theme: 'auto',
    menuSize: 'medium'
  });

  radioInputs.forEach(input => {
    input.checked = (input.value === settings.triggerMode);
    input.addEventListener('change', async () => {
      if (input.checked) {
        await chrome.storage.sync.set({ triggerMode: input.value });
        notifySaved();
      }
    });
  });

  themeSelect.value = settings.theme || 'auto';
  themeSelect.addEventListener('change', async () => {
    await chrome.storage.sync.set({ theme: themeSelect.value });
    notifySaved();
  });

  menuSizeSelect.value = settings.menuSize || 'medium';
  menuSizeSelect.addEventListener('change', async () => {
    await chrome.storage.sync.set({ menuSize: menuSizeSelect.value });
    notifySaved();
  });
});
