(function initStudioEditorHistoryRestoreAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryRestoreAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryRestoreAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const restoreApi = options.restoreApi || null;
    let restoreHandler = null;
    const restoreHandlerOptions = { ...options };
    delete restoreHandlerOptions.getHistoryController;
    delete restoreHandlerOptions.historyController;
    delete restoreHandlerOptions.restoreApi;
    delete restoreHandlerOptions.createRestoreStateAdapter;

    function restoreFrameFromHistoryEntry(entry) {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.restore === 'function') {
        return historyController.restore(
          entry,
          arguments.length > 1 ? arguments[1] : null
        );
      }
      if (typeof restoreHandler !== 'function') {
        const createRestoreStateAdapter = typeof options.createRestoreStateAdapter === 'function'
          ? options.createRestoreStateAdapter
          : restoreApi
            && typeof restoreApi.createStudioEditorHistoryRestoreStateAdapter === 'function'
            ? restoreApi.createStudioEditorHistoryRestoreStateAdapter
            : null;
        restoreHandler = createRestoreStateAdapter
          ? createRestoreStateAdapter({
              ...restoreHandlerOptions,
              restoreApi
            })
          : null;
      }
      if (typeof restoreHandler !== 'function') return false;
      return restoreHandler(
        entry,
        arguments.length > 1 ? arguments[1] : null
      );
    }

    return restoreFrameFromHistoryEntry;
  }

  function createStudioEditorHistoryRestoreGlobalApi(options = {}) {
    const restoreFrameFromHistoryEntry = typeof options.restoreFrameFromHistoryEntry === 'function'
      ? options.restoreFrameFromHistoryEntry
      : null;
    return {
      restoreFrameFromHistoryEntry: (...args) => restoreFrameFromHistoryEntry
        ? restoreFrameFromHistoryEntry(...args)
        : false
    };
  }

  return {
    createStudioEditorHistoryRestoreAction,
    createStudioEditorHistoryRestoreGlobalApi
  };
}));
