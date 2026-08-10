(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryStackController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistoryStackController(options = {}) {
    let undoStack = Array.isArray(options.initialUndoStack)
      ? [...options.initialUndoStack]
      : [];
    let redoStack = Array.isArray(options.initialRedoStack)
      ? [...options.initialRedoStack]
      : [];

    function getState() {
      return {
        undoStack: [...undoStack],
        redoStack: [...redoStack]
      };
    }

    function setUndoStack(nextStack) {
      undoStack = Array.isArray(nextStack) ? [...nextStack] : [];
      return [...undoStack];
    }

    function setRedoStack(nextStack) {
      redoStack = Array.isArray(nextStack) ? [...nextStack] : [];
      return [...redoStack];
    }

    function clear() {
      undoStack = [];
      redoStack = [];
      return getState();
    }

    return {
      getState,
      getUndoStack: () => [...undoStack],
      getRedoStack: () => [...redoStack],
      setUndoStack,
      setRedoStack,
      clear
    };
  }

  return { createStudioEditorHistoryStackController };
});
