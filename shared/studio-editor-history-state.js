(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistorySaveAdapter(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : () => null;
    const setPendingTransaction = typeof options.setPendingTransaction === 'function'
      ? options.setPendingTransaction
      : () => {};
    const setPendingCanonicalDeck = typeof options.setPendingCanonicalDeck === 'function'
      ? options.setPendingCanonicalDeck
      : () => {};
    const setLiveCanonicalDeck = typeof options.setLiveCanonicalDeck === 'function'
      ? options.setLiveCanonicalDeck
      : () => {};
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getTimer = typeof options.getTimer === 'function'
      ? options.getTimer
      : () => null;
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : () => {};
    const captureState = typeof options.captureState === 'function'
      ? options.captureState
      : () => {};
    const scheduleOptions = options.scheduleOptions && typeof options.scheduleOptions === 'object'
      ? options.scheduleOptions
      : {};

    let historyHandler = null;

    function resolveFallbackResult() {
      return {
        didCapture: false,
        nextTimer: getTimer()
      };
    }

    function createHistoryHandler() {
      if (!historyApi || typeof historyApi.createStudioHistorySaveHandler !== 'function') {
        return null;
      }
      return historyApi.createStudioHistorySaveHandler({
        transactionApi,
        getPendingTransaction,
        setPendingTransaction,
        setPendingCanonicalDeck,
        setLiveCanonicalDeck,
        isCanonicalDeck,
        getTimer,
        setTimer,
        captureState,
        scheduleOptions
      });
    }

    return function saveHistoryState(debounce = false, transaction = null, canonicalDeck = null) {
      if (!historyHandler) {
        historyHandler = createHistoryHandler();
      }
      if (typeof historyHandler !== 'function') {
        return resolveFallbackResult();
      }
      return historyHandler(
        debounce,
        transaction,
        ...(arguments.length > 2 ? [canonicalDeck] : [])
      );
    };
  }

  return {
    createStudioEditorHistorySaveAdapter
  };
});
