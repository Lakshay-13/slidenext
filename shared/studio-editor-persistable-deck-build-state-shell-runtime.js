(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistableDeckBuildStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistableDeckBuildStateShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistableDeckBuildStateAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckBuildStateAction === 'function'
      ? actionApi.createStudioEditorPersistableDeckBuildStateAction({
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
          buildPersistableDeckHtml: options.buildPersistableDeckHtml,
          getBuildPersistableDeckHtml: options.getBuildPersistableDeckHtml
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckBuildStateGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistableDeckBuildStateGlobalApi({
          captureEditorPersistableDeckBuildState: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistableDeckBuildStateAction: action,
      persistableDeckBuildStateGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistableDeckBuildStateShellRuntime
  };
});
