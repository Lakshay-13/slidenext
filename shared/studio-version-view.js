(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioVersionView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hideStudioVersionsDropdown(options = {}) {
    const documentRef = options.documentRef;
    const dropdown = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('versionsDropdown')
      : null;
    if (!dropdown) return false;
    dropdown.classList.add('hidden');
    return true;
  }

  function resetStudioRenameVersionButton(button) {
    if (!button) return false;
    button.disabled = false;
    button.textContent = 'Rename';
    return true;
  }

  function setStudioRenameVersionButtonBusy(button) {
    if (!button) return false;
    button.disabled = true;
    button.textContent = 'Renaming...';
    return true;
  }

  return {
    hideStudioVersionsDropdown,
    resetStudioRenameVersionButton,
    setStudioRenameVersionButtonBusy
  };
});
