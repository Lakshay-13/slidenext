(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorClipboardController)
      || null;
    const clipboardController = controllerApi
      && typeof controllerApi.createStudioEditorClipboardController === 'function'
      ? controllerApi.createStudioEditorClipboardController({
          clipboardApi: options.clipboardApi
            || (root && root.SlideNextStudioEditorClipboard)
            || null,
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalInsertionApi: options.canonicalInsertionApi
            || (root && root.SlideNextStudioEditorCanonicalInsertion)
            || null,
          deckImportApi: options.deckImportApi
            || (root && root.SlideNextDeckImport)
            || null,
          buildClipboardSelectionMutationPlan: options.buildClipboardSelectionMutationPlan,
          finalizeClipboardActionResult: options.finalizeClipboardActionResult,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          getEditorSlideId: options.getEditorSlideId,
          assignElementId: options.assignElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          insertClipboardPayload: options.insertClipboardPayload,
          finalizeInsertedElements: options.finalizeInsertedElements
        })
      : null;

    return {
      clipboardController
    };
  }

  return {
    createStudioEditorClipboardRuntime
  };
});
