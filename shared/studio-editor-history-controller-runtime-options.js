(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryControllerRuntimeOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, name, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      return options[name];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorHistoryControllerRuntimeOptions(options = {}) {
    return {
      controllerApi: resolveDependency(
        options,
        'controllerApi',
        'SlideNextStudioEditorHistoryController'
      ),
      documentRef: options.documentRef,
      historyApi: resolveDependency(options, 'historyApi', 'SlideNextStudioHistory'),
      historyStateApi: resolveDependency(
        options,
        'historyStateApi',
        'SlideNextStudioEditorHistoryState'
      ),
      canonicalStateApi: resolveDependency(
        options,
        'canonicalStateApi',
        'SlideNextStudioEditorCanonicalState'
      ),
      restoreApi: resolveDependency(
        options,
        'restoreApi',
        'SlideNextStudioEditorHistoryRestore'
      ),
      transactionApi: resolveDependency(
        options,
        'transactionApi',
        'SlideNextStudioEditorTransaction'
      ),
      elementStateApi: resolveDependency(
        options,
        'elementStateApi',
        'SlideNextStudioElementState'
      ),
      getPendingTransaction: options.getPendingTransaction,
      setPendingTransaction: options.setPendingTransaction,
      getPendingCanonicalDeck: options.getPendingCanonicalDeck,
      setPendingCanonicalDeck: options.setPendingCanonicalDeck,
      setLiveCanonicalDeck: options.setLiveCanonicalDeck,
      getLiveCanonicalDeck: options.getLiveCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      getTimer: options.getTimer,
      setTimer: options.setTimer,
      getDocument: options.getDocument,
      buildCanonicalDeck: options.buildCanonicalDeck,
      buildMutationCanonicalDeck: options.buildMutationCanonicalDeck,
      getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
      getHistoryOptions: options.getHistoryOptions,
      buildPersistableDeckHtml: options.buildPersistableDeckHtml,
      resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId,
      getActiveSlideId: options.getActiveSlideId,
      getSelectedElementIds: options.getSelectedElementIds,
      getHistoryStateOptions: options.getHistoryStateOptions,
      getUndoStack: options.getUndoStack,
      getRedoStack: options.getRedoStack,
      setUndoStack: options.setUndoStack,
      setRedoStack: options.setRedoStack,
      updateHistoryButtons: options.updateHistoryButtons,
      triggerAutoSave: options.triggerAutoSave,
      restoreHandlerOptions: options.restoreHandlerOptions
    };
  }

  return {
    createStudioEditorHistoryControllerRuntimeOptions
  };
});
