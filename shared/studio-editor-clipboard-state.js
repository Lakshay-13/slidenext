(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorClipboardStateController(options = {}) {
    const clipboardView = options.clipboardView && typeof options.clipboardView === 'object'
      ? options.clipboardView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getClipboard = typeof options.getClipboard === 'function'
      ? options.getClipboard
      : () => null;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const syncBlockState = typeof options.syncBlockState === 'function'
      ? options.syncBlockState
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function resolveLockedState(sourceDoc) {
      return getLockedState(sourceDoc);
    }

    function refreshBlockState(doc) {
      if (!syncBlockState) return;
      try {
        syncBlockState(doc);
      } catch (err) {
        // Block chrome is secondary; clipboard controls still need to reflect the live selection.
      }
    }

    function sync(doc = getDocument()) {
      if (!clipboardView || typeof clipboardView.syncStudioClipboardToolbarState !== 'function') {
        return false;
      }
      refreshBlockState(doc);
      if (typeof clipboardView.createStudioClipboardToolbarStateSync === 'function') {
        if (!stateSync) {
          stateSync = clipboardView.createStudioClipboardToolbarStateSync({
            getDocument,
            getSelectedElements,
            getClipboard,
            getLockedState: resolveLockedState,
            getActiveSlide,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      const readLockedState = resolveLockedState(doc);
      return clipboardView.syncStudioClipboardToolbarState({
        documentRef,
        elements: getSelectedElements(doc),
        clipboard: getClipboard(doc),
        isLocked: readLockedState,
        canMutateDeck: () => !!getActiveSlide(doc)
      });
    }

    return { sync };
  }

  return {
    createStudioEditorClipboardStateController
  };
});
