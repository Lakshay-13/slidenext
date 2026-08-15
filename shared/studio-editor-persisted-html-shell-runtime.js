(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedHtmlShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistedHtmlShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorPersistedHtmlAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorPersistedHtmlAction === 'function'
      ? actionApi.createStudioEditorPersistedHtmlAction({
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
      && typeof actionApi.createStudioEditorPersistedHtmlGlobalApi === 'function'
      ? actionApi.createStudioEditorPersistedHtmlGlobalApi({
          resolveEditorReusablePersistedHtml: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      persistedHtmlAction: action,
      persistedHtmlGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorPersistedHtmlShellRuntime
  };
});
