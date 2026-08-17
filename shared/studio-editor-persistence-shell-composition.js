(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorPersistenceShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorPersistenceRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorPersistenceRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null
      };
    }

    const accessors = accessorsApi.createStudioEditorPersistenceRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorPersistenceShellRuntime'
      ),
      persistenceRuntimeApi: resolveApi(
        options,
        'persistenceRuntimeApi',
        'SlideNextStudioEditorPersistenceRuntime'
      ),
      runtimeOptions: options.runtimeOptions || null
    });

    return {
      accessors,
      runtime: accessors && accessors.runtime ? accessors.runtime : null
    };
  }

  return {
    createStudioEditorPersistenceShellComposition
  };
});
