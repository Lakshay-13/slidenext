(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetInsertionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorAssetInsertionShellRuntime(options = {}) {
    const assetInsertionApi = resolveApi(
      options,
      'assetInsertionApi',
      'SlideNextStudioEditorAssetInsertion'
    );
    const controller = assetInsertionApi
      && typeof assetInsertionApi.createStudioEditorAssetInsertionController === 'function'
      ? assetInsertionApi.createStudioEditorAssetInsertionController({
          canonicalDeckApi: resolveApi(
            options,
            'canonicalDeckApi',
            'SlideNextCanonicalDeck'
          ),
          getDocument: options.getDocument,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          insertionController: options.insertionController
        })
      : null;

    return {
      isAvailable: !!controller,
      assetInsertionController: controller
    };
  }

  return {
    createStudioEditorAssetInsertionShellRuntime
  };
});
