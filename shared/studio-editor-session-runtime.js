(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(api, globalName) {
    return api || (root && root[globalName]) || null;
  }

  function resolveFactory(api, factoryName) {
    return api && typeof api[factoryName] === 'function'
      ? api[factoryName]
      : null;
  }

  function createStudioEditorSessionRuntime(options = {}) {
    const sessionApi = resolveApi(options.sessionApi, 'SlideNextStudioEditorSession');
    const resetApi = resolveApi(
      options.sessionResetApi,
      'SlideNextStudioEditorSessionResetController'
    );
    const sessionUiApi = resolveApi(
      options.sessionUiApi,
      'SlideNextStudioEditorSessionUiController'
    );
    const shellApi = resolveApi(options.shellApi, 'SlideNextStudioEditorShellController');
    const presentationMetadataApi = resolveApi(
      options.presentationMetadataApi,
      'SlideNextStudioEditorPresentationMetadataController'
    );

    const createSessionState = resolveFactory(
      sessionApi,
      'createStudioEditorPresentationSessionStateController'
    );
    const sessionStateController = createSessionState
      ? createSessionState({
          sessionApi,
          getPresentationUrl: options.getPresentationUrl,
          getSessionToken: options.getSessionToken,
          setPresentationUrl: options.setPresentationUrl,
          setPresentationTitle: options.setPresentationTitle,
          setPresentationCategory: options.setPresentationCategory,
          setSlideIndex: options.setSlideIndex,
          setPresentationMetadata: options.setPresentationMetadata
        })
      : null;

    const createResetController = resolveFactory(
      resetApi,
      'createStudioEditorSessionResetController'
    );
    const sessionResetController = createResetController
      ? createResetController({
          persistenceApi: options.persistenceApi,
          getAutoSaveDebounceTimer: options.getAutoSaveDebounceTimer,
          setAutoSaveDebounceTimer: options.setAutoSaveDebounceTimer,
          getAutoVersionTimers: options.getAutoVersionTimers,
          setAutoVersionTimers: options.setAutoVersionTimers,
          clearTimer: options.clearTimer,
          applyPersistedDeckState: options.applyPersistedDeckState,
          clearHistoryStacks: options.clearHistoryStacks,
          updateHistoryButtons: options.updateHistoryButtons
        })
      : null;

    const createSessionUiController = resolveFactory(
      sessionUiApi,
      'createStudioEditorSessionUiController'
    );
    const sessionUiController = createSessionUiController
      ? createSessionUiController({
          resetPresentationUiState: options.resetPresentationUiState,
          resetSourceViewUiState: options.resetSourceViewUiState,
          resetDeckUiState: options.resetDeckUiState,
          resetVersionUiState: options.resetVersionUiState,
          resetSaveButtonState: options.resetSaveButtonState,
          updateDeckReadyToolbarActionState: options.updateDeckReadyToolbarActionState,
          documentRef: options.documentRef,
          setAutoSaveStatus: options.setAutoSaveStatus,
          setFrameLoadingState: options.setFrameLoadingState
        })
      : null;

    const createShellController = resolveFactory(
      shellApi,
      'createStudioEditorShellController'
    );
    const shellController = createShellController
      ? createShellController({ documentRef: options.documentRef })
      : null;

    const createPresentationMetadataController = resolveFactory(
      presentationMetadataApi,
      'createStudioEditorPresentationMetadataController'
    );
    const presentationMetadataController = createPresentationMetadataController
      ? createPresentationMetadataController({
          persistenceApi: options.persistenceApi,
          setCurrentPresentationMetadata: options.setCurrentPresentationMetadata,
          getCurrentPresentationUrl: options.getPresentationUrl,
          getCurrentPresentationMetadata: options.getCurrentPresentationMetadata,
          buildPresentationMetadataSeed: options.buildPresentationMetadataSeed,
          applyPresentationMetadata: options.applyPresentationMetadata,
          deckContextApi: options.deckContextApi,
          loadPresentationMetadata: options.loadPresentationMetadata,
          resolveLoadOptions: options.resolveLoadOptions,
          resolveStoredCanonicalDeck: options.resolveStoredCanonicalDeck,
          applyPersistedDeckState: options.applyPersistedDeckState,
          getIframeDoc: options.getIframeDoc,
          generateThumbnails: options.generateThumbnails,
          syncStudioChromeToActiveSlide: options.syncStudioChromeToActiveSlide,
          updateDeckReadyToolbarActionState: options.updateDeckReadyToolbarActionState
        })
      : null;

    return {
      sessionStateController,
      sessionResetController,
      sessionUiController,
      shellController,
      presentationMetadataController
    };
  }

  return {
    createStudioEditorSessionRuntime
  };
});
