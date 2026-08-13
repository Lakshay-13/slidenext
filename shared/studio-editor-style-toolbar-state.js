(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorStyleToolbarStateController(options = {}) {
    const styleView = options.styleView && typeof options.styleView === 'object'
      ? options.styleView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function resolveLockedState(sourceDoc) {
      return getLockedState(sourceDoc);
    }

    function sync(doc = getDocument()) {
      if (!styleView || typeof styleView.syncStudioStyleToolbarState !== 'function') {
        return false;
      }
      if (typeof styleView.createStudioStyleToolbarStateSync === 'function') {
        if (!stateSync) {
          stateSync = styleView.createStudioStyleToolbarStateSync({
            getDocument,
            getSelectedElements,
            getActiveSlide,
            getLockedState: resolveLockedState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      const readLockedState = resolveLockedState(doc);
      return styleView.syncStudioStyleToolbarState({
        documentRef,
        elements: getSelectedElements(doc),
        isLocked: readLockedState,
        canMutateDeck: () => !!getActiveSlide(doc)
      });
    }

    return { sync };
  }

  return {
    createStudioEditorStyleToolbarStateController
  };
});
