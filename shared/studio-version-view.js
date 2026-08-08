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

  function toggleStudioVersionsDropdown(options = {}) {
    const documentRef = options.documentRef;
    const dropdown = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('versionsDropdown')
      : null;
    if (!dropdown || !dropdown.classList || typeof dropdown.classList.toggle !== 'function') {
      return { didToggle: false, shouldOpen: false };
    }

    const shouldOpen = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    return { didToggle: true, shouldOpen };
  }

  function resetStudioVersionUiState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    const isLoading = !!options.isLoading;
    hideStudioVersionsDropdown({ documentRef });

    const versionsList = documentRef.getElementById('versionsList');
    if (versionsList) {
      versionsList.innerHTML = `<span class="text-zinc-500 text-center py-2 text-[11px]">${isLoading ? 'Loading versions...' : 'No versions saved yet'}</span>`;
    }

    const hideVersionModalImmediately = typeof options.hideVersionModalImmediately === 'function'
      ? options.hideVersionModalImmediately
      : () => {};
    const resetRenameVersionState = typeof options.resetRenameVersionState === 'function'
      ? options.resetRenameVersionState
      : () => {};
    const resetRenameVersionButtonState = typeof options.resetRenameVersionButtonState === 'function'
      ? options.resetRenameVersionButtonState
      : () => {};

    const saveVersionModal = documentRef.getElementById('saveVersionModal');
    const saveVersionModalContent = documentRef.getElementById('saveVersionModalContent');
    const saveVersionNameInput = documentRef.getElementById('versionCheckpointName');
    if (saveVersionNameInput) {
      saveVersionNameInput.value = '';
    }
    hideVersionModalImmediately(saveVersionModal, saveVersionModalContent);

    const renameVersionModal = documentRef.getElementById('renameVersionModal');
    const renameVersionModalContent = documentRef.getElementById('renameVersionModalContent');
    const renameVersionInput = documentRef.getElementById('newVersionNameInput');
    const confirmRenameVersionBtn = documentRef.getElementById('confirmRenameVersionBtn');
    resetRenameVersionState();
    if (renameVersionInput) {
      renameVersionInput.value = '';
    }
    resetRenameVersionButtonState(confirmRenameVersionBtn);
    hideVersionModalImmediately(renameVersionModal, renameVersionModalContent);
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

  function renderStudioVersionsList(options = {}) {
    const documentRef = options.documentRef;
    const list = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('versionsList')
      : null;
    if (!list) return false;

    const versions = Array.isArray(options.versions) ? options.versions : [];
    if (versions.length === 0) {
      list.innerHTML = '<span class="text-zinc-500 text-center py-2 text-[11px]">No versions saved yet</span>';
      return true;
    }

    const deriveVersionDisplayLabel = typeof options.deriveVersionDisplayLabel === 'function'
      ? options.deriveVersionDisplayLabel
      : (filename) => filename;
    const baseName = options.baseName || '';
    list.innerHTML = versions.map((version) => {
      const dateValue = new Date(version.createdAt);
      const date = dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' '
        + dateValue.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const label = deriveVersionDisplayLabel(version.filename, baseName);

      return `
          <div class="w-full px-3 py-1.5 hover:bg-white/5 rounded transition-all font-sans text-xs flex justify-between items-center group/item text-zinc-300 relative">
            <div onclick="restoreVersion('${version.filename}')" class="flex flex-col cursor-pointer flex-1 truncate pr-2">
              <span class="truncate font-semibold text-zinc-200 group-hover/item:text-white">${label}</span>
              <span class="text-zinc-500 font-mono text-[9px] mt-0.5">${date}</span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button onclick="event.stopPropagation(); promptRenameVersion('${version.filename}', '${label.replace(/'/g, "\\'")}')" class="p-1 hover:bg-white/10 hover:text-[#7028d0] text-zinc-400 rounded transition-all flex items-center justify-center" title="Rename Version">
                <span class="material-symbols-outlined text-[14px]">edit</span>
              </button>
              <button onclick="event.stopPropagation(); deleteVersion('${version.filename}')" class="p-1 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded transition-all flex items-center justify-center" title="Delete Version">
                <span class="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
        `;
    }).join('');
    return true;
  }

  function syncStudioVersionsList(options = {}) {
    const deriveVersionDeckBaseName = typeof options.deriveVersionDeckBaseName === 'function'
      ? options.deriveVersionDeckBaseName
      : null;
    const baseName = options.baseName || (deriveVersionDeckBaseName
      ? deriveVersionDeckBaseName(options.presentationUrl)
      : '');
    return renderStudioVersionsList({
      ...options,
      baseName
    });
  }

  return {
    hideStudioVersionsDropdown,
    toggleStudioVersionsDropdown,
    resetStudioVersionUiState,
    resetStudioRenameVersionButton,
    setStudioRenameVersionButtonBusy,
    renderStudioVersionsList,
    syncStudioVersionsList
  };
});
