(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceRuntimeOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, name, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      return options[name];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistenceRuntimeOptions(options = {}) {
    return {
      controllerApi: resolveDependency(
        options,
        'controllerApi',
        'SlideNextStudioEditorPersistenceController'
      ),
      persistenceApi: resolveDependency(
        options,
        'persistenceApi',
        'SlideNextStudioEditorPersistence'
      ),
      persistenceStateApi: resolveDependency(
        options,
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
      deckPersistenceApi: resolveDependency(
        options,
        'deckPersistenceApi',
        'SlideNextDeckPersistence'
      ),
      getSlides: options.getSlides,
      slideIdAttr: options.slideIdAttr,
      resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId
    };
  }

  return {
    createStudioEditorPersistenceRuntimeOptions
  };
});
