(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideDeletionTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorSlideDeletionMutationWithTransaction(container, slideNode, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioSlideDeletionMutationWithTransaction === 'function'
      ? mutationApi.applyStudioSlideDeletionMutationWithTransaction
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
      skipMarkupTransactionCapture: options.skipMarkupTransactionCapture === true,
      getElementId: options.getElementId
    });
  }

  function createStudioEditorSlideDeletionApplicator(options = {}) {
    const applyDeletionTransaction = typeof options.applyDeletionTransaction === 'function'
      ? options.applyDeletionTransaction
      : applyStudioEditorSlideDeletionMutationWithTransaction;
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
    const legacyApplyDeletion = typeof options.legacyApplyDeletion === 'function'
      ? options.legacyApplyDeletion
      : () => ({ didApply: false, transaction: null });
    const canApplyDeletionTransaction = typeof options.applyDeletionTransaction === 'function'
      || (mutationApi
        && typeof mutationApi.applyStudioSlideDeletionMutationWithTransaction === 'function');

    return (container, slideNode, mutationOptions = {}) => {
      if (canApplyDeletionTransaction) {
        return applyDeletionTransaction(container, slideNode, {
          mutationApi,
          slideCommandsApi,
          deckViewApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyDeletion(container, slideNode, mutationOptions);
    };
  }

  return {
    applyStudioEditorSlideDeletionMutationWithTransaction,
    createStudioEditorSlideDeletionApplicator
  };
});
