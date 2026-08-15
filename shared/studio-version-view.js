(function (root, factory) {
  const modalVisibility = typeof module === 'object' && module.exports
    ? require('./studio-modal-visibility.js')
    : root && root.SlideNextStudioModalVisibility;
  const api = factory(modalVisibility);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioVersionView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultModalVisibility) {
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

  function resolveModalVisibility(options = {}) {
    return options.modalVisibility && typeof options.modalVisibility === 'object'
      ? options.modalVisibility
      : defaultModalVisibility;
  }

  function createVersionModalChromeController(options = {}) {
    const visibility = resolveModalVisibility(options);
    const createController = visibility
      && typeof visibility.createStudioModalChromeController === 'function'
      ? visibility.createStudioModalChromeController
      : defaultModalVisibility
        && typeof defaultModalVisibility.createStudioModalChromeController === 'function'
        ? defaultModalVisibility.createStudioModalChromeController
        : null;
    return createController
      ? createController({ modalVisibility: visibility })
      : null;
  }

  function showStudioVersionModal(modal, content, options = {}) {
    const controller = createVersionModalChromeController(options);
    if (!controller || typeof controller.show !== 'function') return false;
    const showOptions = options && typeof options === 'object' ? { ...options } : {};
    delete showOptions.modalVisibility;
    return controller.show(modal, content, showOptions);
  }

  function hideStudioVersionModal(modal, content, options = {}) {
    const controller = createVersionModalChromeController(options);
    if (!controller || typeof controller.hide !== 'function') return false;
    return controller.hide(modal, content);
  }

  function hideStudioVersionModalImmediately(modal, content, options = {}) {
    const controller = createVersionModalChromeController(options);
    if (!controller || typeof controller.hideImmediately !== 'function') return false;
    return controller.hideImmediately(modal, content);
  }

  function openStudioSaveVersionModal(options = {}) {
    const canOpen = typeof options.canOpen === 'function'
      ? options.canOpen()
      : options.canOpen !== false;
    if (!canOpen) return false;

    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const modal = documentRef.getElementById('saveVersionModal');
    const content = documentRef.getElementById('saveVersionModalContent');
    const input = documentRef.getElementById('versionCheckpointName');
    if (!modal || !content || !input) return false;

    input.value = '';
    const modalOptions = {
      modalVisibility: resolveModalVisibility(options),
      forceReflow: true
    };
    const didShow = showStudioVersionModal(modal, content, modalOptions);
    if (didShow === false) return false;

    const visibility = resolveModalVisibility(options);
    const scheduleCallback = visibility
      && typeof visibility.scheduleStudioModalCallback === 'function'
      ? visibility.scheduleStudioModalCallback
      : defaultModalVisibility
        && typeof defaultModalVisibility.scheduleStudioModalCallback === 'function'
        ? defaultModalVisibility.scheduleStudioModalCallback
        : null;
    if (scheduleCallback) {
      scheduleCallback.call(visibility, modal, {
        delayMs: 50,
        callback: () => {
          if (typeof input.focus === 'function') input.focus();
        }
      });
    } else if (typeof input.focus === 'function') {
      input.focus();
    }
    return true;
  }

  function closeStudioSaveVersionModal(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    return hideStudioVersionModal(
      documentRef.getElementById('saveVersionModal'),
      documentRef.getElementById('saveVersionModalContent'),
      options
    );
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

  function setStudioVersionHistoryErrorState(options = {}) {
    const documentRef = options.documentRef;
    const list = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('versionsList')
      : null;
    if (!list) return false;

    list.innerHTML = `
      <span class="text-rose-400 text-center py-2 text-[11px]" role="alert">Failed to load version history</span>
      <button type="button" onclick="loadVersions()" class="mx-2 mb-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white rounded text-[11px] font-semibold transition-all">
        <span class="material-symbols-outlined text-[14px]">refresh</span> Try again
      </button>
    `;
    return true;
  }

  function setStudioVersionHistoryLoadingState(options = {}) {
    const documentRef = options.documentRef;
    const list = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('versionsList')
      : null;
    if (!list) return false;

    list.innerHTML = '<span class="text-zinc-500 text-center py-2 text-[11px]" role="status" aria-live="polite">Loading versions...</span>';
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
    showStudioVersionModal,
    hideStudioVersionModal,
    hideStudioVersionModalImmediately,
    openStudioSaveVersionModal,
    closeStudioSaveVersionModal,
    resetStudioVersionUiState,
    resetStudioRenameVersionButton,
    setStudioRenameVersionButtonBusy,
    setStudioVersionHistoryErrorState,
    setStudioVersionHistoryLoadingState,
    renderStudioVersionsList,
    syncStudioVersionsList
  };
});
