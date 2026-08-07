(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideDeletionMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioSlideDeletionMutationWithTransaction(container, slideNode, options = {}) {
    const slideCommandsApi = options.slideCommandsApi && typeof options.slideCommandsApi === 'object'
      ? options.slideCommandsApi
      : null;
    const applyStudioSlideDeletionWithTransaction = slideCommandsApi
      && typeof slideCommandsApi.applyStudioSlideDeletionWithTransaction === 'function'
      ? slideCommandsApi.applyStudioSlideDeletionWithTransaction
      : null;
    if (!applyStudioSlideDeletionWithTransaction) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const deckViewApi = options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
    const applyStudioSlideDeletionMutation = deckViewApi
      && typeof deckViewApi.applyStudioSlideDeletionMutation === 'function'
      ? deckViewApi.applyStudioSlideDeletionMutation
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStudioMarkupTransactionCapture = transactionApi
      && typeof transactionApi.createStudioMarkupTransactionCapture === 'function'
      ? transactionApi.createStudioMarkupTransactionCapture
      : null;

    return applyStudioSlideDeletionWithTransaction(container, slideNode, {
      applyStudioSlideDeletionMutation,
      createStudioMarkupTransactionCapture,
      containerElementId: options.containerElementId,
      getElementId: options.getElementId
    });
  }

  return {
    applyStudioSlideDeletionMutationWithTransaction
  };
});
