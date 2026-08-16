(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorZoomToolbarStateController(options = {}) {
    const deckView = options.deckView && typeof options.deckView === 'object'
      ? options.deckView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : () => ({ canUseZoomControls: false });
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function sync(doc = getDocument()) {
      if (!deckView
        || typeof deckView.syncStudioZoomToolbarActionState !== 'function') {
        return false;
      }
      if (typeof deckView.createStudioZoomToolbarActionStateSync === 'function') {
        if (!stateSync) {
          stateSync = deckView.createStudioZoomToolbarActionStateSync({
            getDocument,
            getActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      return deckView.syncStudioZoomToolbarActionState({
        documentRef,
        doc,
        getActiveSlide
      });
    }

    return { sync };
  }

  return {
    createStudioEditorZoomToolbarStateController
  };
});
