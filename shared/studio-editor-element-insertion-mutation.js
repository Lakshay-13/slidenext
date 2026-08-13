(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementInsertionMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioElementInsertionMutationWithTransaction(type, options = {}) {
    const insertionApi = options.insertionApi && typeof options.insertionApi === 'object'
      ? options.insertionApi
      : null;
    const applyStudioElementInsertion = insertionApi
      && typeof insertionApi.applyStudioElementInsertion === 'function'
      ? insertionApi.applyStudioElementInsertion
      : null;
    if (!applyStudioElementInsertion) {
      return { element: null, transaction: null };
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStudioMarkupTransactionCapture = transactionApi
      && typeof transactionApi.createStudioMarkupTransactionCapture === 'function'
      ? transactionApi.createStudioMarkupTransactionCapture
      : null;
    const createStudioElementPresenceTransaction = transactionApi
      && typeof transactionApi.createStudioElementPresenceTransaction === 'function'
      ? transactionApi.createStudioElementPresenceTransaction
      : null;
    const mutation = applyStudioElementInsertion(type, {
      documentRef: options.documentRef,
      slide: options.slide,
      offset: options.offset,
      layoutMode: options.layoutMode,
      prepareElement: typeof options.prepareElement === 'function'
        ? options.prepareElement
        : null,
      createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
      createElementPresenceTransaction: createStudioElementPresenceTransaction,
      transactionElementId: options.transactionElementId || '',
      getElementId: options.getElementId
    });
    return {
      element: mutation && mutation.element ? mutation.element : null,
      transaction: mutation && mutation.transaction ? mutation.transaction : null
    };
  }

  return {
    applyStudioElementInsertionMutationWithTransaction
  };
});
