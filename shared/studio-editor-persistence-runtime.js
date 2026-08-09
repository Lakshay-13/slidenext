(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistenceRuntime(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveApi = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const controllerApi = resolveApi(
      'controllerApi',
      'SlideNextStudioEditorPersistenceController'
    );
    const persistenceController = controllerApi
      && typeof controllerApi.createStudioEditorPersistenceController === 'function'
      ? controllerApi.createStudioEditorPersistenceController({
          persistenceApi: resolveApi(
            'persistenceApi',
            'SlideNextStudioEditorPersistence'
          ),
          persistenceStateApi: resolveApi(
            'persistenceStateApi',
            'SlideNextStudioEditorPersistenceState'
          ),
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          normalizePlaybackState: options.normalizePlaybackState,
          setPersistedDeckHtml: options.setPersistedDeckHtml,
          setPersistedCanonicalDeck: options.setPersistedCanonicalDeck,
          setPersistedPlaybackState: options.setPersistedPlaybackState,
          currentPresentationUrl: options.currentPresentationUrl,
          getCurrentPresentationUrl: options.getCurrentPresentationUrl,
          currentSessionToken: options.currentSessionToken,
          getCurrentSessionToken: options.getCurrentSessionToken,
          currentPresentationMetadata: options.currentPresentationMetadata,
          getCurrentPresentationMetadata: options.getCurrentPresentationMetadata,
          resolveMergedPresentationPersistenceOptions: options.resolveMergedPresentationPersistenceOptions,
          resolvePresentationPersistenceOptions: options.resolvePresentationPersistenceOptions,
          mergePresentationPersistenceOptions: options.mergePresentationPersistenceOptions,
          createSessionReaderOptions: options.createSessionReaderOptions,
          applyPersistedDeckState: options.applyPersistedDeckState,
          createHandlerOptions: options.createHandlerOptions,
          createVersionHandlerOptions: options.createVersionHandlerOptions,
          setCurrentPresentationCanonicalDeck: options.setCurrentPresentationCanonicalDeck,
          isCanonicalDeck: options.isCanonicalDeck,
          getPersistedDeckHtml: options.getPersistedDeckHtml,
          getPersistedCanonicalDeck: options.getPersistedCanonicalDeck,
          getPersistedPlaybackState: options.getPersistedPlaybackState,
          deckPersistenceApi: options.deckPersistenceApi,
          getSlides: options.getSlides,
          slideIdAttr: options.slideIdAttr,
          resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId
        })
      : null;

    return {
      persistenceController
    };
  }

  return {
    createStudioEditorPersistenceRuntime
  };
});
