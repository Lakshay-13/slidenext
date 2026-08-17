(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalShellComposition = api;
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

  function createStudioEditorCanonicalShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorCanonicalRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorCanonicalRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null
      };
    }

    const accessors = accessorsApi.createStudioEditorCanonicalRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorCanonicalShellRuntime'
      ),
      canonicalRuntimeApi: resolveApi(
        options,
        'canonicalRuntimeApi',
        'SlideNextStudioEditorCanonicalRuntime'
      ),
      runtimeOptions: options.runtimeOptions || {}
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime
    };
  }

  return {
    createStudioEditorCanonicalShellComposition
  };
});
