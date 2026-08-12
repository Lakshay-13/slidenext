(function (root, factory) {
  const historyResultApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-history-result.js')
    : root && root.SlideNextStudioEditorHistoryResult;
  const api = factory(historyResultApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (historyResultApi) {
  const isStudioHistoryCaptureFailure = historyResultApi
    && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
    ? historyResultApi.isStudioHistoryCaptureFailure
    : (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
  const captureStudioHistoryState = historyResultApi
    && typeof historyResultApi.captureStudioHistoryState === 'function'
    ? historyResultApi.captureStudioHistoryState
    : (saveHistoryState, ...args) => {
        if (typeof saveHistoryState !== 'function') return false;
        try {
          return saveHistoryState(...args);
        } catch (error) {
          return false;
        }
      };

  function createStudioEditorSlideMutationPersistenceFinalizer(options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : () => {};

    if (mutationApi && typeof mutationApi.finalizeStudioSlideMutation === 'function') {
      return (versionLabel, transaction = null, canonicalDeck = null) => (
        mutationApi.finalizeStudioSlideMutation({
          versionLabel,
          transaction,
          canonicalDeck,
          saveHistoryState,
          triggerAutoSave,
          triggerAutoVersion
        })
      );
    }

    return (versionLabel, transaction = null, canonicalDeck = null) => {
      const historyCaptureResult = canonicalDeck
        ? captureStudioHistoryState(saveHistoryState, false, transaction, canonicalDeck)
        : captureStudioHistoryState(saveHistoryState, false, transaction);
      if (isStudioHistoryCaptureFailure(historyCaptureResult)) return false;
      if (triggerAutoSave() === false) return false;
      if (versionLabel) {
        triggerAutoVersion(versionLabel);
      }
      return versionLabel;
    };
  }

  function createStudioEditorSlideMutationRestoreStateCapturer(options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const deckViewApi = options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getCommittedSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const createRestoreStateCapturer = mutationApi
      && typeof mutationApi.createStudioSlideMutationRestoreStateCapturer === 'function'
      ? mutationApi.createStudioSlideMutationRestoreStateCapturer
      : null;
    const captureStudioDeckViewBeforeSlideMutation = deckViewApi
      && typeof deckViewApi.captureStudioDeckViewBeforeSlideMutation === 'function'
      ? deckViewApi.captureStudioDeckViewBeforeSlideMutation
      : null;

    if (createRestoreStateCapturer) {
      return createRestoreStateCapturer({
        captureStudioDeckViewBeforeSlideMutation,
        saveHistoryState,
        buildCanonicalDeck: options.buildCanonicalDeck,
        getActiveSlideId,
        getCommittedSelectedElementIds
      });
    }

    if (captureStudioDeckViewBeforeSlideMutation) {
      return (iframeDoc) => captureStudioDeckViewBeforeSlideMutation({
        doc: iframeDoc,
        saveHistoryState,
        buildCanonicalDeck,
        getActiveSlideId,
        getCommittedSelectedElementIds
      });
    }

    return (iframeDoc) => {
      let canonicalDeck = null;
      if (buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck(iframeDoc);
        } catch (error) {
          canonicalDeck = null;
        }
      }
      const historyCaptureResult = canonicalDeck
        ? captureStudioHistoryState(saveHistoryState, false, null, canonicalDeck)
        : captureStudioHistoryState(saveHistoryState);
      if (isStudioHistoryCaptureFailure(historyCaptureResult)) {
        return {
          historyCaptureFailed: true,
          preservedActiveSlideId: '',
          preservedSelectionIds: []
        };
      }
      return {
        preservedActiveSlideId: getActiveSlideId(iframeDoc),
        preservedSelectionIds: getCommittedSelectedElementIds(iframeDoc)
      };
    };
  }

  function restoreStudioEditorDeckViewAfterSlideMutation(iframeDoc, preservedSelectionIds, options = {}) {
    const deckViewApi = options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
    const restoreDeckView = deckViewApi
      && typeof deckViewApi.restoreStudioDeckViewAfterSlideMutation === 'function'
      ? deckViewApi.restoreStudioDeckViewAfterSlideMutation
      : null;
    if (!restoreDeckView) return false;

    const restoreOptions = {
      restoreActiveSlideById: (slideId) => options.restoreActiveSlideById(slideId, iframeDoc),
      restoreSelectionState: () => options.restoreSelectionState(preservedSelectionIds, iframeDoc),
      fallbackIndex: options.fallbackIndex,
      setActiveSlideByIndex: (index) => options.setActiveSlideByIndex(index)
    };
    if (Object.prototype.hasOwnProperty.call(options, 'preservedActiveSlideId')) {
      restoreOptions.preservedActiveSlideId = options.preservedActiveSlideId;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'removedSlideId')) {
      restoreOptions.removedSlideId = options.removedSlideId;
    }
    return restoreDeckView(restoreOptions);
  }

  return {
    createStudioEditorSlideMutationPersistenceFinalizer,
    createStudioEditorSlideMutationRestoreStateCapturer,
    restoreStudioEditorDeckViewAfterSlideMutation
  };
});
