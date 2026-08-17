(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedHtmlShellComposition = api;
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

  function createStudioEditorPersistedHtmlShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorPersistedHtmlRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorPersistedHtmlRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null
      };
    }

    const accessors = accessorsApi.createStudioEditorPersistedHtmlRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorPersistedHtmlShellRuntime'
      ),
      runtimeOptions: options.runtimeOptions || null
    });

    return {
      accessors,
      runtime: accessors && accessors.runtime ? accessors.runtime : null
    };
  }

  return {
    createStudioEditorPersistedHtmlShellComposition
  };
});
