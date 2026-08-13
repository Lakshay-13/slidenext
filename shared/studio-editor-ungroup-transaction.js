(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorUngroupTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorUngroupMutationWithTransaction(options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioUngroupMutationWithTransaction === 'function'
      ? mutationApi.applyStudioUngroupMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { didApply: false, restoredElements: [], restoredGroups: [], transaction: null };
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
    return applyMutation({
      ...options,
      groupApi: options.groupApi && typeof options.groupApi === 'object'
        ? options.groupApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getElementId
    });
  }

  return {
    applyStudioEditorUngroupMutationWithTransaction
  };
});
