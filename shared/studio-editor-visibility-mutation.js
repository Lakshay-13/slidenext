(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVisibilityMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioVisibilityMutationWithTransaction(selection, shouldHide, options = {}) {
    const visibilityApi = options.visibilityApi && typeof options.visibilityApi === 'object'
      ? options.visibilityApi
      : null;
    const applyStudioVisibilityWithTransaction = visibilityApi
      && typeof visibilityApi.applyStudioVisibilityWithTransaction === 'function'
      ? visibilityApi.applyStudioVisibilityWithTransaction
      : null;
    if (!applyStudioVisibilityWithTransaction) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const applyStudioVisibilityMutation = visibilityApi
      && typeof visibilityApi.applyStudioVisibilityMutation === 'function'
      ? visibilityApi.applyStudioVisibilityMutation
      : null;
    const createStudioVisibilityTransaction = transactionApi
      && typeof transactionApi.createStudioVisibilityTransaction === 'function'
      ? transactionApi.createStudioVisibilityTransaction
      : null;
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const setHidden = typeof options.setHidden === 'function'
      ? options.setHidden
      : () => {};
    const getVisibilityState = typeof options.getVisibilityState === 'function'
      ? options.getVisibilityState
      : () => null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    return applyStudioVisibilityWithTransaction(selection, shouldHide, {
      applyStudioVisibilityMutation,
      createStudioVisibilityTransaction,
      isHidden,
      setHidden,
      getVisibilityState,
      getElementId
    });
  }

  return {
    applyStudioVisibilityMutationWithTransaction
  };
});
