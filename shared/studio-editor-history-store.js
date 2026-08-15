(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options, key, globalName, factoryName) {
    if (options[key] && typeof options[key] === 'object') {
      return options[key];
    }

    const controllerApi = root && root[globalName];
    if (!controllerApi || typeof controllerApi[factoryName] !== 'function') {
      return null;
    }

    return controllerApi[factoryName]({});
  }

  function createStudioEditorHistoryStateController(options = {}) {
    const stackController = resolveController(
      options,
      'stackController',
      'SlideNextStudioEditorHistoryStackController',
      'createStudioEditorHistoryStackController'
    );
    const pendingController = resolveController(
      options,
      'pendingController',
      'SlideNextStudioEditorHistoryPendingController',
      'createStudioEditorHistoryPendingController'
    );
    const timerController = resolveController(
      options,
      'timerController',
      'SlideNextStudioEditorHistoryTimerController',
      'createStudioEditorHistoryTimerController'
    );

    function getUndoStack() {
      return stackController && typeof stackController.getUndoStack === 'function'
        ? stackController.getUndoStack()
        : [];
    }

    function getRedoStack() {
      return stackController && typeof stackController.getRedoStack === 'function'
        ? stackController.getRedoStack()
        : [];
    }

    function setUndoStack(nextStack) {
      return stackController && typeof stackController.setUndoStack === 'function'
        ? stackController.setUndoStack(nextStack)
        : false;
    }

    function setRedoStack(nextStack) {
      return stackController && typeof stackController.setRedoStack === 'function'
        ? stackController.setRedoStack(nextStack)
        : false;
    }

    function clearHistoryStacks() {
      return stackController && typeof stackController.clear === 'function'
        ? stackController.clear()
        : false;
    }

    function getPendingEditorTransaction() {
      if (!pendingController || typeof pendingController.getPendingTransaction !== 'function') {
        return null;
      }
      try {
        return pendingController.getPendingTransaction();
      } catch (error) {
        return null;
      }
    }

    function setPendingEditorTransaction(nextTransaction) {
      return pendingController && typeof pendingController.setPendingTransaction === 'function'
        ? pendingController.setPendingTransaction(nextTransaction)
        : false;
    }

    function clearPendingEditorTransaction() {
      return pendingController && typeof pendingController.clear === 'function'
        ? pendingController.clear()
        : false;
    }

    function getPendingEditorCanonicalDeck(sourceDocument) {
      if (!pendingController || typeof pendingController.getPendingCanonicalDeck !== 'function') {
        return null;
      }
      try {
        return pendingController.getPendingCanonicalDeck(sourceDocument);
      } catch (error) {
        return null;
      }
    }

    function setPendingEditorCanonicalDeck(nextCanonicalDeck) {
      return pendingController && typeof pendingController.setPendingCanonicalDeck === 'function'
        ? pendingController.setPendingCanonicalDeck(nextCanonicalDeck)
        : false;
    }

    function getUndoDebounceTimer() {
      return timerController && typeof timerController.getTimer === 'function'
        ? timerController.getTimer()
        : null;
    }

    function setUndoDebounceTimer(nextTimer) {
      return timerController && typeof timerController.setTimer === 'function'
        ? timerController.setTimer(nextTimer)
        : false;
    }

    return {
      getUndoStack,
      getRedoStack,
      setUndoStack,
      setRedoStack,
      clearHistoryStacks,
      getPendingEditorTransaction,
      setPendingEditorTransaction,
      clearPendingEditorTransaction,
      getPendingEditorCanonicalDeck,
      setPendingEditorCanonicalDeck,
      getUndoDebounceTimer,
      setUndoDebounceTimer
    };
  }

  return {
    createStudioEditorHistoryStateController
  };
});
