(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorRemovalStateController(options = {}) {
    const removalView = options.removalView && typeof options.removalView === 'object'
      ? options.removalView
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
    let actionStateBuilder = null;
    let stateSync = null;

    function resolveLockedState(sourceDoc) {
      return getLockedState(sourceDoc);
    }

    function buildActionState(doc = getDocument()) {
      if (!removalView
        || typeof removalView.buildStudioRemovalActionState !== 'function') {
        return {
          selection: [],
          hasSelection: false,
          canRemove: false
        };
      }
      if (typeof removalView.createStudioRemovalActionStateBuilder === 'function') {
        if (!actionStateBuilder) {
          actionStateBuilder = removalView.createStudioRemovalActionStateBuilder({
            getDocument,
            getSelectedElements,
            getActiveSlide,
            getLockedState: resolveLockedState
          });
        }
        if (typeof actionStateBuilder === 'function') return actionStateBuilder(doc);
      }
      const resolvedDoc = doc || getDocument();
      const readLockedState = resolveLockedState(resolvedDoc);
      return removalView.buildStudioRemovalActionState(getSelectedElements(resolvedDoc), {
        isLocked: readLockedState,
        canMutateDeck: () => !!getActiveSlide(resolvedDoc)
      });
    }

    function sync(doc = getDocument()) {
      if (!removalView
        || typeof removalView.syncStudioRemovalToolbarState !== 'function') {
        return false;
      }
      if (typeof removalView.createStudioRemovalToolbarStateSync === 'function') {
        if (!stateSync) {
          stateSync = removalView.createStudioRemovalToolbarStateSync({
            getDocument,
            getActionState: buildActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      const readLockedState = resolveLockedState(doc);
      return removalView.syncStudioRemovalToolbarState({
        documentRef,
        elements: getSelectedElements(doc),
        isLocked: readLockedState,
        canMutateDeck: () => !!getActiveSlide(doc)
      });
    }

    return {
      buildActionState,
      sync
    };
  }

  return {
    createStudioEditorRemovalStateController
  };
});
