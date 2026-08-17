(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellStateComposition = api;
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

  function createStudioEditorShellStateComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorShellStateRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorShellStateRuntimeAccessors !== 'function') {
      return {
        accessors: { runtime: null },
        runtime: null
      };
    }

    const accessors = accessorsApi.createStudioEditorShellStateRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorShellStateRuntime'
      ),
      runtimeOptions: options.runtimeOptions || null
    });

    return {
      accessors,
      runtime: accessors && accessors.runtime ? accessors.runtime : null
    };
  }

  return {
    createStudioEditorShellStateComposition
  };
});
