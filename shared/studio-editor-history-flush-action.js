(function initStudioEditorHistoryFlushAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryFlushAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryFlushAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : () => null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : () => null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => false;
    const historyResultApi = options.historyResultApi || null;
    const isHistoryCaptureFailure = historyResultApi
      && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
      ? historyResultApi.isStudioHistoryCaptureFailure
      : (value) => value === false
        || (!!value && typeof value === 'object' && value.didCapture === false);

    function flushPendingEditorHistory() {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.flushPending === 'function') {
        return historyController.flushPending();
      }
      const pendingTransaction = getPendingTransaction();
      const pendingCanonicalDeck = getPendingCanonicalDeck();
      if (pendingTransaction === null && pendingCanonicalDeck === null) return false;
      const saveResult = pendingCanonicalDeck !== null
        ? saveHistoryState(false, pendingTransaction, pendingCanonicalDeck)
        : saveHistoryState(false, pendingTransaction);
      return !isHistoryCaptureFailure(saveResult);
    }

    return flushPendingEditorHistory;
  }

  function createStudioEditorHistoryFlushGlobalApi(options = {}) {
    const flushPendingEditorHistory = typeof options.flushPendingEditorHistory === 'function'
      ? options.flushPendingEditorHistory
      : null;
    return {
      flushPendingEditorHistory: (...args) => flushPendingEditorHistory
        ? flushPendingEditorHistory(...args)
        : false
    };
  }

  return {
    createStudioEditorHistoryFlushAction,
    createStudioEditorHistoryFlushGlobalApi
  };
}));
