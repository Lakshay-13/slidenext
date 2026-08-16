(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioMasterSlideLibrary(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') {
      return false;
    }
    const select = documentRef.getElementById('masterSlideSelect');
    const list = documentRef.getElementById('savedMasterSlidesList');
    if (!select || !list || typeof documentRef.createElement !== 'function') return false;

    const normalizedMasterSlides = Array.isArray(options.masterSlides) ? options.masterSlides : [];
    const canApply = !!options.canApply;
    const applyMasterSlide = typeof options.applyMasterSlide === 'function' ? options.applyMasterSlide : () => {};
    const removeMasterSlide = typeof options.removeMasterSlide === 'function' ? options.removeMasterSlide : () => {};
    select.textContent = '';
    const emptyOption = documentRef.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'No master layout';
    select.appendChild(emptyOption);
    normalizedMasterSlides.forEach((master) => {
      const option = documentRef.createElement('option');
      option.value = master && master.id ? master.id : '';
      option.textContent = master && master.name ? master.name : 'Unnamed Master Layout';
      select.appendChild(option);
    });
    select.value = options.activeMasterSlideId || '';

    list.textContent = '';
    if (normalizedMasterSlides.length === 0) {
      const emptyState = documentRef.createElement('span');
      emptyState.textContent = 'No master layouts saved. Save the active slide as a master layout.';
      list.appendChild(emptyState);
      return true;
    }
    normalizedMasterSlides.forEach((master) => {
      const row = documentRef.createElement('div');
      row.className = 'flex items-center gap-1';
      const item = documentRef.createElement('button');
      item.type = 'button';
      item.className = 'min-w-0 flex-1 text-left rounded px-2 py-1 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
      const nodeCount = master
        && master.slide
        && Array.isArray(master.slide.nodes)
        ? master.slide.nodes.length
        : 0;
      const masterName = master && master.name ? master.name : 'Unnamed Master Layout';
      item.textContent = `${masterName} - ${nodeCount} base element${nodeCount === 1 ? '' : 's'}`;
      item.disabled = !canApply;
      item.addEventListener('click', () => applyMasterSlide(master.id));

      const removeButton = documentRef.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'shrink-0 rounded px-1.5 py-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 transition-colors';
      removeButton.textContent = 'Remove';
      removeButton.title = `Remove ${masterName}`;
      removeButton.setAttribute('aria-label', `Remove ${masterName}`);
      removeButton.addEventListener('click', () => removeMasterSlide(master.id));

      row.appendChild(item);
      row.appendChild(removeButton);
      list.appendChild(row);
    });
    return true;
  }

  function syncStudioMasterSlideState(options = {}) {
    const documentRef = options.documentRef;
    const canUseMasterActions = !!options.canUseMasterActions;
    if (documentRef && typeof documentRef.getElementById === 'function') {
      [
        'saveActiveSlideMasterBtn',
        'masterSlideNameInput',
        'masterSlideSelect',
        'applyMasterSlideBtn'
      ].forEach((id) => {
        const control = documentRef.getElementById(id);
        if (control) control.disabled = !canUseMasterActions;
      });
    }
    return renderStudioMasterSlideLibrary({
      ...options,
      canApply: canUseMasterActions
    });
  }

  function bindStudioEditorMasterSlideControls(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

    const saveActiveSlideAsMaster = typeof options.saveActiveSlideAsMaster === 'function'
      ? options.saveActiveSlideAsMaster
      : null;
    const applySelectedMasterSlide = typeof options.applySelectedMasterSlide === 'function'
      ? options.applySelectedMasterSlide
      : null;
    const bindings = {};
    [
      ['saveActiveSlideMasterBtn', saveActiveSlideAsMaster],
      ['applyMasterSlideBtn', applySelectedMasterSlide]
    ].forEach(([id, handler]) => {
      const button = documentRef.getElementById(id);
      if (!button || typeof button.addEventListener !== 'function') {
        bindings[id] = false;
        return;
      }
      button.addEventListener('click', () => {
        if (handler) handler();
      });
      bindings[id] = true;
    });
    return bindings;
  }

  function createStudioMasterSlideStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : () => ({});
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorMasterSlideState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const actionState = getActionState(resolvedDoc) || {};
        return syncStudioMasterSlideState({
          ...actionState,
          documentRef: getDocumentRef()
        });
      } catch (error) {
        return false;
      }
    };
  }

  return {
    renderStudioMasterSlideLibrary,
    syncStudioMasterSlideState,
    bindStudioEditorMasterSlideControls,
    createStudioMasterSlideStateSync
  };
});
