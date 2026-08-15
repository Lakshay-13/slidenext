(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorGroupMutationWithTransaction(options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioGroupMutationWithTransaction === 'function'
      ? mutationApi.applyStudioGroupMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { didApply: false, group: null, transaction: null };
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
      getElementId,
      assignElementId: typeof options.assignElementId === 'function'
        ? options.assignElementId
        : null,
      prepareGroup: typeof options.prepareGroup === 'function'
        ? options.prepareGroup
        : null
    });
  }

  function createStudioEditorGroupApplicator(options = {}) {
    const applyGroupTransaction = typeof options.applyGroupTransaction === 'function'
      ? options.applyGroupTransaction
      : applyStudioEditorGroupMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const groupApi = options.groupApi && typeof options.groupApi === 'object'
      ? options.groupApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : null;
    const prepareGroup = typeof options.prepareGroup === 'function'
      ? options.prepareGroup
      : null;
    const legacyApplyGroup = typeof options.legacyApplyGroup === 'function'
      ? options.legacyApplyGroup
      : () => ({ didApply: false, group: null, transaction: null });
    const canApplyGroupTransaction = mutationApi
      && (typeof options.applyGroupTransaction === 'function'
        || typeof mutationApi.applyStudioGroupMutationWithTransaction === 'function');

    return (mutationOptions = {}) => {
      if (canApplyGroupTransaction) {
        return applyGroupTransaction({
          mutationApi,
          groupApi,
          transactionApi,
          assignElementId,
          prepareGroup,
          ...mutationOptions
        });
      }
      return legacyApplyGroup(mutationOptions);
    };
  }

  return {
    applyStudioEditorGroupMutationWithTransaction,
    createStudioEditorGroupApplicator
  };
});
