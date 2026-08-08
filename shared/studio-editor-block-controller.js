(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorBlockController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedNodeIds = typeof options.getSelectedNodeIds === 'function'
      ? options.getSelectedNodeIds
      : () => [];
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;
    const onBlocksChanged = typeof options.onBlocksChanged === 'function'
      ? options.onBlocksChanged
      : null;

    function saveSelection(blockLike = {}) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.saveCanonicalBlockFromNodeIds !== 'function') {
        return null;
      }

      const canonicalDeck = getCanonicalDeck();
      const slideId = getActiveSlideId();
      const nodeIds = getSelectedNodeIds();
      const nextCanonicalDeck = canonicalDeckApi.saveCanonicalBlockFromNodeIds(
        canonicalDeck,
        slideId,
        nodeIds,
        blockLike
      );
      if (!nextCanonicalDeck) return null;

      const block = nextCanonicalDeck.blocks[nextCanonicalDeck.blocks.length - 1] || null;
      if (saveHistoryState) {
        saveHistoryState(false, null, nextCanonicalDeck);
      }
      if (triggerAutoSave) triggerAutoSave();
      if (triggerAutoVersion) {
        triggerAutoVersion(`Auto: Saved Block${block && block.name ? ` "${block.name}"` : ''}`);
      }
      if (onBlocksChanged) onBlocksChanged(nextCanonicalDeck.blocks, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    return {
      saveSelection
    };
  }

  return {
    createStudioEditorBlockController
  };
});
