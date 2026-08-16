(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistableDeckHtmlShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistableDeckHtmlShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistableDeckHtmlAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckHtmlAction === 'function'
      ? actionApi.createStudioEditorPersistableDeckHtmlAction({
          getDocument: options.getDocument,
          getPersistenceController: options.getPersistenceController,
          persistenceApi: resolveApi(
            options,
            'persistenceApi',
            'SlideNextStudioEditorPersistence'
          ),
          deckPersistenceApi: resolveApi(
            options,
            'deckPersistenceApi',
            'SlideNextDeckPersistence'
          ),
          getCurrentPersistedDeckState: options.getCurrentPersistedDeckState,
          getPersistedDeckStateWithContent: options.getPersistedDeckStateWithContent,
          getResolveCanonicalDeckOverride: options.getResolveCanonicalDeckOverride,
          getBuildCanonicalDeck: options.getBuildCanonicalDeck,
          getResolveReusablePersistedHtml: options.getResolveReusablePersistedHtml,
          getSanitizeReusablePersistedHtml: options.getSanitizeReusablePersistedHtml,
          getCreateDeckViewBuildOptions: options.getCreateDeckViewBuildOptions,
          getBuildDeckRenderOptions: options.getBuildDeckRenderOptions,
          getBuildSourceDeckHtml: options.getBuildSourceDeckHtml,
          getCapturePlaybackState: options.getCapturePlaybackState,
          getBuildSanitizerOptions: options.getBuildSanitizerOptions,
          getResolveMetadataPersistenceOptions: options.getResolveMetadataPersistenceOptions
        })
      : null;
    const globalBuilder = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : action;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckHtmlGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistableDeckHtmlGlobalApi({
          buildPersistableDeckHtml: globalBuilder
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistableDeckHtmlAction: action,
      persistableDeckHtmlGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistableDeckHtmlShellRuntime
  };
});
