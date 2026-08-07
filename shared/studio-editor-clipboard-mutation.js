(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioClipboardInsertionWithTransaction(insertionPlans, slide, options = {}) {
    const clipboardApi = options.clipboardApi && typeof options.clipboardApi === 'object'
      ? options.clipboardApi
      : null;
    const applyStudioClipboardInsertion = clipboardApi
      && typeof clipboardApi.applyStudioClipboardInsertion === 'function'
      ? clipboardApi.applyStudioClipboardInsertion
      : null;
    if (!applyStudioClipboardInsertion) {
      return {
        inserted: [],
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

    const mutation = applyStudioClipboardInsertion(insertionPlans, {
      slide,
      createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
      getElementId
    });
    return mutation && typeof mutation === 'object'
      ? mutation
      : { inserted: [], transaction: null };
  }

  return {
    applyStudioClipboardInsertionWithTransaction
  };
});
