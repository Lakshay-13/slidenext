(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStatusView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function setStudioAutoSaveStatus(options = {}) {
    const documentRef = options.documentRef;
    const statusEl = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('autoSaveStatus')
      : null;
    if (!statusEl) return false;

    const state = options.state;
    if (state === 'loading') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Loading deck...</span>`;
    } else if (state === 'saving') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Saving...</span>`;
    } else if (state === 'autosave-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">AutoSave Failed</span>`;
    } else if (state === 'save-version-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">Save Version Failed</span>`;
    } else if (state === 'network-error') {
      statusEl.innerHTML = `<span class="text-rose-400">Network Error</span>`;
    } else if (state === 'exporting') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Exporting PPTX...</span>`;
    } else if (state === 'export-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">PPTX Export Failed</span>`;
    } else if (state === 'exported') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> PPTX Exported</span>`;
    } else {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Saved to disk</span>`;
    }
    return true;
  }

  function setStudioSaveButtonState(options = {}) {
    const documentRef = options.documentRef;
    const saveBtn = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('studioSaveBtn')
      : null;
    if (!saveBtn) return false;

    if (options.state === 'saving-version') {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Creating version...</span>`;
      return true;
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] font-bold">bookmarks</span><span>Save Version</span>`;
    return true;
  }

  return { setStudioAutoSaveStatus, setStudioSaveButtonState };
});
