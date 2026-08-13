(function initStudioEditorHistoryStepAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryStepAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryStepAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const historyStateApi = options.historyStateApi || null;
    const historyApi = options.historyApi || null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];
    const setUndoStack = typeof options.setUndoStack === 'function'
      ? options.setUndoStack
      : () => {};
    const setRedoStack = typeof options.setRedoStack === 'function'
      ? options.setRedoStack
      : () => {};
    const restoreHistoryEntry = typeof options.restoreHistoryEntry === 'function'
      ? options.restoreHistoryEntry
      : () => {};
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const flushPendingHistory = typeof options.flushPendingHistory === 'function'
      ? options.flushPendingHistory
      : null;
    const hasPendingHistory = typeof options.hasPendingHistory === 'function'
      ? options.hasPendingHistory
      : null;
    let stepAdapter = null;

    function getEditorHistoryStepAdapter() {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.undo === 'function') {
        return historyController;
      }
      if (typeof stepAdapter !== 'object' || !stepAdapter) {
        const createStepAdapter = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryStepStateAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryStepStateAdapter
          : null;
        stepAdapter = createStepAdapter
          ? createStepAdapter({
              historyStateApi,
              historyApi,
              getUndoStack,
              getRedoStack,
              setUndoStack,
              setRedoStack,
              restoreHistoryEntry,
              updateHistoryButtons,
              triggerAutoSave,
              flushPendingHistory,
              hasPendingHistory
            })
          : null;
      }
      return stepAdapter;
    }

    return getEditorHistoryStepAdapter;
  }

  function createStudioEditorHistoryStepGlobalApi(options = {}) {
    const getEditorHistoryStepAdapter = typeof options.getEditorHistoryStepAdapter === 'function'
      ? options.getEditorHistoryStepAdapter
      : null;
    return {
      getEditorHistoryStepAdapter: (...args) => getEditorHistoryStepAdapter
        ? getEditorHistoryStepAdapter(...args)
        : null
    };
  }

  return {
    createStudioEditorHistoryStepAction,
    createStudioEditorHistoryStepGlobalApi
  };
}));
