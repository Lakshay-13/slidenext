(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorLockToolbarStateController(options = {}) {
    const lockView = options.lockView && typeof options.lockView === 'object'
      ? options.lockView
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
      if (!lockView || typeof lockView.syncStudioLockToolbarState !== 'function') {
        return false;
      }
      if (typeof lockView.createStudioLockToolbarStateSync === 'function') {
        if (!stateSync) {
          stateSync = lockView.createStudioLockToolbarStateSync({
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
      return lockView.syncStudioLockToolbarState({
        documentRef,
        elements: getSelectedElements(doc),
        isLocked: readLockedState,
        canMutateDeck: () => !!getActiveSlide(doc)
      });
    }

    return { sync };
  }

  return {
    createStudioEditorLockToolbarStateController
  };
});
