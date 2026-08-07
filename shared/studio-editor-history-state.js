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

  function createStudioEditorHistoryEntryBuilder(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : () => null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const buildHistoryHtml = typeof options.buildHistoryHtml === 'function'
      ? options.buildHistoryHtml
      : () => '';
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : () => null;

    return function createHistoryEntry(doc) {
      if (!historyApi || typeof historyApi.buildStudioHistoryEntry !== 'function') {
        return null;
      }
      const pendingCanonicalDeck = getPendingCanonicalDeck();
      const historyCanonicalDeckBuilder = pendingCanonicalDeck
        ? (sourceDoc) => buildCanonicalDeck(sourceDoc, {
            canonicalDeckOverride: pendingCanonicalDeck
          })
        : buildCanonicalDeck;
      return historyApi.buildStudioHistoryEntry(doc, {
        getDocument,
        buildCanonicalDeck: historyCanonicalDeckBuilder,
        getHistoryOptions,
        resolveFallbackActiveSlideId,
        buildHistoryHtml,
        getActiveSlideId,
        getSelectedElementIds,
        transaction: getPendingTransaction()
      });
    };
  }

  return {
    createStudioEditorHistorySaveAdapter,
    createStudioEditorHistoryEntryBuilder
  };
});
