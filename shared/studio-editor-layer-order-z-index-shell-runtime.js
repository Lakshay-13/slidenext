(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderZIndexShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLayerOrderZIndexShellRuntime(options = {}) {
    const layerOrderApi = resolveApi(
      options,
      'layerOrderApi',
      'SlideNextStudioEditorLayerOrder'
    );
    const synchronizer = layerOrderApi
      && typeof layerOrderApi.createStudioLayerOrderZIndexInputSynchronizer === 'function'
      ? layerOrderApi.createStudioLayerOrderZIndexInputSynchronizer({
          getDocument: options.getDocument,
          getDocumentRef: options.getDocumentRef,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          resolveCanonicalNode: options.resolveCanonicalNode
        })
      : null;

    return {
      isAvailable: typeof synchronizer === 'function',
      sync: typeof synchronizer === 'function' ? synchronizer : null
    };
  }

  return {
    createStudioEditorLayerOrderZIndexShellRuntime
  };
});
