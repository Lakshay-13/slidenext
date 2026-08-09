(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioAssetLibrary(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') {
      return false;
    }
    const list = documentRef.getElementById('savedAssetsList');
    if (!list || typeof documentRef.createElement !== 'function') return false;

    const normalizedAssets = Array.isArray(options.assets) ? options.assets : [];
    const canApply = !!options.canApply;
    const applyAsset = typeof options.applyAsset === 'function' ? options.applyAsset : () => {};
    const canInsert = typeof options.insertAsset === 'function';
    const insertAsset = canInsert ? options.insertAsset : () => {};
    const removeAsset = typeof options.removeAsset === 'function' ? options.removeAsset : () => {};
    const resolvePreviewSource = typeof options.resolvePreviewSource === 'function'
      ? options.resolvePreviewSource
      : (source) => source;
    list.textContent = '';
    if (normalizedAssets.length === 0) {
      const emptyState = documentRef.createElement('span');
      emptyState.textContent = 'No assets saved. Add an asset above to reuse it.';
      list.appendChild(emptyState);
      return true;
    }

    normalizedAssets.forEach((asset) => {
      const row = documentRef.createElement('div');
      row.className = 'flex items-center gap-1';
      const item = documentRef.createElement('span');
      item.className = 'min-w-0 flex-1 truncate rounded px-2 py-1 flex items-center gap-2';
      const assetName = asset && asset.name ? asset.name : 'Unnamed Asset';
      const assetType = asset && asset.type ? asset.type : 'file';
      const assetSource = asset && typeof asset.src === 'string' ? asset.src.trim() : '';
      const previewSource = assetType === 'image' && assetSource
        ? resolvePreviewSource(assetSource, asset)
        : '';
      if (typeof previewSource === 'string' && /^(?:data:image\/|https?:\/\/|blob:|\/)/i.test(previewSource)) {
        const preview = documentRef.createElement('img');
        preview.className = 'h-7 w-7 shrink-0 rounded object-cover border border-white/10 bg-black/20';
        preview.src = previewSource;
        preview.alt = '';
        preview.loading = 'lazy';
        preview.decoding = 'async';
        if (typeof preview.addEventListener === 'function') {
          preview.addEventListener('error', () => {
            preview.hidden = true;
          });
        }
        item.appendChild(preview);
      }
      const label = documentRef.createElement('span');
      label.className = 'min-w-0 truncate';
      label.textContent = `${assetName} - ${assetType}`;
      item.appendChild(label);
      item.title = asset && asset.src ? asset.src : assetName;

      const useButton = documentRef.createElement('button');
      useButton.type = 'button';
      useButton.className = 'shrink-0 rounded px-1.5 py-1 text-zinc-500 hover:bg-[#7028d0]/10 hover:text-[#c4a1ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
      useButton.textContent = 'Use';
      useButton.disabled = !canApply;
      useButton.title = 'Use on selected image';
      useButton.addEventListener('click', () => applyAsset(asset.id));

      const insertButton = documentRef.createElement('button');
      insertButton.type = 'button';
      insertButton.className = 'shrink-0 rounded px-1.5 py-1 text-zinc-500 hover:bg-[#7028d0]/10 hover:text-[#c4a1ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
      insertButton.textContent = 'Insert';
      insertButton.disabled = !canInsert;
      insertButton.title = 'Insert on active slide';
      insertButton.addEventListener('click', () => insertAsset(asset.id));

      const removeButton = documentRef.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'shrink-0 rounded px-1.5 py-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 transition-colors';
      removeButton.textContent = 'Remove';
      removeButton.title = `Remove ${assetName}`;
      removeButton.setAttribute('aria-label', `Remove ${assetName}`);
      removeButton.addEventListener('click', () => removeAsset(asset.id));

      row.appendChild(item);
      row.appendChild(useButton);
      row.appendChild(insertButton);
      row.appendChild(removeButton);
      list.appendChild(row);
    });
    return true;
  }

  function resolveStudioAssetActionState(options = {}) {
    const selectedElement = options.selectedElement;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    return {
      canApplyAsset: !!selectedElement
        && selectedElement.tagName
        && selectedElement.tagName.toLowerCase() === 'img'
        && !isElementLocked(selectedElement)
    };
  }

  function syncStudioAssetState(options = {}) {
    const actionState = resolveStudioAssetActionState(options);
    return renderStudioAssetLibrary({
      ...options,
      canApply: actionState.canApplyAsset
    });
  }

  function createStudioAssetStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : () => ({});
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorAssetState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const actionState = getActionState(resolvedDoc) || {};
        return syncStudioAssetState({
          ...actionState,
          documentRef: getDocumentRef()
        });
      } catch (error) {
        return false;
      }
    };
  }

  return {
    renderStudioAssetLibrary,
    resolveStudioAssetActionState,
    syncStudioAssetState,
    createStudioAssetStateSync
  };
});
