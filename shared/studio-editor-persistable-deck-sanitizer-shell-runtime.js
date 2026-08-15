(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistableDeckSanitizerShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistableDeckSanitizerShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistableDeckSanitizerAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckSanitizerAction === 'function'
      ? actionApi.createStudioEditorPersistableDeckSanitizerAction({
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
          getDeckSanitizerOptions: options.getDeckSanitizerOptions
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorPersistableDeckSanitizerGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistableDeckSanitizerGlobalApi({
          buildEditorPersistableDeckSanitizerOptions: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistableDeckSanitizerAction: action,
      persistableDeckSanitizerGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistableDeckSanitizerShellRuntime
  };
});
