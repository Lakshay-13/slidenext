(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideReorderTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorSlideReorderMutationWithTransaction(
    container,
    slideNode,
    beforeNode = null,
    options = {}
  ) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioSlideReorderMutationWithTransaction === 'function'
      ? mutationApi.applyStudioSlideReorderMutationWithTransaction
      : null;
    if (!applyMutation) {
      return {
        didApply: false,
        transaction: null
      };
    }

    return applyMutation(container, slideNode, beforeNode, {
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
      skipMarkupTransactionCapture: options.skipMarkupTransactionCapture === true,
      getElementId: options.getElementId
    });
  }

  return {
    applyStudioEditorSlideReorderMutationWithTransaction
  };
});
