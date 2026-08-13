(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorAssetStateController(options = {}) {
    const assetView = options.assetView && typeof options.assetView === 'object'
      ? options.assetView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : null;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const applyAsset = typeof options.applyAsset === 'function' ? options.applyAsset : null;
    const insertAsset = typeof options.insertAsset === 'function' ? options.insertAsset : null;
    const removeAsset = typeof options.removeAsset === 'function' ? options.removeAsset : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => '';
    let stateSync = null;

    function resolvePreviewSource(source) {
      if (typeof source !== 'string' || !source.trim()) return '';
      const baseUri = documentRef && typeof documentRef.baseURI === 'string' && documentRef.baseURI
        ? documentRef.baseURI
        : typeof globalThis !== 'undefined'
          && globalThis.window
          && globalThis.window.location
          && typeof globalThis.window.location.href === 'string'
          ? globalThis.window.location.href
          : '';
      if (!baseUri) return source;
      try {
        const presentationUrl = getCurrentPresentationUrl();
        const presentationUri = presentationUrl
          ? new URL(presentationUrl, baseUri).href
          : baseUri;
        return new URL(source, presentationUri).href;
      } catch (error) {
        return source;
      }
    }

    function buildActionState(sourceDoc) {
      const canonicalDeck = getCanonicalDeck(sourceDoc);
      const selectedElements = getSelectedElements(sourceDoc);
      const selectedElement = Array.isArray(selectedElements) && selectedElements.length === 1
        ? selectedElements[0]
        : null;
      const lockedState = getLockedState
        ? getLockedState(sourceDoc, isElementLocked)
        : isElementLocked;
      return {
        assets: canonicalDeck && canonicalDeck.assets,
        selectedElement,
        isElementLocked: lockedState,
        applyAsset,
        insertAsset,
        removeAsset,
        resolvePreviewSource
      };
    }

    function sync(doc = getDocument()) {
      if (!assetView || typeof assetView.syncStudioAssetState !== 'function') {
        return false;
      }
      if (typeof assetView.createStudioAssetStateSync === 'function') {
        if (!stateSync) {
          stateSync = assetView.createStudioAssetStateSync({
            getDocument,
            getActionState: buildActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      return assetView.syncStudioAssetState({
        ...buildActionState(doc),
        documentRef
      });
    }

    return {
      sync,
      buildActionState
    };
  }

  return {
    createStudioEditorAssetStateController
  };
});
