(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVisibilityToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorVisibilityToolbarStateController(options = {}) {
    const visibilityView = options.visibilityView && typeof options.visibilityView === 'object'
      ? options.visibilityView
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
    const getHiddenState = typeof options.getHiddenState === 'function'
      ? options.getHiddenState
      : () => () => false;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function resolveHiddenState(sourceDoc) {
      return getHiddenState(sourceDoc);
    }

    function sync(doc = getDocument()) {
      if (!visibilityView
        || typeof visibilityView.syncStudioVisibilityToolbarState !== 'function') {
        return false;
      }
      if (typeof visibilityView.createStudioVisibilityToolbarStateSync === 'function') {
        if (!stateSync) {
          stateSync = visibilityView.createStudioVisibilityToolbarStateSync({
            getDocument,
            getSelectedElements,
            getActiveSlide,
            getHiddenState: resolveHiddenState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      const readHiddenState = resolveHiddenState(doc);
      return visibilityView.syncStudioVisibilityToolbarState({
        documentRef,
        elements: getSelectedElements(doc),
        isHidden: readHiddenState,
        canMutateDeck: () => !!getActiveSlide(doc)
      });
    }

    return { sync };
  }

  return {
    createStudioEditorVisibilityToolbarStateController
  };
});
