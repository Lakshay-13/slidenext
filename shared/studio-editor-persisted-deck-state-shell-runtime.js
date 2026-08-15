(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistedDeckStateShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistedDeckStateAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistedDeckStateAction === 'function'
      ? actionApi.createStudioEditorPersistedDeckStateAction({
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
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          normalizePlaybackState: options.normalizePlaybackState,
          setPersistedDeckHtml: options.setPersistedDeckHtml,
          setPersistedCanonicalDeck: options.setPersistedCanonicalDeck,
          setPersistedPlaybackState: options.setPersistedPlaybackState
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorPersistedDeckStateGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistedDeckStateGlobalApi({
          updateEditorPersistedDeckState: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistedDeckStateAction: action,
      persistedDeckStateGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistedDeckStateShellRuntime
  };
});
