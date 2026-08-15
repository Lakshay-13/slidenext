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

  function createStudioEditorSlideInsertionApplicator(options = {}) {
    const applyInsertionTransaction = typeof options.applyInsertionTransaction === 'function'
      ? options.applyInsertionTransaction
      : applyStudioEditorSlideInsertionMutationWithTransaction;
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
    const legacyApplyInsertion = typeof options.legacyApplyInsertion === 'function'
      ? options.legacyApplyInsertion
      : () => ({ didApply: false, transaction: null });
    const canApplyInsertionTransaction = mutationApi
      && (typeof options.applyInsertionTransaction === 'function'
        || typeof mutationApi.applyStudioSlideInsertionMutationWithTransaction === 'function');

    return (container, slideNode, mutationOptions = {}) => {
      if (canApplyInsertionTransaction) {
        return applyInsertionTransaction(container, slideNode, {
          mutationApi,
          slideCommandsApi,
          deckViewApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyInsertion(container, slideNode, mutationOptions);
    };
  }

  return {
    applyStudioEditorSlideInsertionMutationWithTransaction,
    createStudioEditorSlideInsertionApplicator
  };
});
