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

  function createStudioEditorSlideReorderApplicator(options = {}) {
    const applyReorderTransaction = typeof options.applyReorderTransaction === 'function'
      ? options.applyReorderTransaction
      : applyStudioEditorSlideReorderMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const slideCommandsApi = options.slideCommandsApi && typeof options.slideCommandsApi === 'object'
      ? options.slideCommandsApi
      : null;
    const deckViewApi = options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const legacyApplyReorder = typeof options.legacyApplyReorder === 'function'
      ? options.legacyApplyReorder
      : () => ({ didApply: false, transaction: null });
    const canApplyReorderTransaction = typeof options.applyReorderTransaction === 'function'
      || (mutationApi
        && typeof mutationApi.applyStudioSlideReorderMutationWithTransaction === 'function');

    return (container, slideNode, beforeNode = null, mutationOptions = {}) => {
      if (canApplyReorderTransaction) {
        return applyReorderTransaction(container, slideNode, beforeNode, {
          mutationApi,
          slideCommandsApi,
          deckViewApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyReorder(container, slideNode, beforeNode, mutationOptions);
    };
  }

  return {
    applyStudioEditorSlideReorderMutationWithTransaction,
    createStudioEditorSlideReorderApplicator
  };
});
