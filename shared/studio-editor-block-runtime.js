(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorBlockRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorBlockController)
      || null;
    const blockController = controllerApi
      && typeof controllerApi.createStudioEditorBlockController === 'function'
      ? controllerApi.createStudioEditorBlockController({
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalStateApi: options.canonicalStateApi
            || (root && root.SlideNextStudioEditorCanonicalState)
            || null,
          renderApi: options.renderApi
            || (root && root.SlideNextDeckRender)
            || null,
          getCanonicalDeck: options.getCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          getActiveSlideId: options.getActiveSlideId,
          getSelectedNodeIds: options.getSelectedNodeIds,
          getDocument: options.getDocument,
          getActiveSlide: options.getActiveSlide,
          prepareElement: options.prepareElement,
          createMarkupTransactionCapture: options.createMarkupTransactionCapture,
          getElementId: options.getElementId,
          finalizeInsertedElements: options.finalizeInsertedElements,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          onBlocksChanged: options.onBlocksChanged
        })
      : null;

    return {
      blockController
    };
  }

  return {
    createStudioEditorBlockRuntime
  };
});
