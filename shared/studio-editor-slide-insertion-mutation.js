(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideInsertionMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioSlideInsertionMutationWithTransaction(container, slideNode, options = {}) {
    const slideCommandsApi = options.slideCommandsApi && typeof options.slideCommandsApi === 'object'
      ? options.slideCommandsApi
      : null;
    const applyStudioSlideInsertionWithTransaction = slideCommandsApi
      && typeof slideCommandsApi.applyStudioSlideInsertionWithTransaction === 'function'
      ? slideCommandsApi.applyStudioSlideInsertionWithTransaction
      : null;
    if (!applyStudioSlideInsertionWithTransaction) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const deckViewApi = options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
    const applyStudioSlideInsertionMutation = deckViewApi
      && typeof deckViewApi.applyStudioSlideInsertionMutation === 'function'
      ? deckViewApi.applyStudioSlideInsertionMutation
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStudioMarkupTransactionCapture = transactionApi
      && typeof transactionApi.createStudioMarkupTransactionCapture === 'function'
      ? transactionApi.createStudioMarkupTransactionCapture
      : null;

    return applyStudioSlideInsertionWithTransaction(container, slideNode, {
      applyStudioSlideInsertionMutation,
      createStudioMarkupTransactionCapture,
      containerElementId: options.containerElementId,
      beforeNode: options.beforeNode,
      skipMarkupTransactionCapture: options.skipMarkupTransactionCapture === true,
      getElementId: options.getElementId
    });
  }

  return {
    applyStudioSlideInsertionMutationWithTransaction
  };
});
