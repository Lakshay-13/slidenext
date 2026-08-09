(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresentationMetadataController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPresentationMetadataController(options = {}) {
    const persistenceApi = options.persistenceApi
      || (root && root.SlideNextStudioEditorPersistence)
      || null;
    const setCurrentPresentationMetadata = typeof options.setCurrentPresentationMetadata === 'function'
      ? options.setCurrentPresentationMetadata
      : () => {};
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;
    const resolveStoredCanonicalDeck = typeof options.resolveStoredCanonicalDeck === 'function'
      ? options.resolveStoredCanonicalDeck
      : () => null;
    const applyPersistedDeckState = typeof options.applyPersistedDeckState === 'function'
      ? options.applyPersistedDeckState
      : () => {};
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => {};
    const updateDeckReadyToolbarActionState = typeof options.updateDeckReadyToolbarActionState === 'function'
      ? options.updateDeckReadyToolbarActionState
      : () => {};
    const loadPresentationMetadata = typeof options.loadPresentationMetadata === 'function'
      ? options.loadPresentationMetadata
      : null;
    const resolveLoadOptions = typeof options.resolveLoadOptions === 'function'
      ? options.resolveLoadOptions
      : () => ({});

    function apply(metadata, applyOptions = {}) {
      const nextMetadata = metadata || null;
      setCurrentPresentationMetadata(nextMetadata);
      if (!applyOptions.syncPersistedCanonicalDeck || !nextMetadata) {
        return nextMetadata;
      }

      if (!persistenceApi
        || typeof persistenceApi.syncStudioPresentationMetadataPersistedCanonicalDeck !== 'function') {
        return nextMetadata;
      }

      persistenceApi.syncStudioPresentationMetadataPersistedCanonicalDeck(nextMetadata, {
        presentationUrl: typeof getCurrentPresentationUrl() === 'string'
          ? getCurrentPresentationUrl()
          : '',
        resolveStoredCanonicalDeck,
        applyPersistedDeckState,
        getIframeDoc,
        generateThumbnails,
        syncStudioChromeToActiveSlide,
        updateDeckReadyToolbarActionState
      });
      return nextMetadata;
    }

    function load(presentationUrl = getCurrentPresentationUrl(), presentationTitle = '', sessionToken = null) {
      if (!loadPresentationMetadata) return null;
      const loadOptions = resolveLoadOptions(sessionToken);
      return loadPresentationMetadata(
        presentationUrl,
        presentationTitle,
        loadOptions && typeof loadOptions === 'object' ? loadOptions : {}
      );
    }

    return { apply, load };
  }

  return {
    createStudioEditorPresentationMetadataController
  };
});
