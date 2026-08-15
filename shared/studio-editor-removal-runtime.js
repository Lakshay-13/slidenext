(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorRemovalRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorRemovalController)
      || null;
    const removalController = controllerApi
      && typeof controllerApi.createStudioEditorRemovalController === 'function'
      ? controllerApi.createStudioEditorRemovalController({
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalRemovalApi: options.canonicalRemovalApi
            || (root && root.SlideNextStudioEditorCanonicalRemoval)
            || null,
          removalTransactionApi: options.removalTransactionApi
            || (root && root.SlideNextStudioEditorRemovalTransaction)
            || null,
          removalMutationApi: options.removalMutationApi
            || (root && root.SlideNextStudioEditorRemovalMutation)
            || null,
          removalApi: options.removalApi
            || (root && root.SlideNextStudioEditorRemoval)
            || null,
          transactionApi: options.transactionApi
            || (root && root.SlideNextStudioEditorTransaction)
            || null,
          buildRemovalSelectionActionState: options.buildRemovalSelectionActionState,
          finalizeRemovalActionResult: options.finalizeRemovalActionResult,
          getIframeDoc: options.getIframeDoc,
          assignElementId: options.assignElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyRemovalMutation: options.applyRemovalMutation,
          deselectElement: options.deselectElement,
          finalizeDeckMutation: options.finalizeDeckMutation,
          rollbackMutation: options.rollbackMutation,
          restoreSelection: options.restoreSelection
        })
      : null;

    return {
      removalController
    };
  }

  return {
    createStudioEditorRemovalRuntime
  };
});
