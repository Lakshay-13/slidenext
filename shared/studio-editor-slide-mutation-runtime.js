(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutationRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSlideMutationRuntime(options = {}) {
    const reorderApi = options.reorderApi
      && typeof options.reorderApi.createStudioEditorSlideReorderController === 'function'
      ? options.reorderApi
      : null;
    const insertionApi = options.insertionApi
      && typeof options.insertionApi.createStudioEditorSlideInsertionController === 'function'
      ? options.insertionApi
      : null;
    const deletionApi = options.deletionApi
      && typeof options.deletionApi.createStudioEditorSlideDeletionController === 'function'
      ? options.deletionApi
      : null;
    const duplicationApi = options.duplicationApi
      && typeof options.duplicationApi.createStudioEditorSlideDuplicationController === 'function'
      ? options.duplicationApi
      : null;
    const shared = {
      slideCommandsApi: options.slideCommandsApi,
      canonicalSlideApi: options.canonicalSlideApi,
      canonicalDeckApi: options.canonicalDeckApi,
      deckImportApi: options.deckImportApi,
      transactionApi: options.transactionApi,
      getIframeDoc: options.getIframeDoc,
      getSlides: options.getSlides,
      getSlideId: options.getSlideId,
      buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
      getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
      generateThumbnails: options.generateThumbnails,
      finalizeMutation: options.finalizeMutation,
      rollbackMutation: options.rollbackMutation
    };
    const slideReorderController = reorderApi
      ? reorderApi.createStudioEditorSlideReorderController({
          ...shared,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          captureSlideMutationState: options.captureSlideMutationState,
          applyReorder: options.applyReorder,
          restoreDeckViewAfterSlideMutation: options.restoreDeckViewAfterSlideMutation
        })
      : null;
    const slideInsertionController = insertionApi
      ? insertionApi.createStudioEditorSlideInsertionController({
          ...shared,
          resolveInsertionActionState: options.resolveInsertionActionState,
          createBlankSlide: options.createBlankSlide,
          saveHistoryState: options.saveHistoryState,
          captureSlideMutationState: options.captureSlideMutationState,
          applyInsertion: options.applyInsertion,
          setActiveSlide: options.setActiveSlide,
          restoreDeckViewAfterSlideMutation: options.restoreDeckViewAfterSlideMutation,
          rollbackMutation: options.rollbackMutation
        })
      : null;
    const slideDeletionController = deletionApi
      ? deletionApi.createStudioEditorSlideDeletionController({
          ...shared,
          alert: options.alert,
          captureSlideMutationState: options.captureSlideMutationState,
          applyDeletion: options.applyDeletion,
          restoreDeckViewAfterSlideMutation: options.restoreDeckViewAfterSlideMutation,
          rollbackMutation: options.rollbackMutation
        })
      : null;
    const slideDuplicationController = duplicationApi
      ? duplicationApi.createStudioEditorSlideDuplicationController({
          ...shared,
          resolveInsertionActionState: options.resolveInsertionActionState,
          getActiveSlide: options.getActiveSlide,
          sanitizeDuplicatedSubtree: options.sanitizeDuplicatedSubtree,
          assignSlideId: options.assignSlideId,
          makeElementsHoverable: options.makeElementsHoverable,
          saveHistoryState: options.saveHistoryState,
          applyInsertion: options.applyInsertion,
          setActiveSlide: options.setActiveSlide,
          rollbackMutation: options.rollbackMutation
        })
      : null;

    return {
      slideReorderController,
      slideInsertionController,
      slideDeletionController,
      slideDuplicationController
    };
  }

  return {
    createStudioEditorSlideMutationRuntime
  };
});
