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

    function read(methodName, fallback, ...args) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](...args)
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
      getPendingEditorCanonicalDeck: (sourceDocument) => read(
        'getPendingEditorCanonicalDeck',
        null,
        sourceDocument
      ),
      setPendingEditorCanonicalDeck: (nextCanonicalDeck) => write(
        'setPendingEditorCanonicalDeck',
        nextCanonicalDeck,
        false
      ),
      getUndoDebounceTimer: () => read('getUndoDebounceTimer', null),
      setUndoDebounceTimer: (nextTimer) => write('setUndoDebounceTimer', nextTimer, false)
    };
  }

  function createStudioEditorHistoryGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorHistoryAccessors(options);

    return {
      getStudioUndoStack: () => accessors.getUndoStack(),
      getStudioRedoStack: () => accessors.getRedoStack(),
      setStudioUndoStack: (nextStack) => accessors.setUndoStack(nextStack),
      setStudioRedoStack: (nextStack) => accessors.setRedoStack(nextStack),
      clearStudioHistoryStacks: () => accessors.clearHistoryStacks(),
      getStudioPendingEditorTransaction: () => accessors.getPendingEditorTransaction(),
      setStudioPendingEditorTransaction: (nextTransaction) => accessors
        .setPendingEditorTransaction(nextTransaction),
      clearStudioPendingEditorTransaction: () => accessors.clearPendingEditorTransaction(),
      getStudioPendingEditorCanonicalDeck: (sourceDocument) => accessors
        .getPendingEditorCanonicalDeck(sourceDocument),
      setStudioPendingEditorCanonicalDeck: (nextCanonicalDeck) => accessors
        .setPendingEditorCanonicalDeck(nextCanonicalDeck),
      getStudioUndoDebounceTimer: () => accessors.getUndoDebounceTimer(),
      setStudioUndoDebounceTimer: (nextTimer) => accessors.setUndoDebounceTimer(nextTimer)
    };
  }

  return {
    createStudioEditorHistoryAccessors,
    createStudioEditorHistoryGlobalApi
  };
});
