(function initStudioEditorHistoryUndoAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryUndoAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryUndoAction(options = {}) {
    const getHistoryStepAdapter = typeof options.getHistoryStepAdapter === 'function'
      ? options.getHistoryStepAdapter
      : () => null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];

    return function editorUndo() {
      const historyStepAdapter = getHistoryStepAdapter();
      return historyStepAdapter && typeof historyStepAdapter.undo === 'function'
        ? historyStepAdapter.undo()
        : {
            didUndo: false,
            undoStack: getUndoStack(),
            redoStack: getRedoStack(),
            restoreEntry: null
          };
    };
  }

  function createStudioEditorHistoryUndoGlobalApi(options = {}) {
    const editorUndo = typeof options.editorUndo === 'function'
      ? options.editorUndo
      : null;
    return {
      editorUndo: (...args) => editorUndo
        ? editorUndo(...args)
        : {
            didUndo: false,
            undoStack: [],
            redoStack: [],
            restoreEntry: null
          }
    };
  }

  return {
    createStudioEditorHistoryUndoAction,
    createStudioEditorHistoryUndoGlobalApi
  };
}));
