(function initStudioEditorHistoryRedoAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryRedoAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryRedoAction(options = {}) {
    const getHistoryStepAdapter = typeof options.getHistoryStepAdapter === 'function'
      ? options.getHistoryStepAdapter
      : () => null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];

    return function editorRedo() {
      const historyStepAdapter = getHistoryStepAdapter();
      return historyStepAdapter && typeof historyStepAdapter.redo === 'function'
        ? historyStepAdapter.redo()
        : {
            didRedo: false,
            undoStack: getUndoStack(),
            redoStack: getRedoStack(),
            restoreEntry: null
          };
    };
  }

  function createStudioEditorHistoryRedoGlobalApi(options = {}) {
    const editorRedo = typeof options.editorRedo === 'function'
      ? options.editorRedo
      : null;
    return {
      editorRedo: (...args) => editorRedo
        ? editorRedo(...args)
        : {
            didRedo: false,
            undoStack: [],
            redoStack: [],
            restoreEntry: null
          }
    };
  }

  return {
    createStudioEditorHistoryRedoAction,
    createStudioEditorHistoryRedoGlobalApi
  };
}));
