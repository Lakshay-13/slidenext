(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorHistoryBridge(options = {}) {
    const runtimeApi = options.runtimeApi
      || (root && root.SlideNextStudioEditorHistoryRuntime)
      || null;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorHistoryRuntime === 'function'
      ? runtimeApi.createStudioEditorHistoryRuntime({
          historyStore: options.historyStore
            || (root && root.SlideNextStudioEditorHistoryStore)
            || null
        })
      : null;
    const historyStateController = runtime
      ? runtime.historyStateController
      : null;

    function read(methodName, fallback) {
      return historyStateController
        && typeof historyStateController[methodName] === 'function'
        ? historyStateController[methodName]()
        : fallback;
    }

    function write(methodName, value, fallback) {
      return historyStateController
        && typeof historyStateController[methodName] === 'function'
        ? historyStateController[methodName](value)
        : fallback;
    }

    return {
      runtime,
      historyStateController,
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

  return {
    createStudioEditorHistoryBridge
  };
});
