(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistableDeckStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistableDeckStateShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistableDeckStateAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckStateAction === 'function'
      ? actionApi.createStudioEditorPersistableDeckStateAction({
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
          getCaptureBuildState: options.getCaptureBuildState,
          getResolveCapturedState: options.getResolveCapturedState,
          getCapturePlaybackState: options.getCapturePlaybackState,
          resolveCanonicalDeck: options.resolveCanonicalDeck
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckStateGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistableDeckStateGlobalApi({
          captureEditorPersistableDeckState: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistableDeckStateAction: action,
      persistableDeckStateGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistableDeckStateShellRuntime
  };
});
