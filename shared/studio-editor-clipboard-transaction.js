(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorClipboardInsertionWithTransaction(insertionPlans, slide, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioClipboardInsertionWithTransaction === 'function'
      ? mutationApi.applyStudioClipboardInsertionWithTransaction
      : null;
    if (!applyMutation) {
      return { inserted: [], transaction: null };
    }

    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => {
          if (typeof options.assignEditorElementId === 'function') {
            const assignedId = options.assignEditorElementId(element);
            if (assignedId) return assignedId;
          }
          return element && element.dataset && element.dataset.editorId;
        };
    return applyMutation(insertionPlans, slide, {
      clipboardApi: options.clipboardApi && typeof options.clipboardApi === 'object'
        ? options.clipboardApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getParentId: options.getParentId,
      getElementId
    });
  }

  return {
    applyStudioEditorClipboardInsertionWithTransaction
  };
});
