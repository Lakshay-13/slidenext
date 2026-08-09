(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionResetController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSessionResetController(options = {}) {
    const persistenceApi = options.persistenceApi || null;
    const getAutoSaveDebounceTimer = typeof options.getAutoSaveDebounceTimer === 'function'
      ? options.getAutoSaveDebounceTimer
      : () => null;
    const setAutoSaveDebounceTimer = typeof options.setAutoSaveDebounceTimer === 'function'
      ? options.setAutoSaveDebounceTimer
      : () => {};
    const getAutoVersionTimers = typeof options.getAutoVersionTimers === 'function'
      ? options.getAutoVersionTimers
      : () => ({});
    const setAutoVersionTimers = typeof options.setAutoVersionTimers === 'function'
      ? options.setAutoVersionTimers
      : () => {};
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : null;
    const applyPersistedDeckState = typeof options.applyPersistedDeckState === 'function'
      ? options.applyPersistedDeckState
      : null;
    const clearHistoryStacks = typeof options.clearHistoryStacks === 'function'
      ? options.clearHistoryStacks
      : null;
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : null;

    function reset() {
      const clearedTimerState = persistenceApi
        && typeof persistenceApi.clearStudioPersistenceTimers === 'function'
        ? persistenceApi.clearStudioPersistenceTimers({
            autoSaveDebounceTimer: getAutoSaveDebounceTimer(),
            autoVersionTimers: getAutoVersionTimers(),
            clearTimer
          })
        : {
            autoSaveDebounceTimer: null,
            autoVersionTimers: {}
          };
      setAutoSaveDebounceTimer(clearedTimerState.autoSaveDebounceTimer);
      setAutoVersionTimers(clearedTimerState.autoVersionTimers);

      if (applyPersistedDeckState) {
        applyPersistedDeckState({
          cleanHtml: '',
          canonicalDeck: null,
          playbackState: null
        }, {
          presentationUrl: '',
          syncPresentationMetadata: false
        });
      }
      if (clearHistoryStacks) clearHistoryStacks();
      if (updateHistoryButtons) updateHistoryButtons();
      return true;
    }

    return {
      reset
    };
  }

  return {
    createStudioEditorSessionResetController
  };
});
