(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementInsertionTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorElementInsertionMutationWithTransaction(type, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioElementInsertionMutationWithTransaction === 'function'
      ? mutationApi.applyStudioElementInsertionMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { element: null, transaction: null };
    }

    return applyMutation(type, {
      insertionApi: options.insertionApi && typeof options.insertionApi === 'object'
        ? options.insertionApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      documentRef: options.documentRef,
      slide: options.slide,
      offset: options.offset,
      layoutMode: options.layoutMode,
      prepareElement: typeof options.prepareElement === 'function'
        ? options.prepareElement
        : null,
      transactionElementId: options.transactionElementId || '',
      getElementId: options.getElementId
    });
  }

  return {
    applyStudioEditorElementInsertionMutationWithTransaction
  };
});
