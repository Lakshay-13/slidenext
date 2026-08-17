(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalStateShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName, fallbackOptions = null) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    if (fallbackOptions && hasOwn(fallbackOptions, optionName)) {
      return fallbackOptions[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorRemovalStateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorRemovalStateAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorRemovalStateAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const removalStateApi = resolveApi(
      options,
      'removalStateApi',
      'SlideNextStudioEditorRemovalState',
      runtimeOptions
    );
    runtimeOptions.removalView = resolveApi(
      options,
      'removalView',
      'SlideNextStudioEditorRemoval',
      runtimeOptions
    );

    const accessors = accessorsApi.createStudioEditorRemovalStateAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorRemovalStateShellRuntime'
      ),
      removalStateApi,
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.isAvailable === true
        ? runtime.removalStateController
        : null
    };
  }

  return {
    createStudioEditorRemovalStateShellComposition
  };
});
