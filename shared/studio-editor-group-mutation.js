(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioGroupMutationWithTransaction(options = {}) {
    const groupApi = options.groupApi && typeof options.groupApi === 'object'
      ? options.groupApi
      : null;
    const applyStudioGroupMutation = groupApi
      && typeof groupApi.applyStudioGroupMutation === 'function'
      ? groupApi.applyStudioGroupMutation
      : null;
    if (!applyStudioGroupMutation) {
      return { didApply: false, group: null, transaction: null };
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
    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : null;
    const prepareGroup = typeof options.prepareGroup === 'function'
      ? options.prepareGroup
      : null;

    const mutation = applyStudioGroupMutation({
      ...options,
      createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
      getElementId,
      assignElementId,
      prepareGroup
    });
    return mutation && typeof mutation === 'object'
      ? mutation
      : { didApply: false, group: null, transaction: null };
  }

  return {
    applyStudioGroupMutationWithTransaction
  };
});
