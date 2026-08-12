(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionRuntimeOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, name, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      return options[name];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSessionRuntimeOptions(options = {}) {
    return {
      sessionApi: resolveDependency(options, 'sessionApi', 'SlideNextStudioEditorSession'),
      sessionResetApi: resolveDependency(
        options,
        'sessionResetApi',
        'SlideNextStudioEditorSessionResetController'
      ),
      sessionUiApi: resolveDependency(
        options,
        'sessionUiApi',
        'SlideNextStudioEditorSessionUiController'
      ),
      shellApi: resolveDependency(
        options,
        'shellApi',
        'SlideNextStudioEditorShellController'
      ),
      presentationMetadataApi: resolveDependency(
        options,
        'presentationMetadataApi',
        'SlideNextStudioEditorPresentationMetadataController'
      ),
      persistenceApi: resolveDependency(
        options,
        'persistenceApi',
        'SlideNextStudioEditorPersistence'
      ),
      deckContextApi: resolveDependency(options, 'deckContextApi', 'SlideNextStudioDeckContext'),
      documentRef: options.documentRef,
      getPresentationUrl: options.getPresentationUrl,
      getSessionToken: options.getSessionToken,
      setPresentationUrl: options.setPresentationUrl,
      setPresentationTitle: options.setPresentationTitle,
      setPresentationCategory: options.setPresentationCategory,
      setSlideIndex: options.setSlideIndex,
      setPresentationMetadata: options.setPresentationMetadata,
      getAutoSaveDebounceTimer: options.getAutoSaveDebounceTimer,
      setAutoSaveDebounceTimer: options.setAutoSaveDebounceTimer,
      getAutoVersionTimers: options.getAutoVersionTimers,
      setAutoVersionTimers: options.setAutoVersionTimers,
      clearTimer: options.clearTimer,
      applyPersistedDeckState: options.applyPersistedDeckState,
      clearHistoryStacks: options.clearHistoryStacks,
      updateHistoryButtons: options.updateHistoryButtons,
      resetPresentationUiState: options.resetPresentationUiState,
      resetSourceViewUiState: options.resetSourceViewUiState,
      resetDeckUiState: options.resetDeckUiState,
      resetVersionUiState: options.resetVersionUiState,
      resetSaveButtonState: options.resetSaveButtonState,
      updateDeckReadyToolbarActionState: options.updateDeckReadyToolbarActionState,
      setCurrentPresentationMetadata: options.setCurrentPresentationMetadata,
      getCurrentPresentationMetadata: options.getCurrentPresentationMetadata,
      buildPresentationMetadataSeed: options.buildPresentationMetadataSeed,
      applyPresentationMetadata: options.applyPresentationMetadata,
      loadPresentationMetadata: options.loadPresentationMetadata,
      resolveLoadOptions: options.resolveLoadOptions,
      resolveStoredCanonicalDeck: options.resolveStoredCanonicalDeck,
      getIframeDoc: options.getIframeDoc,
      generateThumbnails: options.generateThumbnails,
      syncStudioChromeToActiveSlide: options.syncStudioChromeToActiveSlide
    };
  }

  return {
    createStudioEditorSessionRuntimeOptions
  };
});
