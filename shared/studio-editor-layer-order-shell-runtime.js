(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLayerOrderShellRuntime(options = {}) {
    const layerOrderRuntimeApi = resolveApi(
      options,
      'layerOrderRuntimeApi',
      'SlideNextStudioEditorLayerOrderRuntime'
    );
    if (!layerOrderRuntimeApi
      || typeof layerOrderRuntimeApi.createStudioEditorLayerOrderRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.layerOrderRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorLayerOrderController'
    );
    runtimeOptions.layerOrderApi = resolveApi(
      options,
      'layerOrderApi',
      'SlideNextStudioEditorLayerOrder'
    );
    runtimeOptions.canonicalLayoutApi = resolveApi(
      options,
      'canonicalLayoutApi',
      'SlideNextStudioEditorCanonicalLayout'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );

    return layerOrderRuntimeApi.createStudioEditorLayerOrderRuntime(runtimeOptions);
  }

  return {
    createStudioEditorLayerOrderShellRuntime
  };
});
