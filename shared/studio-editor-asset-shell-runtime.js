(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorAssetShellRuntime(options = {}) {
    const assetRuntimeApi = resolveApi(
      options,
      'assetRuntimeApi',
      'SlideNextStudioEditorAssetRuntime'
    );
    if (!assetRuntimeApi
      || typeof assetRuntimeApi.createStudioEditorAssetRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.assetRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorAssetController'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.canonicalStateApi = resolveApi(
      options,
      'canonicalStateApi',
      'SlideNextStudioEditorCanonicalState'
    );

    return assetRuntimeApi.createStudioEditorAssetRuntime(runtimeOptions);
  }

  return {
    createStudioEditorAssetShellRuntime
  };
});
