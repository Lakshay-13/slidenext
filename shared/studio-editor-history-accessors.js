(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistoryAccessors(options = {}) {
    const bridge = options.bridge || null;

    function read(methodName, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName]()
        : fallback;
    }

    function write(methodName, value, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](value)
        : fallback;
    }

    return {
      bridge,
      getUndoStack: () => read('getUndoStack', []),
      getRedoStack: () => read('getRedoStack', []),
      setUndoStack: (nextStack) => write('setUndoStack', nextStack, false),
      setRedoStack: (nextStack) => write('setRedoStack', nextStack, false),
      clearHistoryStacks: () => read('clearHistoryStacks', false),
      getPendingEditorTransaction: () => read('getPendingEditorTransaction', null),
      setPendingEditorTransaction: (nextTransaction) => write(
        'setPendingEditorTransaction',
        nextTransaction,
        false
      ),
      clearPendingEditorTransaction: () => read('clearPendingEditorTransaction', false),
      getPendingEditorCanonicalDeck: () => read('getPendingEditorCanonicalDeck', null),
      setPendingEditorCanonicalDeck: (nextCanonicalDeck) => write(
        'setPendingEditorCanonicalDeck',
        nextCanonicalDeck,
        false
      ),
      getUndoDebounceTimer: () => read('getUndoDebounceTimer', null),
      setUndoDebounceTimer: (nextTimer) => write('setUndoDebounceTimer', nextTimer, false)
    };
  }

  return { createStudioEditorHistoryAccessors };
});
