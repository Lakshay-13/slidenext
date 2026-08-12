(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistenceShellRuntime(options = {}) {
    const persistenceRuntimeApi = resolveApi(
      options,
      'persistenceRuntimeApi',
      'SlideNextStudioEditorPersistenceRuntime'
    );
    if (!persistenceRuntimeApi
      || typeof persistenceRuntimeApi.createStudioEditorPersistenceRuntime !== 'function') {
      return null;
    }

    return persistenceRuntimeApi.createStudioEditorPersistenceRuntime(
      options.runtimeOptions || {}
    );
  }

  return {
    createStudioEditorPersistenceShellRuntime
  };
});
