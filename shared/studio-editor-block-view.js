(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioBlockLibrary(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') {
      return false;
    }
    const list = documentRef.getElementById('savedBlocksList');
    if (!list || typeof documentRef.createElement !== 'function') return false;

    const normalizedBlocks = Array.isArray(options.blocks) ? options.blocks : [];
    const canInsert = !!options.canInsert;
    const insertBlock = typeof options.insertBlock === 'function' ? options.insertBlock : () => {};
    const removeBlock = typeof options.removeBlock === 'function' ? options.removeBlock : () => {};
    list.textContent = '';
    if (normalizedBlocks.length === 0) {
      const emptyState = documentRef.createElement('span');
      emptyState.textContent = 'No reusable blocks saved. Select elements and save a block.';
      list.appendChild(emptyState);
      return true;
    }

    normalizedBlocks.forEach((block) => {
      const row = documentRef.createElement('div');
      row.className = 'flex items-center gap-1';
      const item = documentRef.createElement('button');
      item.type = 'button';
      item.className = 'min-w-0 flex-1 text-left rounded px-2 py-1 hover:bg-white/5 hover:text-white transition-colors';
      const nodeCount = Array.isArray(block && block.nodes) ? block.nodes.length : 0;
      const blockName = block && block.name ? block.name : 'Unnamed Block';
      item.textContent = `${blockName} - ${nodeCount} element${nodeCount === 1 ? '' : 's'}`;
      item.disabled = !canInsert;
      item.addEventListener('click', () => insertBlock(block.id));

      const removeButton = documentRef.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'shrink-0 rounded px-1.5 py-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 transition-colors';
      removeButton.textContent = 'Remove';
      removeButton.title = `Remove ${blockName}`;
      removeButton.setAttribute('aria-label', `Remove ${blockName}`);
      removeButton.addEventListener('click', () => removeBlock(block.id));

      row.appendChild(item);
      row.appendChild(removeButton);
      list.appendChild(row);
    });
    return true;
  }

  function syncStudioBlockState(options = {}) {
    const documentRef = options.documentRef;
    const canUseBlockActions = !!options.canUseBlockActions;
    if (documentRef && typeof documentRef.getElementById === 'function') {
      ['saveSelectionBlockBtn', 'blockNameInput'].forEach((id) => {
        const control = documentRef.getElementById(id);
        if (control) control.disabled = !canUseBlockActions;
      });
    }
    return renderStudioBlockLibrary({
      ...options,
      canInsert: canUseBlockActions
    });
  }

  return {
    renderStudioBlockLibrary,
    syncStudioBlockState
  };
});
