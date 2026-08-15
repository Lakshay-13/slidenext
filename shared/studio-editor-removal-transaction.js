(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorRemovalMutationWithTransaction(selection, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioRemovalMutationWithTransaction === 'function'
      ? mutationApi.applyStudioRemovalMutationWithTransaction
      : null;
    if (!applyMutation) {
      return {
        didRemove: false,
        removedCount: 0,
        transaction: null
      };
    }

    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => {
          if (typeof options.assignElementId === 'function') {
            const assignedId = options.assignElementId(element);
            if (assignedId) return assignedId;
          }
          return element && element.dataset && element.dataset.editorId;
        };
    const removeElement = typeof options.removeElement === 'function'
      ? options.removeElement
      : (element) => {
          if (element && typeof element.remove === 'function') {
            element.remove();
          }
        };
    return applyMutation(selection, {
      removalApi: options.removalApi && typeof options.removalApi === 'object'
        ? options.removalApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getElementId,
      removeElement
    });
  }

  function createStudioEditorRemovalApplicator(options = {}) {
    const applyRemovalTransaction = typeof options.applyRemovalTransaction === 'function'
      ? options.applyRemovalTransaction
      : applyStudioEditorRemovalMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const removalApi = options.removalApi && typeof options.removalApi === 'object'
      ? options.removalApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const legacyApplyRemoval = typeof options.legacyApplyRemoval === 'function'
      ? options.legacyApplyRemoval
      : () => ({ didRemove: false, removedCount: 0, transaction: null });
    const canApplyRemovalTransaction = mutationApi
      && (typeof options.applyRemovalTransaction === 'function'
        || typeof mutationApi.applyStudioRemovalMutationWithTransaction === 'function');

    return (selection, removalOptions = {}) => {
      if (canApplyRemovalTransaction) {
        return applyRemovalTransaction(selection, {
          mutationApi,
          removalApi,
          transactionApi,
          ...removalOptions
        });
      }
      return legacyApplyRemoval(selection, removalOptions);
    };
  }

  return {
    applyStudioEditorRemovalMutationWithTransaction,
    createStudioEditorRemovalApplicator
  };
});
