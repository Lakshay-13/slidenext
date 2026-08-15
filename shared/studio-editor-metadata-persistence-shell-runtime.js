(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMetadataPersistenceShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorMetadataPersistenceShellRuntime(options = {}) {
    const actionApi = resolveApi(
      options,
      'actionApi',
      'SlideNextStudioEditorMetadataPersistenceAction'
    );
    const action = actionApi
      && typeof actionApi.createStudioEditorMetadataPersistenceAction === 'function'
      ? actionApi.createStudioEditorMetadataPersistenceAction({
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
          getCurrentPresentationMetadata: options.getCurrentPresentationMetadata,
          resolveMergedPresentationPersistenceOptions:
            options.resolveMergedPresentationPersistenceOptions,
          resolvePresentationPersistenceOptions:
            options.resolvePresentationPersistenceOptions,
          mergePresentationPersistenceOptions:
            options.mergePresentationPersistenceOptions
        })
      : null;
    const globalApi = actionApi
      && typeof actionApi.createStudioEditorMetadataPersistenceGlobalApi === 'function'
      ? actionApi.createStudioEditorMetadataPersistenceGlobalApi({
          resolveEditorMetadataPersistenceOptions: action
        })
      : {};

    return {
      isAvailable: typeof action === 'function',
      metadataPersistenceAction: action,
      metadataPersistenceGlobalApi: globalApi
    };
  }

  return {
    createStudioEditorMetadataPersistenceShellRuntime
  };
});
