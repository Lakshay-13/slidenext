(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementInsertionRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorElementInsertionRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorElementInsertionController)
      || null;
    const elementInsertionController = controllerApi
      && typeof controllerApi.createStudioEditorElementInsertionController === 'function'
      ? controllerApi.createStudioEditorElementInsertionController({
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalInsertionApi: options.canonicalInsertionApi
            || (root && root.SlideNextStudioEditorCanonicalInsertion)
            || null,
          deckImportApi: options.deckImportApi
            || (root && root.SlideNextDeckImport)
            || null,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          getEditorSlideId: options.getEditorSlideId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyElementInsertion: options.applyElementInsertion,
          makeElementsHoverable: options.makeElementsHoverable,
          assignElementId: options.assignElementId,
          finalizeInsertedElements: options.finalizeInsertedElements,
          selectElement: options.selectElement,
          generateThumbnails: options.generateThumbnails,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          updateInsertionActionState: options.updateInsertionActionState
        })
      : null;

    return {
      elementInsertionController
    };
  }

  return {
    createStudioEditorElementInsertionRuntime
  };
});
