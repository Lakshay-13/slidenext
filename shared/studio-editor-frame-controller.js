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
    const isHistoryCaptureFailure = (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
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
    const captureInitialHistoryStateOverride = typeof options.captureInitialHistoryState === 'function'
      ? options.captureInitialHistoryState
      : null;
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const persistenceApi = options.persistenceApi || null;
    const applyPersistenceSuccess = typeof options.applyPersistenceSuccess === 'function'
      ? options.applyPersistenceSuccess
      : null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => null;
    const setLiveCanonicalDeck = typeof options.setLiveCanonicalDeck === 'function'
      ? options.setLiveCanonicalDeck
      : null;
    const getInitialCanonicalDeck = typeof options.getInitialCanonicalDeck === 'function'
      ? options.getInitialCanonicalDeck
      : null;
    const updateDeckReadyToolbarActionState = typeof options.updateDeckReadyToolbarActionState === 'function'
      ? options.updateDeckReadyToolbarActionState
      : () => {};
    const setStudioAutoSaveStatus = typeof options.setStudioAutoSaveStatus === 'function'
      ? options.setStudioAutoSaveStatus
      : () => {};
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};
    let initialHistoryCaptureFailed = false;

    function captureInitialHistoryState(iframeDoc) {
      if (captureInitialHistoryStateOverride) {
        const result = captureInitialHistoryStateOverride(iframeDoc);
        initialHistoryCaptureFailed = isHistoryCaptureFailure(result);
        return result;
      }
      if (!capturePersistableDeckState) return undefined;

      let initialPersistedDeckState = null;
      try {
        initialPersistedDeckState = capturePersistableDeckState(iframeDoc);
      } catch (error) {
        initialPersistedDeckState = null;
      }
      let historyCaptureResult = null;
      if (saveHistoryState) {
        if (initialPersistedDeckState && initialPersistedDeckState.canonicalDeck) {
          historyCaptureResult = saveHistoryState(false, null, initialPersistedDeckState.canonicalDeck);
        } else {
          historyCaptureResult = saveHistoryState(false);
        }
      }
      initialHistoryCaptureFailed = isHistoryCaptureFailure(historyCaptureResult);
      if (applyPersistenceSuccess
        && persistenceApi
        && typeof persistenceApi.createStudioPersistedDeckStateActionContext === 'function') {
        applyPersistenceSuccess(
          persistenceApi.createStudioPersistedDeckStateActionContext(
            initialPersistedDeckState,
            getPresentationUrl(),
            {
              sessionToken: getSessionToken()
            }
          ),
          {
            presentationUrl: getPresentationUrl()
          }
        );
      }
      if (setLiveCanonicalDeck) {
        setLiveCanonicalDeck(
          initialPersistedDeckState && initialPersistedDeckState.canonicalDeck,
          iframeDoc,
          getSessionToken()
        );
      }
      return initialPersistedDeckState;
    }

    function init() {
      initialHistoryCaptureFailed = false;
      resetLiveCanonicalDeck();
      const iframeDoc = getIframeDocument();
      if (!iframeDoc) return false;

      if (getInitialCanonicalDeck && setLiveCanonicalDeck) {
        let initialCanonicalDeck = null;
        try {
          initialCanonicalDeck = getInitialCanonicalDeck();
        } catch (error) {
          initialCanonicalDeck = null;
        }
        if (initialCanonicalDeck) {
          setLiveCanonicalDeck(initialCanonicalDeck, iframeDoc, getSessionToken());
        }
      }

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
      setStudioAutoSaveStatus(initialHistoryCaptureFailed ? 'history-failed' : 'saved');
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
