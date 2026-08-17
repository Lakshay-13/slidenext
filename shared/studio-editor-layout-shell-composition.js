(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutShellComposition = api;
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

  function createStudioEditorLayoutShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorLayoutAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorLayoutAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null
      };
    }

    const accessors = accessorsApi.createStudioEditorLayoutAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorLayoutShellRuntime'
      ),
      layoutRuntimeApi: resolveApi(
        options,
        'layoutRuntimeApi',
        'SlideNextStudioEditorLayoutRuntime'
      ),
      runtimeOptions: options.runtimeOptions || null
    });

    return {
      accessors,
      runtime: accessors && accessors.runtime ? accessors.runtime : null
    };
  }

  return {
    createStudioEditorLayoutShellComposition
  };
});
