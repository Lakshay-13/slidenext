(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorFrameRuntime(options = {}) {
    const interactionStateApi = options.interactionStateApi
      && typeof options.interactionStateApi.createStudioEditorFrameInteractionStateController === 'function'
      ? options.interactionStateApi
      : null;
    const frameInteractionsApi = options.frameInteractionsApi
      && typeof options.frameInteractionsApi.createStudioEditorFrameInteractions === 'function'
      ? options.frameInteractionsApi
      : null;
    const frameControllerApi = options.frameControllerApi
      && typeof options.frameControllerApi.createStudioEditorFrameController === 'function'
      ? options.frameControllerApi
      : null;

    const frameInteractionStateController = interactionStateApi
      ? interactionStateApi.createStudioEditorFrameInteractionStateController({})
      : null;
    const frameInteractions = frameInteractionsApi
      ? frameInteractionsApi.createStudioEditorFrameInteractions({
          eventsApi: options.eventsApi,
          inlineTextEditApi: options.inlineTextEditApi,
          getIsDragging: () => frameInteractionStateController
            && typeof frameInteractionStateController.getIsDraggingElement === 'function'
            ? frameInteractionStateController.getIsDraggingElement()
            : false,
          consumeClickSuppression: () => frameInteractionStateController
            && typeof frameInteractionStateController.consumeClickSuppression === 'function'
            ? frameInteractionStateController.consumeClickSuppression()
            : false,
          shouldIgnoreTarget: options.shouldIgnoreTarget,
          resolveEditableTarget: options.resolveEditableTarget,
          selectElement: options.selectElement,
          deselectElement: options.deselectElement,
          getActiveSlide: options.getActiveSlide,
          resolveTextElement: options.resolveTextElement,
          resolveAdjacentTextElement: options.resolveAdjacentTextElement,
          getCanonicalVisibilityReader: options.getCanonicalVisibilityReader,
          isElementLocked: options.isElementLocked,
          isElementHidden: options.isElementHidden,
          onInlineEditStart: options.onInlineEditStart,
          onInlineEditCommit: options.onInlineEditCommit,
          onInlineEditEnd: options.onInlineEditEnd,
          getSelectedElements: options.getSelectedElements,
          canMutateDeck: options.canMutateDeck,
          editorUndo: options.editorUndo,
          editorRedo: options.editorRedo,
          selectAllElementsOnActiveSlide: options.selectAllElementsOnActiveSlide,
          arrangeElementLayer: options.arrangeElementLayer,
          removeSelectedElement: options.removeSelectedElement,
          copySelectedElements: options.copySelectedElements,
          pasteClipboardElements: options.pasteClipboardElements,
          duplicateSelectedElements: options.duplicateSelectedElements,
          nudgeSelectedElements: options.nudgeSelectedElements,
          navigateSlide: options.navigateSlide
        })
      : null;
    const frameController = frameControllerApi
      ? frameControllerApi.createStudioEditorFrameController({
          getIframeDocument: options.getIframeDocument,
          resetLiveCanonicalDeck: options.resetLiveCanonicalDeck,
          syncIframeTheme: options.syncIframeTheme,
          editorStyleApi: options.editorStyleApi,
          makeElementsHoverable: options.makeElementsHoverable,
          frameInteractions,
          frameBootstrapApi: options.frameBootstrapApi,
          setupIframeDragging: options.setupIframeDragging,
          generateThumbnails: options.generateThumbnails,
          syncStudioChromeToActiveSlide: options.syncStudioChromeToActiveSlide,
          setActiveSlide: options.setActiveSlide,
          bindDeckNavigationSync: options.bindDeckNavigationSync,
          observeDeckActiveSlideState: options.observeDeckActiveSlideState,
          capturePersistableDeckState: options.capturePersistableDeckState,
          saveHistoryState: options.saveHistoryState,
          persistenceApi: options.persistenceApi,
          applyPersistenceSuccess: options.applyPersistenceSuccess,
          getPresentationUrl: options.getPresentationUrl,
          getSessionToken: options.getSessionToken,
          setLiveCanonicalDeck: options.setLiveCanonicalDeck,
          updateDeckReadyToolbarActionState: options.updateDeckReadyToolbarActionState,
          setStudioAutoSaveStatus: options.setStudioAutoSaveStatus,
          syncInspectorForSelection: options.syncInspectorForSelection
        })
      : null;

    return {
      frameInteractionStateController,
      frameInteractions,
      frameController
    };
  }

  return {
    createStudioEditorFrameRuntime
  };
});
