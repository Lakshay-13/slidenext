(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioLockMutationWithTransaction(selection, shouldLock, options = {}) {
    const lockApi = options.lockApi && typeof options.lockApi === 'object'
      ? options.lockApi
      : null;
    const applyStudioLockWithTransaction = lockApi
      && typeof lockApi.applyStudioLockWithTransaction === 'function'
      ? lockApi.applyStudioLockWithTransaction
      : null;
    if (!applyStudioLockWithTransaction) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const applyStudioLockMutation = lockApi
      && typeof lockApi.applyStudioLockMutation === 'function'
      ? lockApi.applyStudioLockMutation
      : null;
    const createStudioDatasetTransaction = transactionApi
      && typeof transactionApi.createStudioDatasetTransaction === 'function'
      ? transactionApi.createStudioDatasetTransaction
      : null;
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const setLocked = typeof options.setLocked === 'function'
      ? options.setLocked
      : () => {};
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    return applyStudioLockWithTransaction(selection, shouldLock, {
      applyStudioLockMutation,
      createStudioDatasetTransaction,
      isLocked,
      setLocked,
      getElementId
    });
  }

  return {
    applyStudioLockMutationWithTransaction
  };
});
