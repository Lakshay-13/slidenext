(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorMasterSlideStateController(options = {}) {
    const masterSlideView = options.masterSlideView && typeof options.masterSlideView === 'object'
      ? options.masterSlideView
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
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const findCanonicalSlide = typeof options.findCanonicalSlide === 'function'
      ? options.findCanonicalSlide
      : () => null;
    const applyMasterSlide = typeof options.applyMasterSlide === 'function'
      ? options.applyMasterSlide
      : null;
    const removeMasterSlide = typeof options.removeMasterSlide === 'function'
      ? options.removeMasterSlide
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function buildActionState(sourceDoc) {
      const canonicalDeck = getCanonicalDeck(sourceDoc);
      const activeSlideId = getActiveSlideId(sourceDoc);
      const activeSlide = findCanonicalSlide(canonicalDeck, activeSlideId);
      return {
        masterSlides: canonicalDeck && canonicalDeck.masterSlides,
        activeMasterSlideId: activeSlide && activeSlide.masterSlideId,
        canUseMasterActions: !!getActiveSlide(sourceDoc),
        applyMasterSlide,
        removeMasterSlide
      };
    }

    function sync(doc = getDocument()) {
      if (!masterSlideView || typeof masterSlideView.syncStudioMasterSlideState !== 'function') {
        return false;
      }
      if (typeof masterSlideView.createStudioMasterSlideStateSync === 'function') {
        if (!stateSync) {
          stateSync = masterSlideView.createStudioMasterSlideStateSync({
            getDocument,
            getActionState: buildActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      const actionState = buildActionState(doc);
      const result = masterSlideView.syncStudioMasterSlideState({
        ...actionState,
        documentRef
      });
      return typeof result === 'undefined' ? actionState.canUseMasterActions : result;
    }

    return {
      sync,
      buildActionState
    };
  }

  return {
    createStudioEditorMasterSlideStateController
  };
});
