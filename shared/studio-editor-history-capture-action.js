(function initStudioEditorHistoryCaptureAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryCaptureAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryCaptureAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const historyStateApi = options.historyStateApi || null;
    const historyApi = options.historyApi || null;
    const createHistoryEntry = typeof options.createHistoryEntry === 'function'
      ? options.createHistoryEntry
      : () => null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];
    const getHistoryStateOptions = typeof options.getHistoryStateOptions === 'function'
      ? options.getHistoryStateOptions
      : null;
    const setUndoStack = typeof options.setUndoStack === 'function'
      ? options.setUndoStack
      : () => {};
    const setRedoStack = typeof options.setRedoStack === 'function'
      ? options.setRedoStack
      : () => {};
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : () => {};
    const clearPendingState = typeof options.clearPendingState === 'function'
      ? options.clearPendingState
      : () => {};
    let captureAdapter = null;

    function captureState() {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.capture === 'function') {
        return historyController.capture();
      }
      if (typeof captureAdapter !== 'function') {
        const createCaptureAdapter = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryCaptureStateAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryCaptureStateAdapter
          : null;
        captureAdapter = createCaptureAdapter
          ? createCaptureAdapter({
              historyStateApi,
              historyApi,
              createHistoryEntry,
              getUndoStack,
              getRedoStack,
              getHistoryStateOptions,
              setUndoStack,
              setRedoStack,
              updateHistoryButtons,
              clearPendingState
            })
          : null;
      }
      if (typeof captureAdapter !== 'function') {
        clearPendingState();
        return {
          didCapture: false,
          undoStack: getUndoStack(),
          redoStack: getRedoStack(),
          historyEntry: null
        };
      }
      return captureAdapter();
    }

    return captureState;
  }

  function createStudioEditorHistoryCaptureGlobalApi(options = {}) {
    const captureState = typeof options.captureState === 'function'
      ? options.captureState
      : null;
    return {
      captureState: (...args) => captureState
        ? captureState(...args)
        : {
            didCapture: false,
            undoStack: [],
            redoStack: [],
            historyEntry: null
          }
    };
  }

  return {
    createStudioEditorHistoryCaptureAction,
    createStudioEditorHistoryCaptureGlobalApi
  };
}));
