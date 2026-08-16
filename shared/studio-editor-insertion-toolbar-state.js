(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInsertionToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorInsertionToolbarStateController(options = {}) {
    const deckView = options.deckView && typeof options.deckView === 'object'
      ? options.deckView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : () => ({ canAddSlide: false, canDuplicateSlide: false, canInsertElements: false });
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : () => null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function sync(doc = getDocument()) {
      if (!deckView
        || typeof deckView.syncStudioInsertionToolbarActionState !== 'function') {
        return false;
      }
      if (typeof deckView.createStudioInsertionToolbarActionStateSync === 'function') {
        if (!stateSync) {
          stateSync = deckView.createStudioInsertionToolbarActionStateSync({
            getDocument,
            getActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      return deckView.syncStudioInsertionToolbarActionState({
        documentRef,
        doc,
        getActiveSlide,
        getSlideContainer
      });
    }

    return { sync };
  }

  return {
    createStudioEditorInsertionToolbarStateController
  };
});
