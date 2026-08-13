(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAssetRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorAssetController)
      || null;
    const assetController = controllerApi
      && typeof controllerApi.createStudioEditorAssetController === 'function'
      ? controllerApi.createStudioEditorAssetController({
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalStateApi: options.canonicalStateApi
            || (root && root.SlideNextStudioEditorCanonicalState)
            || null,
          getCanonicalDeck: options.getCanonicalDeck,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          getDocument: options.getDocument,
          getActiveSlideId: options.getActiveSlideId,
          getSelectedImage: options.getSelectedImage,
          getElementId: options.getElementId,
          isElementLocked: options.isElementLocked,
          syncInspectorForSelection: options.syncInspectorForSelection,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          finalizeMutation: options.finalizeMutation,
          onAssetsChanged: options.onAssetsChanged
        })
      : null;

    return {
      assetController
    };
  }

  return {
    createStudioEditorAssetRuntime
  };
});
