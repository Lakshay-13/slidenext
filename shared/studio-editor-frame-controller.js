(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorFrameController(options = {}) {
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const resetLiveCanonicalDeck = typeof options.resetLiveCanonicalDeck === 'function'
      ? options.resetLiveCanonicalDeck
      : () => {};
    const syncIframeTheme = typeof options.syncIframeTheme === 'function'
      ? options.syncIframeTheme
      : () => {};
    const editorStyleApi = options.editorStyleApi || null;
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : () => {};
    const frameInteractions = options.frameInteractions || null;
    const frameBootstrapApi = options.frameBootstrapApi || null;
    const setupIframeDragging = typeof options.setupIframeDragging === 'function'
      ? options.setupIframeDragging
      : () => {};
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => false;
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : () => {};
    const bindDeckNavigationSync = typeof options.bindDeckNavigationSync === 'function'
      ? options.bindDeckNavigationSync
      : () => false;
    const observeDeckActiveSlideState = typeof options.observeDeckActiveSlideState === 'function'
      ? options.observeDeckActiveSlideState
      : () => {};
    const captureInitialHistoryState = typeof options.captureInitialHistoryState === 'function'
      ? options.captureInitialHistoryState
      : () => {};
    const updateDeckReadyToolbarActionState = typeof options.updateDeckReadyToolbarActionState === 'function'
      ? options.updateDeckReadyToolbarActionState
      : () => {};
    const setStudioAutoSaveStatus = typeof options.setStudioAutoSaveStatus === 'function'
      ? options.setStudioAutoSaveStatus
      : () => {};
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};

    function init() {
      resetLiveCanonicalDeck();
      const iframeDoc = getIframeDocument();
      if (!iframeDoc) return false;

      syncIframeTheme();
      if (editorStyleApi && typeof editorStyleApi.ensureStudioEditorStyle === 'function') {
        editorStyleApi.ensureStudioEditorStyle(iframeDoc);
      }
      makeElementsHoverable(iframeDoc);

      if (frameInteractions && typeof frameInteractions.attach === 'function') {
        frameInteractions.attach(iframeDoc);
      }

      if (frameBootstrapApi && typeof frameBootstrapApi.runStudioFrameBootstrap === 'function') {
        frameBootstrapApi.runStudioFrameBootstrap(iframeDoc, {
          setupIframeDragging,
          generateThumbnails,
          syncStudioChromeToActiveSlide,
          setActiveSlide,
          bindDeckNavigationSync,
          observeDeckActiveSlideState,
          captureInitialHistoryState
        });
      }
      updateDeckReadyToolbarActionState();
      setStudioAutoSaveStatus('saved');
      syncInspectorForSelection();
      return true;
    }

    return {
      init
    };
  }

  return {
    createStudioEditorFrameController
  };
});
