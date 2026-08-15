(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckPlaybackStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistedDeckPlaybackStateShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistedDeckPlaybackStateAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistedDeckPlaybackStateAction === 'function'
      ? actionApi.createStudioEditorPersistedDeckPlaybackStateAction({
          getDocument: options.getDocument,
          getPersistenceController: options.getPersistenceController,
          persistenceApi: resolveApi(
            options,
            'persistenceApi',
            'SlideNextStudioEditorPersistence'
          ),
          persistenceStateApi: resolveApi(
            options,
            'persistenceStateApi',
            'SlideNextStudioEditorPersistenceState'
          ),
          deckPersistenceApi: resolveApi(
            options,
            'deckPersistenceApi',
            'SlideNextDeckPersistence'
          ),
          getSlides: options.getSlides,
          slideIdAttr: options.slideIdAttr,
          buildCanonicalDeck: options.buildCanonicalDeck,
          resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorPersistedDeckPlaybackStateGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistedDeckPlaybackStateGlobalApi({
          capturePersistedDeckPlaybackState: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistedDeckPlaybackStateAction: action,
      persistedDeckPlaybackStateGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistedDeckPlaybackStateShellRuntime
  };
});
