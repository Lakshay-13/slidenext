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
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
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
      let pendingTransaction = null;
      try {
        pendingTransaction = getPendingTransaction();
      } catch (error) {
        // Continue with any readable pending canonical state.
      }
      let pendingCanonicalDeck = null;
      try {
        pendingCanonicalDeck = getPendingCanonicalDeck(getDocument());
      } catch (error) {
        // Continue with any readable pending transaction.
      }
      const hasPendingTransaction = pendingTransaction !== undefined && pendingTransaction !== null;
      const hasPendingCanonicalDeck = pendingCanonicalDeck !== undefined && pendingCanonicalDeck !== null;
      if (!hasPendingTransaction && !hasPendingCanonicalDeck) return false;
      const saveResult = hasPendingCanonicalDeck
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
