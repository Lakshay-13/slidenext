(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameRuntimeOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, name, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      return options[name];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorFrameRuntimeOptions(options = {}) {
    const overlayApi = resolveDependency(options, 'overlayApi', 'SlideNextStudioEditorOverlay');
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : () => false;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getOverlayOptions = typeof options.getOverlayOptions === 'function'
      ? options.getOverlayOptions
      : () => ({});
    const onInlineEditStart = typeof options.onInlineEditStart === 'function'
      ? options.onInlineEditStart
      : (payload = {}, iframeDoc = null) => {
          const element = payload && payload.element;
          if (!element) return false;
          commitSelectionState(
            { selectedElements: [element] },
            { doc: iframeDoc }
          );
          if (overlayApi && typeof overlayApi.hideStudioSelectionOverlay === 'function') {
            overlayApi.hideStudioSelectionOverlay(
              iframeDoc,
              getActiveSlide(iframeDoc),
              getOverlayOptions()
            );
          }
          return true;
        };

    return {
      interactionStateApi: resolveDependency(
        options,
        'interactionStateApi',
        'SlideNextStudioEditorFrameInteractionStateController'
      ),
      frameInteractionsApi: resolveDependency(
        options,
        'frameInteractionsApi',
        'SlideNextStudioEditorFrameInteractions'
      ),
      frameControllerApi: resolveDependency(
        options,
        'frameControllerApi',
        'SlideNextStudioEditorFrameController'
      ),
      eventsApi: resolveDependency(options, 'eventsApi', 'SlideNextStudioEditorEvents'),
      inlineTextEditApi: resolveDependency(options, 'inlineTextEditApi', 'SlideNextStudioEditorInlineEdit'),
      shouldIgnoreTarget: options.shouldIgnoreTarget,
      resolveEditableTarget: options.resolveEditableTarget,
      selectElement: options.selectElement,
      deselectElement: options.deselectElement,
      getActiveSlide,
      resolveTextElement: options.resolveTextElement,
      resolveAdjacentTextElement: options.resolveAdjacentTextElement,
      getCanonicalVisibilityReader: options.getCanonicalVisibilityReader,
      isElementLocked: options.isElementLocked,
      isElementHidden: options.isElementHidden,
      onInlineEditStart,
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
      navigateSlide: options.navigateSlide,
      getIframeDocument: options.getIframeDocument,
      resetLiveCanonicalDeck: options.resetLiveCanonicalDeck,
      syncIframeTheme: options.syncIframeTheme,
      editorStyleApi: resolveDependency(options, 'editorStyleApi', 'SlideNextStudioEditorStyle'),
      makeElementsHoverable: options.makeElementsHoverable,
      frameBootstrapApi: resolveDependency(options, 'frameBootstrapApi', 'SlideNextStudioFrameBootstrap'),
      setupIframeDragging: options.setupIframeDragging,
      generateThumbnails: options.generateThumbnails,
      syncStudioChromeToActiveSlide: options.syncStudioChromeToActiveSlide,
      setActiveSlide: options.setActiveSlide,
      bindDeckNavigationSync: options.bindDeckNavigationSync,
      observeDeckActiveSlideState: options.observeDeckActiveSlideState,
      capturePersistableDeckState: options.capturePersistableDeckState,
      saveHistoryState: options.saveHistoryState,
      persistenceApi: resolveDependency(options, 'persistenceApi', 'SlideNextStudioEditorPersistence'),
      applyPersistenceSuccess: options.applyPersistenceSuccess,
      getPresentationUrl: options.getPresentationUrl,
      getSessionToken: options.getSessionToken,
      setLiveCanonicalDeck: options.setLiveCanonicalDeck,
      getInitialCanonicalDeck: options.getInitialCanonicalDeck,
      updateDeckReadyToolbarActionState: options.updateDeckReadyToolbarActionState,
      setStudioAutoSaveStatus: options.setStudioAutoSaveStatus,
      syncInspectorForSelection: options.syncInspectorForSelection
    };
  }

  return {
    createStudioEditorFrameRuntimeOptions
  };
});
