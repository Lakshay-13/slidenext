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

  function createStudioEditorUngroupApplicator(options = {}) {
    const applyUngroupTransaction = typeof options.applyUngroupTransaction === 'function'
      ? options.applyUngroupTransaction
      : applyStudioEditorUngroupMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const groupApi = options.groupApi && typeof options.groupApi === 'object'
      ? options.groupApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const legacyApplyUngroup = typeof options.legacyApplyUngroup === 'function'
      ? options.legacyApplyUngroup
      : () => ({ didApply: false, restoredElements: [], restoredGroups: [], transaction: null });
    const canApplyUngroupTransaction = mutationApi
      && (typeof options.applyUngroupTransaction === 'function'
        || typeof mutationApi.applyStudioUngroupMutationWithTransaction === 'function');

    return (mutationOptions = {}) => {
      if (canApplyUngroupTransaction) {
        return applyUngroupTransaction({
          mutationApi,
          groupApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyUngroup(mutationOptions);
    };
  }

  return {
    applyStudioEditorUngroupMutationWithTransaction,
    createStudioEditorUngroupApplicator
  };
});
