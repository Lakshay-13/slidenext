(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorBlockStateController(options = {}) {
    const blockView = options.blockView && typeof options.blockView === 'object'
      ? options.blockView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const selectionHasLockedElements = typeof options.selectionHasLockedElements === 'function'
      ? options.selectionHasLockedElements
      : null;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const insertBlock = typeof options.insertBlock === 'function' ? options.insertBlock : null;
    const removeBlock = typeof options.removeBlock === 'function' ? options.removeBlock : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function buildActionState(sourceDoc) {
      const selectedElements = getSelectedElements(sourceDoc);
      const hasLockedSelection = selectionHasLockedElements
        ? selectionHasLockedElements(selectedElements, sourceDoc)
        : Array.isArray(selectedElements) && selectedElements.some((element) => isElementLocked(element));
      const canUseBlockActions = !!getActiveSlide(sourceDoc)
        && Array.isArray(selectedElements)
        && selectedElements.length > 0
        && !hasLockedSelection;
      const canonicalDeck = getCanonicalDeck(sourceDoc);
      return {
        blocks: canonicalDeck && canonicalDeck.blocks,
        canUseBlockActions,
        insertBlock,
        removeBlock
      };
    }

    function sync(doc = getDocument()) {
      if (!blockView || typeof blockView.syncStudioBlockState !== 'function') {
        return false;
      }
      if (typeof blockView.createStudioBlockStateSync === 'function') {
        if (!stateSync) {
          stateSync = blockView.createStudioBlockStateSync({
            getDocument,
            getActionState: buildActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      const actionState = buildActionState(doc);
      const result = blockView.syncStudioBlockState({
        ...actionState,
        documentRef
      });
      return typeof result === 'undefined' ? actionState.canUseBlockActions : result;
    }

    return {
      sync,
      buildActionState
    };
  }

  return {
    createStudioEditorBlockStateController
  };
});
