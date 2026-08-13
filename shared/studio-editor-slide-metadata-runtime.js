(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMetadataRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideMetadataRuntime(options = {}) {
    const metadataControllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorSlideMetadataController)
      || null;
    const slideMetadataController = metadataControllerApi
      && typeof metadataControllerApi.createStudioEditorSlideMetadataController === 'function'
      ? metadataControllerApi.createStudioEditorSlideMetadataController({
          slideMetadataApi: options.slideMetadataApi
            || (root && root.SlideNextStudioEditorSlideMetadata)
            || null,
          metadataApi: options.metadataApi
            || (root && root.SlideNextStudioEditorNotes)
            || null,
          metadataActions: options.metadataActions
            || (root && root.SlideNextStudioEditorNotesActions)
            || null,
          canonicalMetadataApi: options.canonicalMetadataApi
            || (root && root.SlideNextStudioEditorCanonicalMetadata)
            || null,
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          transactionApi: options.transactionApi
            || (root && root.SlideNextStudioEditorTransaction)
            || null,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          resolveReadyState: options.resolveReadyState,
          getDocument: options.getDocument,
          getActiveSlide: options.getActiveSlide,
          getElementId: options.getElementId,
          finalizeMutation: options.finalizeMutation,
          rollbackMutation: options.rollbackMutation,
          syncChrome: options.syncChrome
        })
      : null;

    return {
      slideMetadataController
    };
  }

  return {
    createStudioEditorSlideMetadataRuntime
  };
});
