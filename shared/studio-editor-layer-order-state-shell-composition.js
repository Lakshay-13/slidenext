(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderStateShellComposition = api;
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

  function createStudioEditorLayerOrderStateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorLayerOrderStateAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorLayerOrderStateAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const layerOrderStateApi = resolveApi(
      options,
      'layerOrderStateApi',
      'SlideNextStudioEditorLayerOrderState',
      runtimeOptions
    );
    runtimeOptions.layerOrderApi = resolveApi(
      options,
      'layerOrderApi',
      'SlideNextStudioEditorLayerOrder',
      runtimeOptions
    );

    const accessors = accessorsApi.createStudioEditorLayerOrderStateAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorLayerOrderStateShellRuntime'
      ),
      layerOrderStateApi,
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.isAvailable === true
        ? runtime.layerOrderStateController
        : null
    };
  }

  return {
    createStudioEditorLayerOrderStateShellComposition
  };
});
