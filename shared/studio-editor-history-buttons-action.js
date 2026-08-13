(function initStudioEditorHistoryButtonsAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryButtonsAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryButtonsAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const historyApi = options.historyApi || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => options.documentRef || null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => options.undoStack || [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => options.redoStack || [];
    let buttonSync = null;

    function updateHistoryButtons() {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.updateButtons === 'function') {
        return historyController.updateButtons();
      }
      if (!historyApi
        || typeof historyApi.syncStudioHistoryButtons !== 'function') return false;
      if (typeof buttonSync !== 'function'
        && typeof historyApi.createStudioHistoryButtonStateSync === 'function') {
        buttonSync = historyApi.createStudioHistoryButtonStateSync({
          getDocument,
          getUndoStack,
          getRedoStack
        });
      }
      if (typeof buttonSync === 'function') {
        return buttonSync();
      }
      return historyApi.syncStudioHistoryButtons({
        documentRef: getDocument(),
        undoStack: getUndoStack(),
        redoStack: getRedoStack()
      });
    }

    return updateHistoryButtons;
  }

  function createStudioEditorHistoryButtonsGlobalApi(options = {}) {
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : null;
    return {
      updateHistoryButtons: (...args) => updateHistoryButtons
        ? updateHistoryButtons(...args)
        : false
    };
  }

  return {
    createStudioEditorHistoryButtonsAction,
    createStudioEditorHistoryButtonsGlobalApi
  };
}));
