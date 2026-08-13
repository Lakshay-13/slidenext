(function initStudioEditorHistoryEntryAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryEntryAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryEntryAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const historyStateApi = options.historyStateApi || null;
    const canonicalStateApi = options.canonicalStateApi || null;
    const historyApi = options.historyApi || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : () => null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const buildMutationCanonicalDeck = typeof options.buildMutationCanonicalDeck === 'function'
      ? options.buildMutationCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : null;
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
    let historyEntryBuilder = null;

    function createHistoryEntry(doc) {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.createEntry === 'function') {
        return historyController.createEntry(doc);
      }
      if (typeof historyEntryBuilder !== 'function') {
        const createEntryAdapter = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryEntryAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryEntryAdapter
          : null;
        historyEntryBuilder = createEntryAdapter
          ? createEntryAdapter({
              historyStateApi,
              canonicalStateApi,
              historyApi,
              getDocument,
              getPendingCanonicalDeck,
              buildCanonicalDeck,
              buildMutationCanonicalDeck,
              getCanonicalDeckBaseline,
              isCanonicalDeck,
              getHistoryOptions,
              resolveFallbackActiveSlideId,
              buildHistoryHtml,
              getActiveSlideId,
              getSelectedElementIds,
              preferCanonicalDeck: true,
              getPendingTransaction
            })
          : null;
      }
      return typeof historyEntryBuilder === 'function'
        ? historyEntryBuilder(doc)
        : null;
    }

    return createHistoryEntry;
  }

  function createStudioEditorHistoryEntryGlobalApi(options = {}) {
    const createHistoryEntry = typeof options.createHistoryEntry === 'function'
      ? options.createHistoryEntry
      : null;
    return {
      createHistoryEntry: (...args) => createHistoryEntry
        ? createHistoryEntry(...args)
        : null
    };
  }

  return {
    createStudioEditorHistoryEntryAction,
    createStudioEditorHistoryEntryGlobalApi
  };
}));
