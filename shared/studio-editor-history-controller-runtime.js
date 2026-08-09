(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryControllerRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorHistoryControllerRuntime(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveApi = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const controllerApi = resolveApi(
      'controllerApi',
      'SlideNextStudioEditorHistoryController'
    );
    const historyController = controllerApi
      && typeof controllerApi.createStudioEditorHistoryController === 'function'
      ? controllerApi.createStudioEditorHistoryController({
          documentRef: options.documentRef,
          historyApi: resolveApi('historyApi', 'SlideNextStudioHistory'),
          historyStateApi: resolveApi(
            'historyStateApi',
            'SlideNextStudioEditorHistoryState'
          ),
          canonicalStateApi: resolveApi(
            'canonicalStateApi',
            'SlideNextStudioEditorCanonicalState'
          ),
          restoreApi: resolveApi('restoreApi', 'SlideNextStudioEditorHistoryRestore'),
          transactionApi: resolveApi(
            'transactionApi',
            'SlideNextStudioEditorTransaction'
          ),
          elementStateApi: resolveApi(
            'elementStateApi',
            'SlideNextStudioElementState'
          ),
          getPendingTransaction: options.getPendingTransaction,
          setPendingTransaction: options.setPendingTransaction,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          setPendingCanonicalDeck: options.setPendingCanonicalDeck,
          setLiveCanonicalDeck: options.setLiveCanonicalDeck,
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
        })
      : null;

    return {
      historyController
    };
  }

  return {
    createStudioEditorHistoryControllerRuntime
  };
});
