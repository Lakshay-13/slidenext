(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideReorderMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioSlideReorderMutationWithTransaction(container, slideNode, beforeNode = null, options = {}) {
    const slideCommandsApi = options.slideCommandsApi && typeof options.slideCommandsApi === 'object'
      ? options.slideCommandsApi
      : null;
    const applyStudioSlideReorderWithTransaction = slideCommandsApi
      && typeof slideCommandsApi.applyStudioSlideReorderWithTransaction === 'function'
      ? slideCommandsApi.applyStudioSlideReorderWithTransaction
      : null;
    if (!applyStudioSlideReorderWithTransaction) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const deckViewApi = options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
    const applyStudioSlideReorderMutation = deckViewApi
      && typeof deckViewApi.applyStudioSlideReorderMutation === 'function'
      ? deckViewApi.applyStudioSlideReorderMutation
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStudioMarkupTransactionCapture = transactionApi
      && typeof transactionApi.createStudioMarkupTransactionCapture === 'function'
      ? transactionApi.createStudioMarkupTransactionCapture
      : null;

    return applyStudioSlideReorderWithTransaction(container, slideNode, beforeNode, {
      applyStudioSlideReorderMutation,
      createStudioMarkupTransactionCapture,
      containerElementId: options.containerElementId,
      getElementId: options.getElementId
    });
  }

  return {
    applyStudioSlideReorderMutationWithTransaction
  };
});
