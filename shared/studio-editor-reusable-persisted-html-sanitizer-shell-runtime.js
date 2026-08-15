(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorReusablePersistedHtmlSanitizerShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorReusablePersistedHtmlSanitizerShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorReusablePersistedHtmlSanitizerAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorReusablePersistedHtmlSanitizerAction === 'function'
      ? actionApi.createStudioEditorReusablePersistedHtmlSanitizerAction({
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
          buildPersistableDeckHtml: options.buildPersistableDeckHtml,
          buildEditorPersistableDeckSanitizerOptions:
            options.buildEditorPersistableDeckSanitizerOptions,
          getBuildEditorPersistableDeckSanitizerOptions:
            options.getBuildEditorPersistableDeckSanitizerOptions,
          getDeckSanitizerOptions: options.getDeckSanitizerOptions,
          DOMParser: options.DOMParser
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorReusablePersistedHtmlSanitizerGlobalApi === 'function'
      ? actionApi.createStudioEditorReusablePersistedHtmlSanitizerGlobalApi({
          sanitizeEditorReusablePersistedHtml: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      reusablePersistedHtmlSanitizerAction: action,
      reusablePersistedHtmlSanitizerGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorReusablePersistedHtmlSanitizerShellRuntime
  };
});
