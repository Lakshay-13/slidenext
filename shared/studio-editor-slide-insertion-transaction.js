(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideInsertionTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorSlideInsertionMutationWithTransaction(container, slideNode, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioSlideInsertionMutationWithTransaction === 'function'
      ? mutationApi.applyStudioSlideInsertionMutationWithTransaction
      : null;
    if (!applyMutation) {
      return {
        didApply: false,
        transaction: null
      };
    }

    return applyMutation(container, slideNode, {
      slideCommandsApi: options.slideCommandsApi && typeof options.slideCommandsApi === 'object'
        ? options.slideCommandsApi
        : null,
      deckViewApi: options.deckViewApi && typeof options.deckViewApi === 'object'
        ? options.deckViewApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      containerElementId: options.containerElementId,
      beforeNode: options.beforeNode,
      skipMarkupTransactionCapture: options.skipMarkupTransactionCapture === true,
      getElementId: options.getElementId
    });
  }

  return {
    applyStudioEditorSlideInsertionMutationWithTransaction
  };
});
