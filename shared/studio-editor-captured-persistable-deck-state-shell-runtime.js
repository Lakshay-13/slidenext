(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCapturedPersistableDeckStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorCapturedPersistableDeckStateShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorCapturedPersistableDeckStateAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorCapturedPersistableDeckStateAction === 'function'
      ? actionApi.createStudioEditorCapturedPersistableDeckStateAction({
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
          )
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorCapturedPersistableDeckStateGlobalApi === 'function'
      ? actionApi.createStudioEditorCapturedPersistableDeckStateGlobalApi({
          resolveEditorCapturedPersistableDeckState: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      capturedPersistableDeckStateAction: action,
      capturedPersistableDeckStateGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorCapturedPersistableDeckStateShellRuntime
  };
});
