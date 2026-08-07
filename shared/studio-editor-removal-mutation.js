(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioRemovalMutationWithTransaction(selection, options = {}) {
    const removalApi = options.removalApi && typeof options.removalApi === 'object'
      ? options.removalApi
      : null;
    const removeStudioElements = removalApi
      && typeof removalApi.removeStudioElements === 'function'
      ? removalApi.removeStudioElements
      : null;
    if (!removeStudioElements) {
      return {
        didRemove: false,
        removedCount: 0,
        transaction: null
      };
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStudioMarkupTransactionCapture = transactionApi
      && typeof transactionApi.createStudioMarkupTransactionCapture === 'function'
      ? transactionApi.createStudioMarkupTransactionCapture
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const removeElement = typeof options.removeElement === 'function'
      ? options.removeElement
      : (element) => {
          if (element && typeof element.remove === 'function') {
            element.remove();
          }
        };

    const mutation = removeStudioElements(selection, {
      createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
      getElementId,
      removeElement
    });
    return mutation && typeof mutation === 'object'
      ? mutation
      : { didRemove: false, removedCount: 0, transaction: null };
  }

  return {
    applyStudioRemovalMutationWithTransaction
  };
});
