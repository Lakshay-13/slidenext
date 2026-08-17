(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderShellComposition = api;
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

  function createStudioEditorLayerOrderShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorLayerOrderRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorLayerOrderRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorLayerOrderController'],
      ['layerOrderApi', 'SlideNextStudioEditorLayerOrder'],
      ['canonicalLayoutApi', 'SlideNextStudioEditorCanonicalLayout'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['layerOrderTransactionApi', 'SlideNextStudioEditorLayerOrderTransaction'],
      ['layerOrderMutationApi', 'SlideNextStudioEditorLayerOrderMutation'],
      ['transactionApi', 'SlideNextStudioEditorTransaction']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorLayerOrderRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorLayerOrderShellRuntime'
      ),
      layerOrderRuntimeApi: resolveApi(
        options,
        'layerOrderRuntimeApi',
        'SlideNextStudioEditorLayerOrderRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.layerOrderController
        ? runtime.layerOrderController
        : null
    };
  }

  return {
    createStudioEditorLayerOrderShellComposition
  };
});
