(function initStudioEditorHistorySaveAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistorySaveAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistorySaveAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const historyStateApi = options.historyStateApi || null;
    const historyApi = options.historyApi || null;
    const transactionApi = options.transactionApi || null;
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
    const getLiveCanonicalDeck = typeof options.getLiveCanonicalDeck === 'function'
      ? options.getLiveCanonicalDeck
      : () => null;
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
    const scheduleOptions = options.scheduleOptions || {
      clearScheduledCapture: clearTimeout,
      scheduleCapture: (callback, delayMs) => setTimeout(callback, delayMs)
    };

    function createSaveAdapter() {
      if (!historyStateApi
        || typeof historyStateApi.createStudioEditorHistorySaveAdapter !== 'function') {
        return null;
      }
      return historyStateApi.createStudioEditorHistorySaveAdapter({
        historyApi,
        transactionApi,
        getPendingTransaction,
        setPendingTransaction,
        setPendingCanonicalDeck,
        setLiveCanonicalDeck,
        getLiveCanonicalDeck,
        isCanonicalDeck,
        getTimer,
        setTimer,
        captureState,
        scheduleOptions
      });
    }

    function saveHistoryState(debounce = false, transaction = null, canonicalDeck = null) {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.save === 'function') {
        return historyController.save(
          debounce,
          transaction,
          ...(arguments.length > 2 ? [canonicalDeck] : [])
        );
      }
      if (typeof saveHistoryState.adapter !== 'function') {
        saveHistoryState.adapter = createSaveAdapter();
      }
      if (typeof saveHistoryState.adapter !== 'function') {
        return { didCapture: false, nextTimer: getTimer() };
      }
      return saveHistoryState.adapter(
        debounce,
        transaction,
        ...(arguments.length > 2 ? [canonicalDeck] : [])
      );
    }

    return saveHistoryState;
  }

  function createStudioEditorHistorySaveGlobalApi(options = {}) {
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    return {
      saveHistoryState: (...args) => saveHistoryState
        ? saveHistoryState(...args)
        : { didCapture: false, nextTimer: null }
    };
  }

  return {
    createStudioEditorHistorySaveAction,
    createStudioEditorHistorySaveGlobalApi
  };
}));
